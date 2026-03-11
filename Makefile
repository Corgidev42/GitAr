.PHONY: docker-up docker-down docker-logs docker-ingest-watch docker-stop-ingest reset help

# ── Docker (via Compose) ───────────────────────
docker-up:             ## Lancer l'app GitAr
	docker compose up -d --build app

docker-down:           ## Stopper tous les containers
	docker compose down

docker-logs:           ## Voir les logs de l'app
	docker compose logs -f app

docker-ingest-watch:   ## Lancer l'ingestion automatique en background
	docker compose up -d --build ingest-watch

docker-stop-ingest:    ## Stopper l'ingestion automatique
	docker compose stop ingest-watch

reset:                 ## Réinitialiser la base de données
	@echo '{"lessons":[],"globalKnowledge":{"chords":[],"techniques":[],"rhythms":[],"strums":[]},"techniqueDetails":{}}' > database.json
	@echo "✅ Base de données réinitialisée"

# ── Aide ───────────────────────────────────────
help:                  ## Afficher cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
