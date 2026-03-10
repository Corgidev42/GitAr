# 🎸 GitAr

Système local de gestion d'apprentissage guitare (LMS). Automatise l'ingestion de ressources pédagogiques (PDF, MP3) et offre une interface de pratique interactive.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Stockage** : `database.json` local + système de fichiers
- **IA** : Google Gemini (optionnel) pour l'extraction structurée des leçons

## Démarrage rapide

```bash
# Installation
make setup

# Configurer Gemini (optionnel)
# Renseigner GEMINI_API_KEY dans .env.local

# Importer des fichiers
# Déposer PDF/MP3 dans ./import/ puis :
make ingest

# Lancer le serveur
make dev
# → http://localhost:3000
```

## Convention de nommage des fichiers

Déposer les fichiers dans `./import/` avec ce format :

| Type | Format | Exemple |
|------|--------|---------|
| Guide / Synthèse | `PAC_D101 - Guide - Titre.pdf` | `PAC_D101 - Guide - Les 4 accords magiques.pdf` |
| Fiche synthèse | `PAC_D101 - Fiche synthese - Titre.pdf` | `PAC_D101 - Fiche synthese - Les 4 accords magiques.pdf` |
| Tablature | `PAC_D101 - Titre.pdf` | `PAC_D101 - Les 4 accords magiques.pdf` |
| Backing track | `PAC_D101 - Titre - 65bpm.mp3` | `PAC_D101 - Les 4 accords magiques - 65bpm.mp3` |

> L'ID suit le format `[D|I][numéro]` — **D** = Débutant, **I** = Intermédiaire.

## Commandes

```
make help
```

| Commande | Description |
|----------|-------------|
| `make dev` | Serveur de développement |
| `make build` | Build production |
| `make ingest` | Importer les fichiers de `/import` |
| `make ingest-watch` | Surveiller `/import` en continu |
| `make setup` | Installation complète |
| `make clean` | Nettoyer les caches |

## Structure du projet

```
GitAr/
├── import/                    ← Dépôt des fichiers à importer
├── database.json              ← Base de données locale
├── scripts/ingest.ts          ← Script d'auto-ingestion
├── public/assets/
│   ├── tabs/                  ← Tablatures PDF
│   └── audio/                 ← Backing tracks MP3
└── src/
    ├── types/index.ts         ← Schéma TypeScript
    ├── lib/
    │   ├── database.ts        ← Helpers DB
    │   └── llm-extract.ts     ← Extraction Gemini / fallback regex
    ├── components/
    └── app/
        ├── page.tsx           ← Dashboard Skill Tree
        ├── knowledge/         ← Knowledge Base
        ├── lesson/[id]/       ← Cockpit de pratique
        └── api/               ← Routes API
```

## Interface

- **Skill Tree** — Vue en grille de toutes les leçons avec statut et progression
- **Knowledge Base** — Dictionnaire visuel des accords (avec schémas), techniques et rythmes acquis
- **Cockpit de pratique** — Page par leçon : lecteur audio avec sélecteur BPM, viewer PDF, checklist

## Licence

Projet personnel — usage privé.
