# Déploiement — Le Sourire de Jojo

## Vercel

Ce dépôt utilise le SSR Astro avec **deux adaptateurs** selon l’environnement :

- **Sur Vercel** (`VERCEL=1`, défini automatiquement par la plateforme) : **`@astrojs/vercel`** — les routes et l’API sont servies comme attendu. Sans cet adaptateur, un déploiement « Node standalone » sur Vercel provoque souvent une erreur **`404 NOT_FOUND`** sur toutes les URLs.
- **Ailleurs** (VPS, Docker, etc.) : **`@astrojs/node`** en mode `standalone`, puis `npm run start`.

Sur Vercel : connecter le dépôt Git, laisser la **commande de build** par défaut (`npm run build`), le **répertoire de sortie** est géré par l’adaptateur. Définir les variables d’environnement (voir ci-dessous) dans le tableau *Settings → Environment Variables*.

**MongoDB** : en serverless, privilégier une connexion réutilisée (pool) et des timeouts adaptés ; le premier appel après inactivité peut être plus lent (cold start).

## Build

```bash
npm ci
npm run build
```

Sortie : répertoire `dist/` avec un serveur Node **standalone** (`node ./dist/server/entry.mjs` ou commande `npm run start` selon `package.json`).

## Variables d’environnement

En production, injecter les variables décrites dans [ENVIRONNEMENT.md](ENVIRONNEMENT.md) (fichier `.env` sur le serveur ou variables du PaaS).

Indispensables pour un formulaire fonctionnel :

- `PUBLIC_SITE_URL` (URL HTTPS publique)
- `CONTACT_TO_EMAIL`
- Paramètres SMTP complets

Optionnel : `MONGODB_URI` si vous enregistrez les messages.

## Reverse proxy (recommandé)

Placer **nginx**, **Caddy**, **Traefik** ou un équivalent CDN devant Node :

- Terminaison TLS (HTTPS)
- En-têtes :
  - `X-Forwarded-For` (chaîne d’IPs clients)
  - `X-Forwarded-Proto: https`
- Rate limiting global / anti-DDoS léger en complément de l’app

Sans proxy correct, `getClientIp()` et HSTS peuvent se comporter de façon inattendue.

## Process manager

Utiliser **systemd**, **PM2**, **Docker** ou l’offre managée du cloud pour :

- redémarrage automatique en cas de crash
- logs centralisés
- variables d’environnement sécurisées

## Santé et surveillance

- Vérifier les logs applicatifs après déploiement
- Tester le formulaire de contact en conditions réelles
- Surveiller l’espace disque (logs, sessions Astro Node si activées)

## Mises à jour

```bash
npm outdated
npm audit
```

Planifier les mises à jour de dépendances et rebuild réguliers.
