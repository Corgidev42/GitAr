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
#
# Ou pour ingérer automatiquement dès qu’un fichier est ajouté :
# make ingest-watch

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
| `make docker-build` | Build l'image Docker |
| `make docker-run` | Lancer GitAr en Docker |
| `make docker-stop` | Arrêter le container Docker |
| `make docker-up` | Lancer GitAr via docker compose (volumes) |
| `make docker-down` | Stopper docker compose |
| `make docker-up-ingest-watch` | Lancer l’ingestion auto en Docker |
| `make docker-stop-ingest-watch` | Stopper l’ingestion auto en Docker |

## Docker : éviter rebuild à chaque ingest

Si tu utilises `make docker-run`, l'image embarque `database.json` et `public/assets` au moment du build. Du coup, après un `make ingest` sur ta machine, le container ne verra pas les nouveaux fichiers tant que tu n'as pas rebuild.

Solution : utilise `docker compose` avec des volumes (recommandé) :

```bash
make docker-up

# optionnel : ingestion auto dans un container séparé
make docker-up-ingest-watch
```

Dans ce mode :
- Tu rebuild/restart uniquement quand tu changes le code.
- Pour un ingest, il suffit d'actualiser la page (bouton “Actualiser” ou refresh navigateur).

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

## Fonctionnalités principales

- **Statut automatique des leçons** :
  - 🔒 Verrouillé : aucune case checklist cochée
  - 🎯 En cours : au moins une case cochée
  - ✅ Complété : toutes les cases cochées
  - Le statut se met à jour tout seul, pas de bouton manuel

- **Edition interactive** :
  - Knowledge Base : suppression d'accords, techniques, rythmes via bouton ✏️/×
  - Dashboard : suppression de leçons via bouton ✏️/×
  - `make reset` : réinitialise la base

- **Extraction IA intelligente** :
  - D/D majeur, Dm/D mineur, croches/croche, etc. sont normalisés automatiquement
  - Prompt Gemini strict : notation anglo-saxonne, techniques nommées, valeurs rythmiques uniquement

- **Ingestion automatique** :
  - Dépose tes fichiers dans `/import`, lance `make ingest`
  - Les leçons sont ajoutées avec checklist et statut initial

- **Surveillance automatique du dossier /import** :
  - Lance `make ingest-watch` pour surveiller `/import` en continu
  - Dès qu'un fichier est ajouté, il est analysé et ingéré automatiquement

## Mise à jour

- Pour tester :
  - `make reset` pour vider la base
  - `make ingest` pour réimporter
  - Utilise les boutons ✏️ pour éditer/supprimer

## Historique des versions

- **Déploiement Docker** ajouté
- **Surveillance automatique du dossier /import** ajoutée
- Statut des leçons désormais automatique
- Edition/suppression interactive
- Normalisation IA améliorée
- Prompt Gemini renforcé
- Commande `make reset` ajoutée

## Licence

Projet personnel — usage privé.
