import { defineMiddleware } from "astro/middleware";
import { createCspNonce } from "@/lib/csp-nonce";
import { rateLimitAsync } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { applySecurityHeaders, hasForbiddenAstroPathHeaders } from "@/lib/security-headers";

const CONTACT_POST_LIMIT = Number(import.meta.env.CONTACT_RATE_LIMIT ?? "12");
const CONTACT_POST_WINDOW_MS = Number(
  import.meta.env.CONTACT_RATE_WINDOW_MS ?? String(15 * 60 * 1000),
);
const AUTH_POST_LIMIT = Number(import.meta.env.AUTH_RATE_LIMIT ?? "8");
const AUTH_POST_WINDOW_MS = Number(import.meta.env.AUTH_RATE_WINDOW_MS ?? String(15 * 60 * 1000));

const PUBLIC_ACCOUNT_PATHS = new Set(["/compte/connexion", "/compte/inscription"]);

function forbiddenResponse(request: Request, message: string, status = 403) {
  const headers = new Headers({ "Content-Type": "application/json" });
  applySecurityHeaders(request, headers);
  return new Response(JSON.stringify({ ok: false, error: message }), { status, headers });
}

/** Génération Word : plus permissif que le contact, mais borné (fichiers lourds). */
const DOCX_POST_LIMIT = Number(import.meta.env.DOCX_RATE_LIMIT ?? "30");
const DOCX_POST_WINDOW_MS = Number(import.meta.env.DOCX_RATE_WINDOW_MS ?? String(15 * 60 * 1000));

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, cookies, redirect } = context;

  if (hasForbiddenAstroPathHeaders(request)) {
    return forbiddenResponse(request, "Requête refusée.", 403);
  }

  context.locals.cspNonce = createCspNonce();
  context.locals.user = null;
  try {
    const { getSessionUser } = await import("@/lib/auth-session");
    context.locals.user = (await getSessionUser(cookies)) ?? null;
  } catch (e) {
    console.error("Session middleware:", e);
  }

  if (url.pathname.startsWith("/compte")) {
    const isPublic = PUBLIC_ACCOUNT_PATHS.has(url.pathname);
    if (!isPublic && !context.locals.user) {
      const nextPath = encodeURIComponent(url.pathname);
      return redirect(`/compte/connexion?next=${nextPath}`);
    }
    if (isPublic && context.locals.user) {
      return redirect("/compte");
    }
  }

  if (url.pathname === "/api/docx" && request.method === "POST") {
    const ip = getClientIp(request);
    const rl = await rateLimitAsync(`docx:${ip}`, DOCX_POST_LIMIT, DOCX_POST_WINDOW_MS, "docx");
    if (!rl.ok) {
      const headers = new Headers({
        "Content-Type": "application/json",
        "Retry-After": String(rl.retryAfterSec),
      });
      applySecurityHeaders(request, headers, { cspNonce: context.locals.cspNonce });
      return new Response(
        JSON.stringify({ ok: false, error: "Trop de téléchargements. Réessayez plus tard." }),
        { status: 429, headers },
      );
    }
  }

  if (url.pathname.startsWith("/api/auth/") && request.method === "POST") {
    const ip = getClientIp(request);
    const rl = await rateLimitAsync(`auth:${ip}`, AUTH_POST_LIMIT, AUTH_POST_WINDOW_MS, "auth");
    if (!rl.ok) {
      const headers = new Headers({
        "Content-Type": "application/json",
        "Retry-After": String(rl.retryAfterSec),
      });
      applySecurityHeaders(request, headers, { cspNonce: context.locals.cspNonce });
      return new Response(JSON.stringify({ ok: false, error: "Trop de tentatives. Réessayez plus tard." }), {
        status: 429,
        headers,
      });
    }
  }

  if (url.pathname === "/api/contact" && request.method === "POST") {
    const ip = getClientIp(request);
    const rl = await rateLimitAsync(
      `contact:${ip}`,
      CONTACT_POST_LIMIT,
      CONTACT_POST_WINDOW_MS,
      "contact",
    );
    if (!rl.ok) {
      const headers = new Headers({
        "Content-Type": "application/json",
        "Retry-After": String(rl.retryAfterSec),
      });
      applySecurityHeaders(request, headers, { cspNonce: context.locals.cspNonce });
      return new Response(JSON.stringify({ ok: false, error: "Trop de demandes. Réessayez plus tard." }), {
        status: 429,
        headers,
      });
    }
  }

  const response = await next();
  const out = new Headers(response.headers);
  applySecurityHeaders(request, out, { cspNonce: context.locals.cspNonce });

  const allowIndexing =
    import.meta.env.PUBLIC_ALLOW_INDEXING === "true" || import.meta.env.PUBLIC_ALLOW_INDEXING === "1";
  if (!allowIndexing) {
    out.set("X-Robots-Tag", "noindex, nofollow");
  }
  if (url.pathname.startsWith("/compte") || url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/api/carnet")) {
    out.set("X-Robots-Tag", "noindex, nofollow");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: out,
  });
});
