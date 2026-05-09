# Variables d’environnement

Copier `env.example` vers `.env` à la racine du projet (non versionné).

## Site

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `PUBLIC_SITE_URL` | Fortement conseillé | URL canonique du site (ex. `https://www.exemple.fr`). Utilisée pour canonical SEO et `Astro.site`. |
| `PUBLIC_ALLOW_INDEXING` | Non | Si **`true`** ou **`1`** : le site est **indexable** (pas de `noindex`, `robots.txt` autorise le crawl, JSON-LD présent). Dans tout autre cas (variable absente ou autre valeur) : **`noindex, nofollow`** (meta + en-tête `X-Robots-Tag`), **`robots.txt`** en `Disallow: /`, JSON-LD désactivé — utile avant la mise en ligne publique. |

## Google Maps (carte intégrée)

La carte est **toujours affichée dans une iframe** sur le site (pas de simple lien de redirection).

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `PUBLIC_GOOGLE_MAPS_EMBED_URL` | Non | URL complète du `src` de l’iframe, telle que fournie par Google Maps (**Partager** → **Intégrer une carte**). Si défini, **prioritaire** sur la clé API et sur l’embed sans clé. |
| `PUBLIC_GOOGLE_MAPS_API_KEY` | Non | Clé API **publique** + **Maps Embed API** sur Google Cloud : utilise `embed/v1/place` avec `PUBLIC_GOOGLE_MAPS_EMBED_QUERY` et zoom. |
| `PUBLIC_GOOGLE_MAPS_EMBED_QUERY` | Non | Lieu recherché si pas d’URL personnalisée : utilisé avec la clé API ou avec l’embed « classique » `output=embed` (sans clé). |
| `PUBLIC_GOOGLE_MAPS_EMBED_ZOOM` | Non | Zoom **1** à **20** (défaut **9**) — ignoré si seule `PUBLIC_GOOGLE_MAPS_EMBED_URL` est définie (carte déjà figée dans l’URL). |

## Contact & e-mail

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `CONTACT_TO_EMAIL` | Oui (envoi mail) | Destinataire des messages du formulaire. |
| `SMTP_HOST` | Oui | Serveur SMTP. |
| `SMTP_PORT` | Non | Défaut souvent `587`. |
| `SMTP_SECURE` | Non | `true` pour TLS direct (ex. port 465), selon fournisseur. |
| `SMTP_USER` | Oui | Identifiant SMTP. |
| `SMTP_PASS` | Oui | Mot de passe ou clé d’application. |

## Base de données

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `MONGODB_URI` | Non | Si défini, les messages peuvent être enregistrés en base (voir code API). |

## Sécurité

| Variable | Défaut | Description |
|----------|--------|-------------|
| `HSTS_ENABLE` | désactivé | `true` uniquement derrière HTTPS avec `X-Forwarded-Proto` fiable. |
| `CSP_REPORT_ONLY` | `false` | `true` : CSP en mode rapport uniquement (tests). |
| `CSP_REPORT_URI` | vide | Endpoint de collecte des rapports CSP (optionnel). |
| `CONTACT_RATE_LIMIT` | `12` | Nombre max de POST `/api/contact` par IP par fenêtre. |
| `CONTACT_RATE_WINDOW_MS` | `900000` | Fenêtre en millisecondes (900000 = 15 minutes). |

## Rappels

- Ne jamais committer `.env`.
- En CI/CD, injecter les secrets via les mécanismes du fournisseur (secrets chiffrés, variables masquées).
