export type SecurityHeaderOptions = {
  /** Nonce CSP pour scripts inline autorisés (sans unsafe-inline). */
  cspNonce?: string;
};

/**
 * En-têtes HTTP de durcissement (complément au reverse proxy / CDN).
 */
export function applySecurityHeaders(
  request: Request,
  headers: Headers,
  options: SecurityHeaderOptions = {},
): void {
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  headers.set("X-Permitted-Cross-Domain-Policies", "none");

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto === "https";
  const hstsExplicitOff =
    import.meta.env.HSTS_ENABLE === "false" || import.meta.env.HSTS_ENABLE === "0";
  const hstsExplicitOn =
    import.meta.env.HSTS_ENABLE === "true" || import.meta.env.HSTS_ENABLE === "1";
  const autoHsts = import.meta.env.PROD && isHttps && !hstsExplicitOff;

  if (autoHsts || hstsExplicitOn) {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  if (import.meta.env.DEV) {
    return;
  }

  const reportUri = import.meta.env.CSP_REPORT_URI?.trim();
  const reportOnly =
    import.meta.env.CSP_REPORT_ONLY === "true" || import.meta.env.CSP_REPORT_ONLY === "1";

  const nonce = options.cspNonce?.trim();
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}'`
    : "script-src 'self' 'unsafe-inline'";

  const fontSrc = "font-src 'self' https://fonts.gstatic.com";
  const styleSrc = "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'";
  const imgSrc = "img-src 'self' data: blob: https:";
  const connectSrc = "connect-src 'self' https://*.upstash.io";
  const frameSrc = "frame-src https://www.google.com https://maps.google.com";
  const frameAncestors = "frame-ancestors 'none'";
  const base = `default-src 'self'; ${scriptSrc}; ${styleSrc}; ${fontSrc}; ${imgSrc}; ${connectSrc}; ${frameSrc}; ${frameAncestors}; base-uri 'self'; form-action 'self'; object-src 'none'`;

  const csp = reportUri ? `${base}; report-uri ${reportUri}` : base;
  const cspHeader = reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";

  headers.set(cspHeader, csp);
}

/** Bloque l’override de chemin Astro (GHSA-mr6q-rp88-fx84) tant qu’Astro 5 + adapter Vercel 8. */
export function hasForbiddenAstroPathHeaders(request: Request): boolean {
  return Boolean(
    request.headers.get("x-astro-path")?.trim() ||
      request.headers.get("x_astro_path")?.trim(),
  );
}
