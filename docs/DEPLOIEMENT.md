# Déploiement — Le Sourire de Jojo

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
