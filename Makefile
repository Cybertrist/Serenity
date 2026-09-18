# Serenity shortcuts. Run `make help` for the list.

COMPOSE   := docker compose
DEV_IMAGE := serenity-api-dev
# Runs the api dev image on the local sources, as the current user.
DEV_RUN   := docker run --rm --user $(shell id -u):$(shell id -g) \
             -v "$(CURDIR)/api:/app" -v "$(CURDIR)/shared:/shared" -w /app $(DEV_IMAGE)

# Container UIDs (see docker-compose.yml and api/Dockerfile).
UID_API := 10001

.PHONY: help init up down restart logs ps auth-init test lint vectors web-test crypto-interop dev-image

help: ## Show this help
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

init: ## Create data/ folders with the right owners (asks for sudo once)
	@test -f .env || { echo "Missing .env: cp .env.example .env"; exit 1; }
	mkdir -p data/api
	sudo chown $(UID_API):$(UID_API) data/api
	sudo chmod 700 data/api

up: ## Build and start the stack
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

auth-init: ## Create the login password and TOTP (interactive)
	$(COMPOSE) exec api python -m serenity.auth init $(if $(force),--force)

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

lint: dev-image ## Run linters and type checks
	$(DEV_RUN) ruff check .
	$(DEV_RUN) ruff format --check .
	$(DEV_RUN) mypy serenity
	@# .env.example has no secret key: provide a dummy one only for validation.
	SERENITY_SECRET_KEY=lint-only $(COMPOSE) --env-file .env.example config --quiet
