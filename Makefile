# Serenity shortcuts. Run `make help` for the list.

COMPOSE   := docker compose
DEV_IMAGE := serenity-api-dev
# Runs the api dev image on the local sources, as the current user.
DEV_RUN   := docker run --rm --user $(shell id -u):$(shell id -g) \
             -v "$(CURDIR)/api:/app" -w /app $(DEV_IMAGE)

# Container UIDs (see docker-compose.yml and api/Dockerfile).
UID_API  := 10001
UID_NTFY := 10002

.PHONY: help init up down restart logs ps auth-init test lint dev-image

help: ## Show this help
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

init: ## Create data/ folders with the right owners (asks for sudo once)
	@test -f .env || { echo "Missing .env: cp .env.example .env"; exit 1; }
	mkdir -p data/api data/ntfy
	sudo chown $(UID_API):$(UID_API) data/api
	sudo chown $(UID_NTFY):$(UID_NTFY) data/ntfy
	sudo chmod 700 data/api data/ntfy

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

lint: dev-image ## Run linters and type checks
	$(DEV_RUN) ruff check .
	$(DEV_RUN) ruff format --check .
	$(DEV_RUN) mypy serenity
	@# .env.example has no secret key: provide a dummy one only for validation.
	SERENITY_SECRET_KEY=lint-only $(COMPOSE) --env-file .env.example config --quiet
