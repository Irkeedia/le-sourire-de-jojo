# Le Sourire de Jojo — site web

Site vitrine pour **Le Sourire de Jojo** : accompagnement à domicile bienveillant (lecture, sorties, jeux, nature, souvenirs) autour de **Montauban**, **Corbarieu** et le **Tarn-et-Garonne**. Le site présente l’offre, les tarifs indicatifs, le carnet de sourires, et un **formulaire de contact** branché sur une API sécurisée.

**Dépôt :** [github.com/Irkeedia/le-sourire-de-jojo](https://github.com/Irkeedia/le-sourire-de-jojo)

---

## Sommaire

1. [Stack technique](#stack-technique)
2. [Prérequis](#prérequis)
3. [Installation rapide](#installation-rapide)
4. [Variables d’environnement](#variables-denvironnement)
5. [Scripts npm](#scripts-npm)
6. [Architecture du projet](#architecture-du-projet)
7. [Pages et routes](#pages-et-routes)
8. [API contact](#api-contact)
9. [Sécurité et conformité](#sécurité-et-conformité)
10. [Interface : design et composants clés](#interface--design-et-composants-clés)
11. [Assets statiques et images](#assets-statiques-et-images)
12. [Build et déploiement](#build-et-déploiement)
13. [Documentation complémentaire](#documentation-complémentaire)
14. [Licence](#licence)

---

## Stack technique

| Technologie | Rôle |
|-------------|------|
| **[Astro](https://astro.build) 5** | Framework web, pages `.astro`, routing fichier |
| **Mode `output: "server"`** | Rendu côté serveur (SSR), pas de site entièrement statique |
| **[@astrojs/node](https://docs.astro.build/en/guides/integrations-guide/node/)** | Adaptateur Node en mode **standalone** (serveur après build) |
| **[Tailwind CSS](https://tailwindcss.com) 3** | Styles utilitaires, thème couleurs et polices personnalisés |
| **[Zod](https://zod.dev)** | Validation du corps JSON du formulaire de contact |
| **[Mongoose](https://mongoosejs.com)** | Persistance **optionnelle** des messages (si `MONGODB_URI` est défini) |
| **[Nodemailer](https://nodemailer.com)** | Envoi d’e-mails SMTP pour les notifications de contact |

Alias Vite : `@` → répertoire `src/` (voir `astro.config.mjs`).

---

## Prérequis

- **Node.js** 20 ou supérieur (recommandé : LTS actuelle)
- **npm** (livré avec Node)

Vérifier les versions :

```bash
node -v
npm -v
```

---

## Installation rapide

```bash
git clone git@github.com:Irkeedia/le-sourire-de-jojo.git
cd le-sourire-de-jojo
npm install
```

Copier le fichier d’exemple des variables d’environnement :

```bash
cp env.example .env
```

Puis éditer `.env` selon votre environnement (voir [Variables d’environnement](#variables-denvironnement) et le guide détaillé dans `docs/ENVIRONNEMENT.md`).

Lancer le serveur de développement :

```bash
npm run dev
```

Par défaut, Astro affiche l’URL locale (souvent `http://localhost:4321`). Pour exposer le serveur sur le réseau local :

```bash
npm run dev -- --host
```

---

## Variables d’environnement

Résumé (table complète : `docs/ENVIRONNEMENT.md`) :

| Variable | Usage |
|----------|--------|
| `PUBLIC_SITE_URL` | URL canonique du site (SEO, `Astro.site`) — fortement conseillé en production |
| `CONTACT_TO_EMAIL` | Destinataire des messages contact |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Envoi des e-mails de notification |
| `MONGODB_URI` | Optionnel : enregistrement des messages en base |
| `HSTS_ENABLE`, `CSP_REPORT_ONLY`, `CSP_REPORT_URI` | Durcissement HTTP / CSP |
| `CONTACT_RATE_LIMIT`, `CONTACT_RATE_WINDOW_MS` | Limite de débit sur `POST /api/contact` |

**Ne jamais committer** le fichier `.env` (il doit rester dans `.gitignore`).

---

## Scripts npm

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement avec rechargement à chaud |
| `npm run dev -- --host` | Même chose, accessible depuis d’autres machines du LAN |
| `npm run build` | Compilation production → répertoire `dist/` |
| `npm run preview` | Prévisualisation locale du build (Astro) |
| `npm run start` | Démarrage du serveur Node **après** `npm run build` (`node ./dist/server/entry.mjs`) |

En production, placez le processus derrière un reverse proxy (HTTPS, en-têtes `X-Forwarded-*`). Voir `docs/DEPLOIEMENT.md`.

---

## Architecture du projet

```
.
├── astro.config.mjs      # Astro : SSR, adapter Node, Tailwind, alias @
├── tailwind.config.mjs   # Couleurs marque, polices, texture "grain"
├── package.json
├── env.example           # Modèle des variables d’environnement
├── public/               # Fichiers servis tels quels (URL = racine du site)
│   └── images/           # Photographies, illustrations, packs d’assets fleurs, etc.
├── docs/                 # Guides : env, sécurité, déploiement, RGPD
├── src/
│   ├── components/       # Blocs UI réutilisables
│   ├── layouts/          # BaseLayout (en-tête HTML, SEO, fil d’Ariane)
│   ├── lib/              # Logique : Zod, mail, rate limit, packs, DB, en-têtes
│   ├── models/           # Schéma Mongoose (messages contact)
│   ├── middleware.ts     # En-têtes de sécurité + rate limiting global
│   ├── pages/            # Routes (fichiers = URLs) + API
│   └── styles/
│       └── global.css    # Couches Tailwind + composants (.brand-backdrop, .jojo-paper, etc.)
└── dist/                 # Généré par `npm run build` (ne pas éditer à la main)
```

### Fichiers transverses importants

- **`src/middleware.ts`** : appliqué aux requêtes entrantes (sécurité, limitation du débit sur le POST contact).
- **`src/lib/security-headers.ts`** : configuration des en-têtes (CSP, etc., selon variables).
- **`src/lib/rate-limit.ts`** : logique de fenêtre glissante par IP.

---

## Pages et routes

Les routes suivent la convention Astro : un fichier dans `src/pages/` = une URL.

| Chemin (exemple) | Fichier | Contenu principal |
|------------------|---------|-------------------|
| `/` | `pages/index.astro` | Accueil, sections services, « Rayon de soleil », FAQ, CTA |
| `/a-propos` | `pages/a-propos.astro` | Histoire et philosophie |
| `/services` | `pages/services.astro` | Détail des axes d’accompagnement |
| `/offres` | `pages/offres.astro` | Forfaits / tarifs indicatifs |
| `/carnet` | `pages/carnet.astro` | Carnet de sourires |
| `/contact` | `pages/contact.astro` | Formulaire + simulateur crédit d’impôt |
| `POST /api/contact` | `pages/api/contact.ts` | API JSON du formulaire |

Page d’erreur : `pages/404.astro`.

---

## API contact

- **Endpoint :** `POST /api/contact`
- **Format :** JSON validé par `contactSchema` (`src/lib/zod-contact.ts`)
- **Protections :** honeypot (`website`), limite de taille du corps, rate limiting (middleware + variables d’env)
- **Comportement :**
  - Si `MONGODB_URI` est configuré et joignable, le message peut être enregistré via `ContactMessage`
  - Si `CONTACT_TO_EMAIL` et SMTP sont configurés, un e-mail de notification est envoyé
- **Prerender :** désactivé (`prerender = false`) pour exécution serveur à chaque requête

En cas d’erreur d’envoi mail, l’API renvoie une réponse d’erreur appropriée (voir le code de `contact.ts` pour le détail des statuts).

---

## Sécurité et conformité

- En-têtes de sécurité et politique de contenu documentés dans `docs/SECURITE.md`
- Données personnelles et formulaire : `docs/RGPD.md`
- Signalement de vulnérabilités : `SECURITY.md`

---

## Interface : design et composants clés

### Charte (Tailwind)

Couleurs principales définies dans `tailwind.config.mjs` :

- **marine** (`#1D3557`) — texte fort, boutons
- **ivoire** (`#F5F3E7`) — fonds clairs
- **rose-vieux**, **sauge**, **aquarelle-*** — accents illustratifs

Polices : **Dancing Script** (titres affichage), **Lato** (corps), chargées via Google Fonts dans `BaseLayout.astro`.

### Composants notables

| Composant | Rôle |
|-----------|------|
| `BaseLayout.astro` | Structure HTML, meta, JSON-LD par défaut (LocalBusiness), header/footer globaux |
| `SiteHeader.astro` / `SiteFooter.astro` | Navigation et pied de page |
| `BrandBackdrop.astro` | Calque fixe plein écran : décor floral en PNG (toutes les images du dossier `public/images/assets fleur/`) |
| `FloralAccent.astro` | Accents floraux **en PNG** dans certaines sections (remplace les anciens SVG décoratifs) |
| `CursorTracker.astro` | Curseur personnalisé : **petit point** uniquement sur pointeur fin (`hover: hover` + `pointer: fine`), curseur masqué sur le document ; champs texte gardent le curseur système ; désactivé sur appareils tactiles |
| `ContactForm.astro` | Formulaire relié à l’API |
| `CostSimulator.astro` | Estimation liée au crédit d’impôt (page contact) |
| `TextSizeToggle.astro` | Réglage taille de texte (accessibilité) |

Le fichier `src/styles/global.css` contient les utilitaires de mise en page (fond `body`, grain, cartes `.jojo-paper`, séparateur `.jojo-floral-divider`, positionnement des fleurs du backdrop).

---

## Assets statiques et images

- Tout ce qui est dans **`public/`** est accessible à la racine : `public/images/photo.png` → `/images/photo.png`.
- Les **fleurs de fond** globales sont dans `public/images/assets fleur/` (`1.png` … `8.png`). Dans le HTML, l’espace du nom de dossier est encodé en URL : `/images/assets%20fleur/1.png`.
- Pour ajouter ou remplacer des visuels : déposer les fichiers dans `public/` puis mettre à jour les chemins dans les composants concernés (`BrandBackdrop.astro`, `FloralAccent.astro`, ou pages).

---

## Build et déploiement

1. Définir les variables d’environnement sur l’hébergement (équivalent de `.env`).
2. `npm run build`
3. `npm run start` (ou lancer le point d’entrée généré selon la doc de l’hébergement Node)

Détails (HTTPS, proxy, variables) : **`docs/DEPLOIEMENT.md`**.

---

## Documentation complémentaire

| Document | Contenu |
|----------|---------|
| [docs/ENVIRONNEMENT.md](docs/ENVIRONNEMENT.md) | Liste et rôle de chaque variable d’environnement |
| [docs/SECURITE.md](docs/SECURITE.md) | CSP, rate limiting, bonnes pratiques |
| [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) | Mise en production |
| [docs/RGPD.md](docs/RGPD.md) | Traitement des données du formulaire |
| [SECURITY.md](SECURITY.md) | Politique de signalement de vulnérabilités |

---

## Licence

Projet privé — droits réservés aux ayants droit.
