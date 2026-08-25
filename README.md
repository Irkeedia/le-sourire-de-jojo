# Le Sourire de Jojo — Site Web

Site vitrine Astro pour **Le Sourire de Jojo**, activité d’accompagnement social, relationnel et bienveillant à domicile autour de **Montauban**, **Corbarieu** et le **Tarn-et-Garonne**.

Le site présente les services, les offres, le carnet de sourires, les documents juridiques, un formulaire de contact sécurisé et une page de contrat signable en ligne.

**Dépôt :** [github.com/Irkeedia/le-sourire-de-jojo](https://github.com/Irkeedia/le-sourire-de-jojo)

Par défaut, le site reste en **noindex** tant que `PUBLIC_ALLOW_INDEXING` n’est pas défini à `true` ou `1`.

---

## Sommaire

1. [Stack](#stack)
2. [Installation](#installation)
3. [Variables d’environnement](#variables-denvironnement)
4. [Scripts](#scripts)
5. [Architecture](#architecture)
6. [Pages principales](#pages-principales)
7. [Fonctionnalités clés](#fonctionnalités-clés)
8. [API contact](#api-contact)
9. [Signature et contrat](#signature-et-contrat)
10. [Export Word des documents](#export-word-des-documents)
11. [Sécurité, RGPD et indexation](#sécurité-rgpd-et-indexation)
12. [Build et déploiement](#build-et-déploiement)
13. [Documentation complémentaire](#documentation-complémentaire)

---

## Stack

| Technologie | Rôle |
| --- | --- |
| **Astro 5** | Framework web et routing fichier |
| **SSR `output: "server"`** | Rendu serveur |
| **@astrojs/node** | Adaptateur Node standalone hors Vercel |
| **@astrojs/vercel** | Adaptateur Vercel lorsque `VERCEL=1` |
| **Tailwind CSS 3** | Design system et styles utilitaires |
| **Zod** | Validation des données du formulaire |
| **Mongoose** | Stockage optionnel des messages contact |
| **Nodemailer** | Notifications e-mail SMTP |

Alias import : `@/*` pointe vers `src/*`.

---

## Installation

```bash
git clone git@github.com:Irkeedia/le-sourire-de-jojo.git
cd le-sourire-de-jojo
npm install
cp env.example .env
npm run dev
```

Astro affiche ensuite l’URL locale, généralement `http://localhost:4321`.

Pour exposer le serveur sur le réseau local :

```bash
npm run dev -- --host
```

---

## Variables D’environnement

Les variables principales sont :

| Variable | Usage |
| --- | --- |
| `PUBLIC_SITE_URL` | URL canonique du site |
| `PUBLIC_ALLOW_INDEXING` | Active l’indexation si `true` ou `1` |
| `CONTACT_TO_EMAIL` | Destinataire des messages contact |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Configuration SMTP |
| `MONGODB_URI` | Stockage optionnel des messages |
| `ENCRYPTION_KEY` | Chiffrement optionnel de champs sensibles |
| `CONTACT_RATE_LIMIT`, `CONTACT_RATE_WINDOW_MS` | Limitation du débit contact |
| `HSTS_ENABLE`, `CSP_REPORT_ONLY`, `CSP_REPORT_URI` | Durcissement HTTP / CSP |
| `PUBLIC_GOOGLE_MAPS_EMBED_URL` | Iframe Google Maps personnalisée |
| `PUBLIC_GOOGLE_MAPS_API_KEY` | Alternative Maps Embed API |
| `PUBLIC_GOOGLE_MAPS_EMBED_QUERY`, `PUBLIC_GOOGLE_MAPS_EMBED_ZOOM` | Fallback carte sans URL personnalisée |

Ne jamais committer `.env`.

Guide complet : [`docs/ENVIRONNEMENT.md`](docs/ENVIRONNEMENT.md).

---

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production dans `dist/` |
| `npm run preview` | Prévisualisation du build |
| `npm run start` | Démarrage Node après build |

---

## Architecture

```text
.
├── astro.config.mjs
├── tailwind.config.mjs
├── package.json
├── env.example
├── public/
│   └── images/
├── docs/
├── src/
│   ├── components/
│   ├── layouts/
│   ├── lib/
│   ├── models/
│   ├── pages/
│   │   ├── api/
│   │   ├── imprimer/
│   │   └── legal/
│   ├── styles/
│   └── middleware.ts
└── dist/
```

Fichiers transverses importants :

- `src/layouts/BaseLayout.astro` : layout global, SEO, scripts d’animation et navigation des carrousels.
- `src/middleware.ts` : en-têtes de sécurité et rate limiting.
- `src/lib/security-headers.ts` : politique CSP et headers.
- `src/lib/zod-contact.ts` : validation du formulaire contact.
- `src/lib/esign.ts` : point d’extension pour une future signature qualifiée type Yousign.

---

## Pages Principales

| Route | Fichier | Rôle |
| --- | --- | --- |
| `/` | `src/pages/index.astro` | Accueil, services, missions, méthode |
| `/a-propos` | `src/pages/a-propos.astro` | Histoire et posture |
| `/services` | `src/pages/services.astro` | Détail de l’accompagnement |
| `/offres` | `src/pages/offres.astro` | Formules, tarifs indicatifs, simulateur |
| `/carnet` | `src/pages/carnet.astro` | Carnet de sourires |
| `/contact` | `src/pages/contact.astro` | Carte, formulaire, mentions et RGPD |
| `/contrat` | `src/pages/contrat.astro` | Contrat renforcé avec double signature |
| `/legal` | `src/pages/legal/index.astro` | Hub des documents juridiques |
| `/cgv` | `src/pages/cgv.astro` | Conditions générales |
| `/conditions-annulation` | `src/pages/conditions-annulation.astro` | Annulation et résiliation |
| `/consentement` | `src/pages/consentement.astro` | Consentement imprimable |
| `/plan-du-site` | `src/pages/plan-du-site.astro` | Plan du site |
| `POST /api/contact` | `src/pages/api/contact.ts` | API du formulaire contact |

---

## Fonctionnalités Clés

- Header responsive avec menu mobile plein écran.
- Footer avec liens de navigation, hub juridique et contrat à signer.
- Hero d’accueil extrait dans `HomeHero.astro`.
- Cartes d’audience via `HomeAudienceCard.astro`.
- Carrousels horizontaux mobile avec flèches via `SnapCarouselNav.astro`.
- Navigation carrousel robuste basée sur `getBoundingClientRect()`.
- Curseur personnalisé desktop via `CursorTracker.astro`.
- Décor floral global via `BrandBackdrop.astro`.
- Carte Google Maps via iframe, configurable par variables publiques.
- Formulaire de contact validé, protégé par honeypot, taille maximale et rate limiting.
- Documents juridiques imprimables avec `LegalPrintChrome.astro` et `legal-document.css`.
- Contrat signable en ligne avec double signature tactile et horodatage.

Le contrôle de taille de texte A/A+ a été retiré de l’interface.

---

## API Contact

Endpoint : `POST /api/contact`

Comportement :

- corps JSON validé par Zod ;
- honeypot `website` contre les bots ;
- limite de taille du body ;
- rate limiting par IP côté middleware ;
- stockage MongoDB optionnel si `MONGODB_URI` est configuré ;
- notification SMTP si `CONTACT_TO_EMAIL` et les variables SMTP sont configurés ;
- chiffrement optionnel de certaines informations sensibles avec `ENCRYPTION_KEY`.

Le message contient notamment les confirmations juridiques : capacité à contracter et protocole d’urgence.

---

## Signature Et Contrat

La page `/contrat` permet de générer un contrat opérationnel :

- informations client et représentant légal ;
- prestation, rythme, tarif, paiement et lieu d’intervention ;
- préavis d’annulation ;
- contact d’urgence, référent santé/proche, limites connues et consignes particulières ;
- clauses croisées avec CGV, consentement, annulation/résiliation et RGPD ;
- protections prestataire : nature non médicale, obligation de moyens, limites de responsabilité, risques préexistants, urgence, interruption possible, force majeure ;
- double signature tactile : prestataire + client ;
- horodatage local et ISO pour chaque signature ;
- impression ou enregistrement PDF via le navigateur ;
- téléchargement en **Word (.docx) modifiable** — formulaire vide : modèle vierge ; formulaire rempli et signé : contrat complet avec les signatures.

Limite importante : il s’agit d’une **signature simple intégrée au document**, pas d’une signature électronique qualifiée. Pour identité vérifiée, piste d’audit et valeur probante renforcée, il faudra brancher un service spécialisé comme Yousign, DocuSign ou Universign.

---

## Export Word Des Documents

Chaque document juridique peut être téléchargé en **`.docx` réellement modifiable** (Word, LibreOffice, Google Docs), en plus de l’impression / PDF :

| Page | Fichier généré |
| --- | --- |
| `/contrat` | `Contrat-de-prestation-Le-Sourire-de-Jojo.docx` |
| `/imprimer/cgv` | `CGV-Le-Sourire-de-Jojo.docx` |
| `/imprimer/conditions-annulation` | `Conditions-annulation-Le-Sourire-de-Jojo.docx` |
| `/consentement` | `Consentement-Le-Sourire-de-Jojo.docx` |

Fonctionnement :

1. `src/components/WordExportButton.astro` lit le document **tel qu’il est affiché** (titres, paragraphes, gras, signatures PNG) et le réduit à une liste de blocs simples ;
2. `POST /api/docx` (`src/pages/api/docx.ts`) valide ces blocs avec Zod puis appelle `buildDocx()` ;
3. `src/lib/docx-document.ts` construit un document Word natif via la librairie [`docx`](https://docx.js.org/) : page A4, marges 20 mm, styles calqués sur les documents du site, pied de page numéroté.

Conséquences pratiques :

- le contrat exporté reflète l’état du formulaire — vide, on obtient le **modèle vierge** à faire relire ; rempli et signé, on obtient le **contrat complet avec les deux signatures** ;
- aucun contenu n’est dupliqué : le `.docx` suit automatiquement toute modification du texte des pages ;
- le bouton est branché via la prop `docx` de `LegalPrintChrome.astro`, donc un nouveau document imprimable l’obtient en une ligne ;
- limite anti-abus : `DOCX_RATE_LIMIT` / `DOCX_RATE_WINDOW_MS` (middleware), corps limité à 4 Mo.

---

## Sécurité, RGPD Et Indexation

Sécurité :

- headers configurés dans `src/lib/security-headers.ts` ;
- CSP configurable en mode report-only ;
- rate limiting sur le formulaire ;
- stockage MongoDB optionnel ;
- chiffrement optionnel de champs sensibles.

RGPD :

- finalités, bases légales, durées, destinataires et droits détaillés sur `/contact#rgpd` ;
- documentation dédiée : [`docs/RGPD.md`](docs/RGPD.md).

Indexation :

- sans `PUBLIC_ALLOW_INDEXING=true` ou `1`, le site envoie `noindex, nofollow` ;
- `robots.txt` bloque tout par défaut ;
- le JSON-LD LocalBusiness n’est injecté que si l’indexation est autorisée.

---

## Build Et Déploiement

Build :

```bash
npm run build
```

Démarrage Node après build :

```bash
npm run start
```

Sur Vercel, l’adaptateur Vercel est sélectionné automatiquement par la variable `VERCEL=1`.

Guide complet : [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md).

---

## Documentation Complémentaire

| Document | Contenu |
| --- | --- |
| [`docs/ENVIRONNEMENT.md`](docs/ENVIRONNEMENT.md) | Variables d’environnement |
| [`docs/SECURITE.md`](docs/SECURITE.md) | CSP, headers, rate limiting |
| [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md) | Mise en production |
| [`docs/RGPD.md`](docs/RGPD.md) | Données personnelles |
| [`SECURITY.md`](SECURITY.md) | Signalement de vulnérabilités |

---

## Licence

Projet privé — droits réservés aux ayants droit.
