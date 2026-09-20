# Serenity shortcuts. Run `make help` for the list.

COMPOSE   := docker compose
DEV_IMAGE := serenity-api-dev
# Runs the api dev image on the local sources, as the current user.
DEV_RUN   := docker run --rm --user $(shell id -u):$(shell id -g) \
             -v "$(CURDIR)/api:/app" -v "$(CURDIR)/shared:/shared" -w /app $(DEV_IMAGE)

# Container UIDs (see docker-compose.yml and api/Dockerfile).
UID_API := 10001

.PHONY: help init keys up down restart logs ps client reset-totp watch-now schedule-now rotate-now test lint vectors web-test crypto-interop e2e ui-smoke rotation-demo api-doc dev-image

help: ## Show this help
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

init: ## Create data/ folders with the right owners (asks for sudo once)
	@test -f .env || { echo "Missing .env: cp .env.example .env"; exit 1; }
	mkdir -p data/api
	sudo chown $(UID_API):$(UID_API) data/api
	sudo chmod 700 data/api

keys: ## Create the server and TOTP keys if missing (root:root 0400, never overwritten)
	sudo install -d -m 700 -o root -g root data/keys
	@for k in server totp; do \
	  if sudo test -f data/keys/$$k.key; then echo "data/keys/$$k.key: kept"; \
	  else sudo sh -c "umask 377; head -c 32 /dev/urandom > data/keys/$$k.key" && echo "data/keys/$$k.key: created"; fi; \
	done
	@sudo stat -c '%U:%G %a %s bytes %n' data/keys/server.key data/keys/totp.key

up: keys ## Build and start the stack (creates the keys on first start)
	@test -d data/api || { echo "Run 'make init' first"; exit 1; }
	$(COMPOSE) up -d --build

down: ## Stop the stack
	$(COMPOSE) down

restart: ## Restart the stack
	$(COMPOSE) restart

logs: ## Follow logs (make logs s=api for a single service)
	$(COMPOSE) logs -f --tail=100 $(s)

ps: ## Show services and health
	$(COMPOSE) ps

client: ## Test client inside the api container (make client c=signup|login|unlock|me|sessions|password|recover|lock|logout)
	$(COMPOSE) exec --user $(UID_API):$(UID_API) api python -m serenity.devclient $(c)

reset-totp: ## Replace the login TOTP of an account (make reset-totp u=<username>)
	$(COMPOSE) exec api python -m serenity.admin reset-totp $(u)

watch-now: ## Run the agent-zone breach watch now (instead of waiting for the 6-hour run)
	$(COMPOSE) exec agent python -m serenity.admin watch-now

schedule-now: ## Run the rotation due-date check now (instead of waiting for the hourly run)
	$(COMPOSE) exec agent python -m serenity.admin schedule-now

rotate-now: ## Execute the rotations that are waiting now (instead of waiting for the agent)
	$(COMPOSE) exec agent python -m serenity.admin rotate-now

dev-image:
	@docker build -q --target dev -t $(DEV_IMAGE) api >/dev/null

test: dev-image ## Run backend tests
	$(DEV_RUN) pytest

vectors: dev-image ## Regenerate shared crypto test vectors (only when docs/crypto.md changes)
	$(DEV_RUN) python /shared/test-vectors/generate.py /shared/test-vectors

# Frontend tooling runs in the official Node image, on the local sources.
NODE_RUN := docker run --rm --user $(shell id -u):$(shell id -g) -e HOME=/tmp \
            -v "$(CURDIR):/repo" -w /repo/web node:22-slim

web-test: ## Run frontend checks (npm ci, eslint, prettier, tsc, vitest)
	$(NODE_RUN) sh -c 'npm ci --no-audit --no-fund && npm run lint && npm run format:check && npm run build && npm test -- --run'

crypto-interop: dev-image ## Cross-check crypto: Python -> TypeScript -> Python
	$(DEV_RUN) python tests/crypto/interop.py produce /app/.interop-py.json
	$(NODE_RUN) sh -c 'INTEROP_VERIFY=/repo/api/.interop-py.json npx vitest --run src/crypto/interop.test.ts && INTEROP_PRODUCE=/repo/api/.interop-ts.json npx vitest --run src/crypto/interop.test.ts'
	$(DEV_RUN) python tests/crypto/interop.py verify /app/.interop-ts.json
	rm -f api/.interop-py.json api/.interop-ts.json

e2e: dev-image ## End-to-end: TypeScript account flows against the real Python API
	docker rm -f serenity-e2e >/dev/null 2>&1 || true
	docker run -d --rm --name serenity-e2e --user $(shell id -u):$(shell id -g) \
	  -v "$(CURDIR)/api:/app" -w /app $(DEV_IMAGE) python tests/e2e_server.py 8765 >/dev/null
	docker run --rm --network container:serenity-e2e --user $(shell id -u):$(shell id -g) -e HOME=/tmp \
	  -e SERENITY_E2E_URL=http://127.0.0.1:8765 -v "$(CURDIR):/repo" -w /repo/web node:22-slim \
	  sh -c 'for i in $$(seq 1 30); do node -e "fetch(process.env.SERENITY_E2E_URL+\"/api/health\").then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" && break; sleep 1; done; npx vitest --run --no-file-parallelism e2e.test'; \
	  status=$$?; docker rm -f serenity-e2e >/dev/null; exit $$status

rotation-demo: dev-image ## The agent rotating a password on the demo site (real browser)
	scripts/rotation-demo.sh

ui-smoke: dev-image ## Walk every screen in Chromium (production web image, strict CSP); screenshots in web/e2e/shots
	$(COMPOSE) build web
	scripts/ui-smoke.sh web/e2e/shots

api-doc: dev-image ## Regenerate docs/api.md from the OpenAPI schema
	docker run --rm --user $(shell id -u):$(shell id -g) -v "$(CURDIR)/api:/app" -v "$(CURDIR)/docs:/docs" \
	  -w /app $(DEV_IMAGE) python -m serenity.apidoc /docs/api.md

lint: dev-image ## Run linters and type checks
	$(DEV_RUN) ruff check .
	$(DEV_RUN) ruff format --check .
	$(DEV_RUN) mypy serenity
	@# .env.example has no secret key: provide a dummy one only for validation.
	SERENITY_SECRET_KEY=lint-only $(COMPOSE) --env-file .env.example config --quiet --no-path-resolution
