COMPOSE=docker compose -p "chalenges-app"


# BASE

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down -v

rebuild:
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d



# BUSINESS SERVICES

rebuild-users:
	$(COMPOSE) stop users-api users-db users-redis
	$(COMPOSE) rm -f users-api users-db users-redis
	$(COMPOSE) build users-api
	$(COMPOSE) up -d users-api users-db users-redis

rebuild-games:
	$(COMPOSE) stop games-api games-db games-redis
	$(COMPOSE) rm -f games-api games-db games-redis
	$(COMPOSE) build games-api
	$(COMPOSE) up -d games-api games-db games-redis

rebuild-challenges:
	$(COMPOSE) stop challenges-api challenges-db challenges-redis
	$(COMPOSE) rm -f challenges-api challenges-db challenges-redis
	$(COMPOSE) build challenges-api
	$(COMPOSE) up -d challenges-api challenges-db challenges-redis

rebuild-social:
	$(COMPOSE) stop social-api social-db social-redis
	$(COMPOSE) rm -f social-api social-db social-redis
	$(COMPOSE) build social-api
	$(COMPOSE) up -d social-api social-db social-redis

rebuild-recommendations:
	$(COMPOSE) stop recommendations-api recommendations-db recommendations-redis
	$(COMPOSE) rm -f recommendations-api recommendations-db recommendations-redis
	$(COMPOSE) build recommendations-api
	$(COMPOSE) up -d recommendations-api recommendations-db recommendations-redis



# OTHER

rebuild-gateway:
	$(COMPOSE) build gateway
	$(COMPOSE) up -d gateway

rebuild-frontend:
	$(COMPOSE) build frontend
	$(COMPOSE) up -d frontend
