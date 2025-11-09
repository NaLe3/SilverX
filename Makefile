.PHONY: up dev down restart build ps logs rails-shell rails-console migrate rollback db-prepare db-reset seed test css open clean

COMPOSE ?= docker compose
SERVICE ?= rails
STEP ?= 1
APP_URL ?= http://localhost:3000

# Base lifecycle --------------------------------------------------------------
up:
	$(COMPOSE) up -d --remove-orphans

dev:
	$(COMPOSE) up rails bridge sidekiq

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

open:
	@echo "Opening $(APP_URL)"
	open "$(APP_URL)"

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

css:
	$(COMPOSE) run --rm rails yarn build:css
