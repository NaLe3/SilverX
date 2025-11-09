.PHONY: up down restart build ps logs rails-shell rails-console migrate rollback db-prepare db-reset seed test clean

COMPOSE ?= docker compose
SERVICE ?= rails
STEP ?= 1

# Base lifecycle --------------------------------------------------------------
up:
	$(COMPOSE) up -d --remove-orphans

down:
	$(COMPOSE) down --remove-orphans

restart:
	$(COMPOSE) restart $(SERVICE)

build:
	$(COMPOSE) build

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f $(SERVICE)

clean:
	$(COMPOSE) down --volumes --remove-orphans

# Rails utilities -------------------------------------------------------------
rails-shell:
	$(COMPOSE) run --rm rails bash

rails-console:
	$(COMPOSE) run --rm rails bin/rails console

migrate:
	$(COMPOSE) run --rm rails bin/rails db:migrate

rollback:
	$(COMPOSE) run --rm rails bin/rails db:rollback STEP=$(STEP)

db-prepare:
	$(COMPOSE) run --rm rails bin/rails db:prepare

db-reset:
	$(COMPOSE) run --rm rails bin/rails db:reset

seed:
	$(COMPOSE) run --rm rails bin/rails db:seed

test:
	$(COMPOSE) run --rm rails bin/rails test
