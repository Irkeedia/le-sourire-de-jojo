/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
