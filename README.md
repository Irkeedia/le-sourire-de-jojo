# Le Sourire de Jojo — site web

Site vitrine pour **Le Sourire de Jojo** : accompagnement à domicile (Montauban, Tarn-et-Garonne).

**Stack :** [Astro](https://astro.build) en **SSR** (`output: server`), **Tailwind CSS**, adaptateur **Node**. Formulaire de contact via API, envoi **SMTP** optionnel, persistance **MongoDB** optionnelle.

**Dépôt :** [github.com/Irkeedia/le-sourire-de-jojo](https://github.com/Irkeedia/le-sourire-de-jojo)

## Prérequis

- Node.js 20+
- npm

## Installation

```bash
npm install
```

Copier `env.example` vers `.env` (voir [docs/ENVIRONNEMENT.md](docs/ENVIRONNEMENT.md)).

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement (localhost) |
| `npm run dev -- --host` | Dev accessible sur le réseau local (LAN) |
| `npm run build` | Build production → `dist/` |
| `npm run preview` | Prévisualiser le build |
| `npm run start` | Lancer le serveur Node après `build` |

## Fonctionnalités principales

- Pages : accueil, à propos, services, **offres & forfaits** (tarifs indicatifs), carnet, contact & légal.
- **Formulaire de contact** : validation Zod, honeypot, champ **pack** (formule), anti-abus (rate limiting).
- **SEO** : JSON-LD, meta, fil d’Ariane optionnel.
- **Accessibilité** : lien d’évitement, taille de texte A/A+, contrastes.
- **Curseur personnalisé** (souris précise uniquement) : point + traînée colorée dans `CursorTracker.astro` — désactivé sur tactile et si `prefers-reduced-motion`.

## Documentation

| Document | Contenu |
|----------|---------|
| [docs/ENVIRONNEMENT.md](docs/ENVIRONNEMENT.md) | Variables d’environnement |
| [docs/SECURITE.md](docs/SECURITE.md) | Cybersécurité, CSP, rate limiting |
| [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) | Production, HTTPS, proxy |
| [docs/RGPD.md](docs/RGPD.md) | Données personnelles / formulaire |
| [SECURITY.md](SECURITY.md) | Signalement de vulnérabilités (EN) |

## Structure utile

```
src/
  components/     # UI (header, footer, formulaires, curseur, etc.)
  layouts/          # BaseLayout (SEO, fil d’Ariane)
  lib/              # Zod, SMTP, rate limit, packs, sécurité
  middleware.ts     # En-têtes HTTP + rate limit POST /api/contact
  models/           # Mongoose (messages contact)
  pages/            # Routes (+ api/contact)
public/             # Assets statiques
docs/               # Guides projet
```

## Licence

Projet privé — droits réservés aux ayants droit.
