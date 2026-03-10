.PHONY: dev build start lint ingest ingest-watch setup clean

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

# ── Setup ──────────────────────────────────────
setup:                 ## Installation complète du projet
	npm install
	mkdir -p import public/assets/tabs public/assets/audio
	@echo "✅ Projet prêt. Place tes fichiers dans /import puis: make ingest"

clean:                 ## Nettoyer les caches
	rm -rf .next node_modules/.cache

# ── Aide ───────────────────────────────────────
help:                  ## Afficher cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
