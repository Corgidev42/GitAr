.PHONY: dev build start lint ingest ingest-watch setup clean reset docker-up docker-down docker-logs docker-ingest-watch docker-stop-ingest

# ── Développement ──────────────────────────────
dev:                   ## Lancer le serveur de dev
	npm run dev

build:                 ## Build production
	npm run build

start:                 ## Démarrer en production
	npm run start

lint:                  ## Linter
	npm run lint

# ── Ingestion ──────────────────────────────────
ingest:                ## Importer les fichiers de /import dans la base
	npx tsx scripts/ingest.ts

ingest-watch:          ## Surveiller /import en continu
	npx tsx scripts/ingest.ts --watch

# ── Docker (via Compose) ───────────────────────
docker-up:             ## Lancer l'app GitAr (avec volumes pour dev)
	docker compose up -d --build app

docker-down:           ## Stopper tous les containers
	docker compose down

docker-logs:           ## Voir les logs de l'app
	docker compose logs -f app

docker-ingest-watch:   ## Lancer l'ingestion automatique en background
	docker compose up -d --build ingest-watch

docker-stop-ingest:    ## Stopper l'ingestion automatique
	docker compose stop ingest-watch

# ── Setup ──────────────────────────────────────
setup:                 ## Installation complète du projet
	npm install
	mkdir -p import public/assets/tabs public/assets/audio
	@echo "✅ Projet prêt. Place tes fichiers dans /import puis: make ingest"

clean:                 ## Nettoyer les caches
	rm -rf .next node_modules/.cache

reset:                 ## Réinitialiser la base de données
	@echo '{"lessons":[],"globalKnowledge":{"chords":[],"techniques":[],"rhythms":[],"strums":[]},"techniqueDetails":{}}' > database.json
	@echo "✅ Base de données réinitialisée"

# ── Aide ───────────────────────────────────────
help:                  ## Afficher cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
