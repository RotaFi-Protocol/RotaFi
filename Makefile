# RotaFi local development helpers.
#
# These wrap `docker compose` so contributors can bring the full stack up or
# down with a single command. See docker-compose.yml for the service details.

COMPOSE ?= docker compose
ENV_FILE ?= .env

.PHONY: help env up up-fg down stop logs ps build rebuild contracts config test clean

help:
	@echo "RotaFi local stack"
	@echo ""
	@echo "  make env        Copy docker/.env.example to .env (if missing)"
	@echo "  make up         Build and start the full stack in the background"
	@echo "  make up-fg      Build and start the full stack in the foreground"
	@echo "  make down       Stop and remove the stack"
	@echo "  make logs       Tail logs from all services"
	@echo "  make ps         Show container status and health"
	@echo "  make contracts  Build and deploy contracts to the local sandbox"
	@echo "  make config     Validate the compose file"
	@echo "  make test       Run backend and keeper unit tests"
	@echo "  make clean      Stop the stack and delete all volumes"

env:
	@test -f $(ENV_FILE) || cp docker/.env.example $(ENV_FILE)
	@echo "Using $(ENV_FILE)"

up: env
	$(COMPOSE) up --build --detach

up-fg: env
	$(COMPOSE) up --build

down:
	$(COMPOSE) down --remove-orphans

stop:
	$(COMPOSE) stop

logs:
	$(COMPOSE) logs --follow

ps:
	$(COMPOSE) ps

build:
	$(COMPOSE) build

rebuild:
	$(COMPOSE) build --no-cache

contracts: env
	$(COMPOSE) --profile contracts run --rm contracts

config:
	$(COMPOSE) config --quiet

test:
	cd backend && npm test
	cd keeper && npm test

clean:
	$(COMPOSE) down --volumes --remove-orphans
