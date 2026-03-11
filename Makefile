.PHONY: dev build start lint ingest setup clean reset help

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
	npm run ingest

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
