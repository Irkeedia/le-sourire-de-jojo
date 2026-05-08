# Le Sourire de Jojo — site web

Site vitrine **Astro** (SSR) + **Tailwind**, avec formulaire de contact (API Node), option **MongoDB** et envoi **SMTP**.

## Prérequis

- Node.js 20+
- npm

## Installation

```bash
npm install
```

## Configuration

Copier `env.example` vers `.env` et renseigner les variables (voir [docs/ENVIRONNEMENT.md](docs/ENVIRONNEMENT.md)).

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production (`dist/`) |
| `npm run preview` | Prévisualisation du build |
| `npm run start` | Démarrage du serveur Node (après `build`) |

## Documentation

| Document | Contenu |
|----------|---------|
| [docs/ENVIRONNEMENT.md](docs/ENVIRONNEMENT.md) | Variables d’environnement |
| [docs/SECURITE.md](docs/SECURITE.md) | Cybersécurité, en-têtes, rate limiting, bonnes pratiques |
| [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) | Mise en production, HTTPS, proxy |
| [docs/RGPD.md](docs/RGPD.md) | Données personnelles et formulaire |
| [SECURITY.md](SECURITY.md) | Contact responsable sécurité (résumé EN) |

## Structure utile

- `src/pages/` — routes et pages
- `src/pages/offres.astro` — forfaits (mensuel, packs, liens vers contact avec `?pack=`)
- `src/lib/packs.ts` — identifiants et libellés des formules
- `src/pages/api/contact.ts` — endpoint formulaire
- `src/middleware.ts` — en-têtes de sécurité et rate limiting
- `public/` — fichiers statiques

## Licence

Projet privé — droits réservés aux ayants droit.
