# Le Sourire de Jojo — Site Web

Site vitrine Astro pour **Le Sourire de Jojo** (Céline Meunier Ben Neji), dame de compagnie à domicile au départ de **Corbarieu**, avec **Montauban** et le **Tarn-et-Garonne** autour. Lancement de l’activité : **2 janvier 2027**.

Le site présente les services, les offres, le carnet de sourires, les documents juridiques, un formulaire de contact sécurisé et une page de contrat signable en ligne.

**Dépôt :** [github.com/Irkeedia/le-sourire-de-jojo](https://github.com/Irkeedia/le-sourire-de-jojo) (**public** : rien de confidentiel ici)
**En ligne :** [le-sourire-de-jojo.vercel.app](https://le-sourire-de-jojo.vercel.app) — chaque push sur `main` est déployé en production par Vercel.

Par défaut, le site reste en **noindex** tant que `PUBLIC_ALLOW_INDEXING` n’est pas défini à `true` ou `1`.

---

## Sommaire

1. [État du projet](#état-du-projet)
1. [Règles de contenu à respecter](#règles-de-contenu-à-respecter)
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
11. [Espace familles](#espace-familles)
12. [Sécurité, RGPD et indexation](#sécurité-rgpd-et-indexation)
13. [Build et déploiement](#build-et-déploiement)
14. [Documentation complémentaire](#documentation-complémentaire)

---

## État Du Projet

*Mis à jour le 8 novembre 2026.*

| Sujet | État |
| --- | --- |
| Site vitrine | En ligne, à jour des retours du call du 8 novembre (zone Corbarieu, parents solos, activités en pause retirées, prix TTC conforme) |
| Formulaire de contact | Réparé en production (script et API) ; envoi d’e-mail selon la configuration SMTP |
| Espace familles | Fusionné mais **inactif** : à brancher sur une base MongoDB Atlas (via le Marketplace Vercel) + `ADMIN_EMAIL`. Refonte « tableau de bord à tuiles » en cours sur une branche dédiée |
| Numéros officiels | SIRET demandé le 7 novembre ; NOVA (déclaration SAP) et médiateur de la consommation à suivre. À reporter dans les mentions légales, CGV, contrat, conditions d’annulation |
| Nom de domaine | `le-sourire-de-jojo.fr` prévu, pas encore acheté. Ensuite : `PUBLIC_SITE_URL`, puis `PUBLIC_ALLOW_INDEXING=true` |
| À faire sur le site | Retirer l’option « senior avec perte d’autonomie » du formulaire, renommer le forfait « Biographie de vie », retirer le PowerPoint téléchargeable de `public/presentation/` (données internes) |

Les supports imprimés (cartes, flyer, carnet, logos HD et vectoriels) sont générés dans un dossier local `print/`, **non versionné**.

---

## Règles De Contenu À Respecter

Décisions prises avec Céline ; à garder en tête pour toute modification de texte.

- **Prix** : le prix TTC (38 € / h) est toujours affiché **en plus gros** que le montant après crédit d’impôt (19 € / h), qui reste détaché du prix et marqué « sous conditions » (arrêté du 17 mars 2015, art. 5). Voir `src/lib/tarif.ts`.
- **Publics** : simple déclaration SAP, donc **seniors autonomes** uniquement (pas de personnes âgées dépendantes / bénéficiaires de l’APA), personnes temporairement immobilisées, **parents solos** (garde ponctuelle d’enfants de plus de 3 ans, en journée hors week-end).
- **En pause** (ne pas mentionner) : accompagnement PMR, fauteuil roulant, activités avec le chien (Lili, « visite duo »), post-opératoire, pack famille & aidants.
- **Nom** : « Céline Meunier Ben Neji ». **Zone** : Corbarieu en premier, Montauban en ville voisine.
- **Crédit d’impôt** : payé par la personne aidée, hors espèces ; sorties limitées aux heures passées au domicile sur l’année ; la rédaction d’une biographie n’y ouvre pas droit.
- **Photos de clients** : uniquement avec un accord écrit (droit à l’image).

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
| **Mongoose** | Espace familles (comptes, dossiers, photos) et stockage optionnel des messages contact |
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
| `MONGODB_URI` | Base de l’espace familles (et stockage optionnel des messages contact) |
| `ADMIN_EMAIL` | E-mail de Céline : seul compte créé sans invitation, administratrice de l’espace familles |
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
| `npm run images` | Regénère les images du site depuis `assets-src/` |
| `npm run dev:familles` | Site + base MongoDB locale (`.local-db/`) pour essayer l’espace familles |
| `npm run test:familles` | Test de bout en bout de l’espace familles, 105 vérifications (à lancer après `npm run build`) |

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

## Images

Les originaux en pleine résolution sont rangés dans `assets-src/` et **ne sont pas mis en ligne**. Les versions affichées sur le site (WebP redimensionnés, icônes, image de partage `og-image.jpg`) sont générées dans `public/` par :

```bash
npm run images
```

Pour ajouter ou remplacer une photo : déposer l’original dans `assets-src/images/`, ajouter une ligne dans `scripts/optimize-images.mjs`, lancer la commande, puis utiliser le fichier `.webp` produit dans le code.

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
| `/presentation` | `src/pages/presentation.astro` | Présentation du projet en diapositives (contenu : `src/lib/presentation-slides.ts`) |
| `/partenaires` | `src/pages/partenaires.astro` | Partenaires de confiance |
| `/compte/*` | `src/pages/compte/` | Espace familles (voir plus bas) |
| `POST /api/contact` | `src/pages/api/contact.ts` | API du formulaire contact |
| `POST /api/docx` | `src/pages/api/docx.ts` | Export Word des documents juridiques |

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
- Carte Google Maps chargée seulement au clic du visiteur (pas de cookie tiers sans accord, donc pas de bandeau cookies), configurable par variables publiques.
- Polices hébergées par le site (`src/styles/fonts.ts`, paquets Fontsource) : aucune requête vers Google Fonts.
- Images optimisées en WebP, générées depuis les originaux de `assets-src/` (voir [Images](#images)).
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

## Espace Familles

Espace privé où Céline publie ses comptes-rendus de visite (mot, photos, pages du carnet de sourires numérisées) et où les proches suivent les nouvelles, même de loin.

**Fonctionnement**

- **Un dossier par personne accompagnée** (ex. « Monsieur Robert »), créé par Céline depuis `/compte`. Son accueil liste les dossiers en cartes (messages non lus, prochaine visite, dernière visite racontée), avec un raccourci **« Publier une visite »**.
- **Interface « application »** (`src/layouts/EspaceLayout.astro`) : menu latéral sur ordinateur (initiales, « Bonjour … », rubriques, retour au site, déconnexion) ; sur mobile, barre du haut compacte et barre d’onglets en bas avec un panneau « Plus ». L’en-tête du site public n’apparaît pas dans l’espace connecté.
- **Tableau de bord du dossier** (`/compte/dossier/[id]`) : carte d’accueil (« Bonjour Paul ☀️ », bouton « Lire la dernière visite » ou, pour Céline, « Publier une visite »), quatre statistiques (visites du mois, messages non lus, prochaine visite, photos), puis les cartes « Dernières visites », « Prochaines visites » (pastilles Aujourd’hui / Demain / À venir), aperçu de l’album, « Rythme des visites » (visites racontées par mois sur 6 mois), « Derniers messages » et « Un sourire du jour ». L’illustration est maison : le logo en médaillon couronné des fleurs aquarelle du site.
- **Cloche des nouveautés** : visites racontées, messages, documents et rendez-vous ajoutés depuis la dernière ouverture de la cloche (par personne et par dossier).
- **Rubriques** : Carnet de sourires (une page par visite, précédente / suivante), Messagerie (pastille « non lu », visible par Céline et tous les proches du dossier), Photos (visionneuse plein écran), Agenda (heure de Paris), Documents (PDF ou images, 4 Mo max, pas de données de santé), Proches (Céline invite, retire, ou crée un lien de mot de passe), Mon compte (changement de mot de passe).
- **Connexion** (`src/layouts/AuthLayout.astro`) : grande carte arrondie, champs avec icônes, bouton « œil », pas de connexion par Google, Apple ou Facebook. **Mot de passe oublié** : lien à usage unique valable 1 h, jeton stocké haché, réponse identique que le compte existe ou non. L’e-mail part si le SMTP est configuré ; sinon la page invite à contacter Céline, qui peut créer le lien depuis la rubrique Proches. Une réinitialisation ferme toutes les sessions du compte.
- **Invitations** : depuis un dossier, Céline crée un lien pour chaque proche (usage unique, valable 14 jours) et l’envoie par SMS, WhatsApp ou e-mail. Il n’y a **pas d’inscription libre** : seul l’e-mail `ADMIN_EMAIL` peut créer un compte sans invitation (celui de Céline). Un proche qui a déjà un compte et reçoit un nouveau lien est simplement rattaché au nouveau dossier.
- **Cloisonnement** : un proche ne voit que les dossiers auxquels il est rattaché. Chaque page (`loadDossierPage`) et chaque API (`guard`) vérifie l’accès ; un dossier inaccessible répond « introuvable » sans révéler son existence. Les écritures venant d’un autre site sont refusées.
- **Photos et documents** : photos réduites dans le navigateur (1600 px, une par une pour rester sous la limite de 4,5 Mo de Vercel) puis ré-encodées en WebP ; documents images ré-encodés en JPEG ; les **métadonnées sont effacées** (position GPS, modèle du téléphone). Les PDF sont vérifiés (signature `%PDF-`). Tout est stocké dans MongoDB (GridFS), servi aux seuls membres du dossier, avec un cache privé.
- Code : `src/lib/family-space.ts` (règles d’accès, garde des API), `src/lib/dossier-data.ts` (messagerie, agenda, documents, album, tableau de bord, notifications), `src/lib/password-reset.ts`, `src/lib/dossier-page.ts`, `src/layouts/EspaceLayout.astro`, `src/layouts/AuthLayout.astro`, `src/components/espace/`, `src/models/`, `src/pages/compte/`, `src/pages/api/`.
- Test : `npm run build && npm run test:familles` (105 vérifications : cloisonnement de chaque rubrique et de la cloche, mot de passe oublié et liens de réinitialisation, heure de Paris, absence de script intégré sans nonce dans les 15 pages).

**Essayer en local**

```bash
npm run dev:familles
```

Puis créer le compte de Céline sur `/compte/inscription` avec l’e-mail `celine@test.local`. Les données de test restent dans `.local-db/` (ignoré par Git). Pour faire tourner deux copies du projet en même temps, donner un autre port de base : `DEV_DB_PORT=27037 npm run dev:familles -- --port 4331`.

**Mise en service en ligne**

1. Créer une base gratuite **MongoDB Atlas** (offre M0) en **région UE** (ex. Paris ou Francfort), avec un utilisateur dédié et l’accès réseau autorisé pour Vercel.
2. Sur Vercel, ajouter `MONGODB_URI` (chaîne de connexion Atlas) et `ADMIN_EMAIL` (e-mail de Céline), puis redéployer.
3. Le lien **« Espace familles »** réapparaît alors automatiquement dans le menu.
4. Céline crée son compte sur `/compte/inscription` avec son e-mail, puis ses dossiers et ses invitations.

L’offre gratuite d’Atlas (512 Mo) suffit pour plusieurs milliers de photos, une photo pesant environ 100 à 300 Ko.

**À prévoir côté juridique** : publier des photos des personnes accompagnées, même dans un espace privé, demande leur **accord écrit (droit à l’image)**. Il faut ajouter une clause photos et espace familles au contrat et au consentement, à faire relire par le juriste de la CCI, et le mentionner dans la politique RGPD (données traitées, durée de conservation, droit de suppression).

---

## Sécurité, RGPD Et Indexation

Sécurité :

- headers configurés dans `src/lib/security-headers.ts` ;
- CSP configurable en mode report-only ;
- rate limiting sur le formulaire ;
- stockage MongoDB optionnel ;
- chiffrement optionnel de champs sensibles ;
- **aucun script intégré sans nonce** : `vite.build.assetsInlineLimit: 0` (dans `astro.config.mjs`) force Astro à servir scripts et polices en fichiers séparés, autorisés par la CSP. Sans ce réglage, le formulaire de contact était bloqué en production.

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

Sur Vercel, l’adaptateur Vercel est sélectionné automatiquement par la variable `VERCEL=1`. Un push sur `main` met le site en production ; une autre branche crée seulement un aperçu.

Avant de pousser, vérifier en mode production (CSP active) : `npm run build && npm run start`, puis le formulaire de contact et la console du navigateur. Le serveur de dev n’applique pas la CSP.

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
