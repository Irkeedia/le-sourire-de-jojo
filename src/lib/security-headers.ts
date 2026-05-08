/**
 * En-têtes HTTP de durcissement (complément au reverse proxy / CDN).
 */
export function applySecurityHeaders(request: Request, headers: Headers): void {
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto === "https";
  const forceHsts = import.meta.env.HSTS_ENABLE === "true" || import.meta.env.HSTS_ENABLE === "1";

  if (isHttps && forceHsts) {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  if (import.meta.env.DEV) {
    return;
  }

  const reportUri = import.meta.env.CSP_REPORT_URI?.trim();
  const reportOnly = import.meta.env.CSP_REPORT_ONLY === "true" || import.meta.env.CSP_REPORT_ONLY === "1";

  const fontSrc = "font-src 'self' https://fonts.gstatic.com";
  const styleSrc = "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'";
  const imgSrc = "img-src 'self' data: blob: https:";
  const scriptSrc = "script-src 'self' 'unsafe-inline'";
  const connectSrc = "connect-src 'self'";
  const frameAncestors = "frame-ancestors 'none'";
  const base = `default-src 'self'; ${scriptSrc}; ${styleSrc}; ${fontSrc}; ${imgSrc}; ${connectSrc}; ${frameAncestors}; base-uri 'self'; form-action 'self'`;

  const csp = reportUri ? `${base}; report-uri ${reportUri}` : base;
  const cspHeader = reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";

  headers.set(cspHeader, csp);
}
