.PHONY: dev dev-bg dev-stop build start lint ingest setup clean reset help

PORT ?= 3000

# ── Développement ──────────────────────────────
dev:                   ## Lancer le serveur de dev (ouvre le navigateur, terminal occupé)
	@(sleep 3 && (command -v open >/dev/null 2>&1 && open "http://localhost:$(PORT)" || command -v xdg-open >/dev/null 2>&1 && xdg-open "http://localhost:$(PORT)" || true)) & PORT=$(PORT) npm run dev

dev-bg:                ## Même chose en arrière-plan (libère le terminal) + ouvre le navigateur
	@mkdir -p .next
	@if [ -f .next/dev-server.pid ] && kill -0 $$(cat .next/dev-server.pid) 2>/dev/null; then \
	  echo "⚠️  Un serveur tourne déjà (PID $$(cat .next/dev-server.pid)). Arrêt: make dev-stop"; \
	  exit 1; \
	fi
	@rm -f .next/dev-server.pid
	@(sleep 4 && (command -v open >/dev/null 2>&1 && open "http://localhost:$(PORT)" || command -v xdg-open >/dev/null 2>&1 && xdg-open "http://localhost:$(PORT)" || true)) &
	@bash -c 'PORT=$(PORT) nohup npm run dev >> .next/dev.log 2>&1 & echo $$! > .next/dev-server.pid'
	@echo "✅ Next en fond — http://localhost:$(PORT) — PID $$(cat .next/dev-server.pid)"
	@echo "   Logs: tail -f .next/dev.log   |   Arrêt: make dev-stop"

dev-stop:              ## Arrêter le serveur lancé avec make dev-bg
	@if [ ! -f .next/dev-server.pid ]; then echo "Aucun serveur enregistré (make dev-bg)."; exit 0; fi
	@PID=$$(cat .next/dev-server.pid); \
	if kill -0 $$PID 2>/dev/null; then \
	  kill $$PID; echo "✅ Serveur arrêté (PID $$PID)"; \
	else \
	  echo "Processus $$PID introuvable (déjà arrêté ?)"; \
	fi
	@rm -f .next/dev-server.pid

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
	mkdir -p import public/assets/tabs public/assets/audio public/assets/techniques
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
