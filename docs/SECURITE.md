# Cybersécurité — Le Sourire de Jojo

Ce document décrit les mesures mises en œuvre dans le code, celles à configurer sur l’infra, et la démarche en cas d’incident.

## 1. Mesures implémentées dans l’application

### 1.1 Middleware HTTP (`src/middleware.ts`)

Sur **toutes** les réponses, ajout d’en-têtes de durcissement (via `src/lib/security-headers.ts`) :

| En-tête | Rôle |
|---------|------|
| `X-Frame-Options: DENY` | Réduit le risque de clickjacking (pas d’iframe du site). |
| `X-Content-Type-Options: nosniff` | Limite le MIME-sniffing. |
| `Referrer-Policy: strict-origin-when-cross-origin` | Contrôle les fuites d’URL vers des tiers. |
| `Permissions-Policy` | Désactive par défaut caméra, micro, géoloc. etc. |
| **CSP** (`Content-Security-Policy`) | En **production** uniquement (`astro build` / `preview`), pas pendant `astro dev` pour ne pas bloquer le flux de dev. Inclut `script-src 'unsafe-inline'` car le site utilise des scripts inline (menu, formulaire). Pour durcir : externaliser ces scripts et retirer `unsafe-inline`. Inclut `frame-src https://www.google.com https://maps.google.com` pour les iframes **Google Maps** (carte intégrée). |
| **HSTS** | Optionnel via `HSTS_ENABLE=true` **uniquement** si le site est réellement servi en **HTTPS** et si le proxy envoie `X-Forwarded-Proto: https`. Sinon risque de comportements incorrects. |

Paramètres optionnels :

- `CSP_REPORT_URI` : URI de collecte des rapports CSP.
- `CSP_REPORT_ONLY=true` : politique en mode « rapport seulement » (recommandé pour tester avant d’appliquer la CSP en dur).

### 1.2 Formulaire de contact (`POST /api/contact`)

| Mesure | Détail |
|--------|--------|
| **Validation** | Schéma **Zod** (`src/lib/zod-contact.ts`) : types, longueurs max, format e-mail. |
| **Anti-bot léger** | Champ honeypot `website` : si rempli, réponse « succès » sans traitement (réduit le bruit sans révéler la logique aux bots simples). |
| **Limite de taille** | Corps JSON refusé au-delà de **64 Ko** (`413`). |
| **Rate limiting** | Par adresse IP dérivée de `X-Forwarded-For` / `X-Real-Ip` (`src/lib/request-ip.ts`). Défaut : **12** requêtes par **15 minutes** par IP (`CONTACT_RATE_LIMIT`, `CONTACT_RATE_WINDOW_MS`). Réponse **429** avec `Retry-After`. |

**Limites connues** : le compteur est **en mémoire** dans le process Node. Il est réinitialisé au redémarrage et n’est pas partagé entre plusieurs instances (Kubernetes, plusieurs VM). En multi-instance : utiliser un **reverse proxy** (Traefik, nginx, Cloudflare) avec rate limit, ou **Redis**, ou un **WAF** managé.

### 1.3 Secrets et transport

- Les mots de passe SMTP et URI MongoDB ne doivent **jamais** être commités : uniquement dans `.env` (voir `.gitignore`).
- Préférer **SMTP TLS** (`SMTP_SECURE` selon fournisseur) et secrets injectés par l’orchestrateur (Kubernetes Secrets, variables chiffrées hébergeur).

### 1.4 Dépendances

Exécuter régulièrement :

```bash
npm audit
```

Corriger les vulnérabilités **high/critical** en priorité ; évaluer le risque pour les niveaux inférieurs (fausses pistes fréquentes).

---

## 2. Sécurité côté infrastructure (à faire hors du repo)

| Sujet | Recommandation |
|-------|----------------|
| **HTTPS** | Certificat TLS (Let’s Encrypt, CDN). Redirection HTTP → HTTPS. |
| **Proxy** | Configurer correctement **X-Forwarded-For** et **X-Forwarded-Proto** pour que l’IP client et le schéma HTTPS soient fiables (réseau de confiance uniquement). |
| **Pare-feu** | Limiter les ports exposés ; SSH par clé ; pas d’admin DB exposée sur Internet. |
| **MongoDB** | Auth forte, réseau privé, pas d’instance ouverte `0.0.0.0` sans auth. |
| **Sauvegardes** | Plan de sauvegarde et test de restauration pour MongoDB si utilisé. |
| **Journalisation** | Conserver les logs d’accès et d’erreur serveur pour investigations. |

---

## 3. RGPD et données du formulaire

Résumé opérationnel : voir [RGPD.md](RGPD.md).  
Les données transmises par le formulaire servent à **répondre à la demande** ; pas de finalité marketing sans consentement distinct.

---

## 4. Signalement de vulnérabilité

Voir [SECURITY.md](../SECURITY.md) à la racine du dépôt (contact responsable et démarche).

---

## 5. Checklist avant mise en ligne

- [ ] `.env` production renseigné, secrets hors Git  
- [ ] HTTPS actif + redirection  
- [ ] Proxy : en-têtes forwarded corrects  
- [ ] `PUBLIC_SITE_URL` en **https**  
- [ ] SMTP fonctionnel et test du formulaire  
- [ ] `HSTS_ENABLE` activé seulement si HTTPS réel  
- [ ] Tester CSP avec `CSP_REPORT_ONLY=true` si doute  
- [ ] `npm audit` traité dans la mesure du raisonnable  

---

*Document à jour avec la structure du dépôt au moment de la rédaction ; adapter après évolutions du code.*
