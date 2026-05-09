/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  /** Si "true" / "1" : autorise l’indexation (meta robots, robots.txt, JSON-LD). Sinon : noindex. */
  readonly PUBLIC_ALLOW_INDEXING?: string;
  /** URL complète d’iframe (Partager → Intégrer une carte), prioritaire sur clé API. */
  readonly PUBLIC_GOOGLE_MAPS_EMBED_URL?: string;
  /** Clé publique Google Maps (Embed API) pour l’iframe carte. */
  readonly PUBLIC_GOOGLE_MAPS_API_KEY?: string;
  /** Requête lieu affichée sur la carte (ex. ville, adresse). */
  readonly PUBLIC_GOOGLE_MAPS_EMBED_QUERY?: string;
  /** Zoom carte 1–20 (optionnel). */
  readonly PUBLIC_GOOGLE_MAPS_EMBED_ZOOM?: string;
  readonly CONTACT_TO_EMAIL?: string;
  readonly SMTP_HOST?: string;
  readonly SMTP_PORT?: string;
  readonly SMTP_SECURE?: string;
  readonly SMTP_USER?: string;
  readonly SMTP_PASS?: string;
  readonly MONGODB_URI?: string;
  /** Active HSTS (HTTPS uniquement, derrière proxy qui envoie X-Forwarded-Proto). */
  readonly HSTS_ENABLE?: string;
  /** URI de rapport CSP (optionnel). */
  readonly CSP_REPORT_URI?: string;
  /** Si "true", CSP en mode report-only. */
  readonly CSP_REPORT_ONLY?: string;
  /** Max requêtes POST /api/contact par fenêtre (défaut 12). */
  readonly CONTACT_RATE_LIMIT?: string;
  /** Fenêtre rate-limit en ms (défaut 900000 = 15 min). */
  readonly CONTACT_RATE_WINDOW_MS?: string;
  /** Base64 de 32 octets — chiffrement AES-256-GCM des champs sensibles en base (optionnel). */
  readonly ENCRYPTION_KEY?: string;
  /** Intégration future signature électronique (ex. Yousign). */
  readonly YOUSIGN_API_KEY?: string;
  readonly HELLOSIGN_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
