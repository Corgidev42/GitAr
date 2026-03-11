.PHONY: dev build start lint ingest ingest-watch setup clean reset docker-build docker-run docker-stop docker-logs

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

# ── Docker ─────────────────────────────────────
docker-build:          ## Build l'image Docker
	docker build -t gitar .

docker-run:            ## Lancer GitAr en Docker
	docker run -d --name gitar -p 3000:3000 gitar

docker-stop:           ## Arrêter le container Docker
	docker stop gitar && docker rm gitar

docker-logs:           ## Voir les logs Docker
	docker logs -f gitar

# ── Setup ──────────────────────────────────────
setup:                 ## Installation complète du projet
	npm install
	mkdir -p import public/assets/tabs public/assets/audio
	@echo "✅ Projet prêt. Place tes fichiers dans /import puis: make ingest"

clean:                 ## Nettoyer les caches
	rm -rf .next node_modules/.cache

reset:                 ## Réinitialiser la base de données
	@echo '{"lessons":[],"globalKnowledge":{"chords":[],"techniques":[],"rhythms":[]}}' > database.json
	@echo "✅ Base de données réinitialisée"

# ── Aide ───────────────────────────────────────
help:                  ## Afficher cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
