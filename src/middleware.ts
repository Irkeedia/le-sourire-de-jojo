import { defineMiddleware } from "astro/middleware";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { applySecurityHeaders } from "@/lib/security-headers";

const CONTACT_POST_LIMIT = Number(import.meta.env.CONTACT_RATE_LIMIT ?? "12");
const CONTACT_POST_WINDOW_MS = Number(
  import.meta.env.CONTACT_RATE_WINDOW_MS ?? String(15 * 60 * 1000),
);

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;

  if (url.pathname === "/api/contact" && request.method === "POST") {
    const ip = getClientIp(request);
    const rl = rateLimit(`contact:${ip}`, CONTACT_POST_LIMIT, CONTACT_POST_WINDOW_MS);
    if (!rl.ok) {
      const headers = new Headers({
        "Content-Type": "application/json",
        "Retry-After": String(rl.retryAfterSec),
      });
      applySecurityHeaders(request, headers);
      return new Response(JSON.stringify({ ok: false, error: "Trop de demandes. Réessayez plus tard." }), {
        status: 429,
        headers,
      });
    }
  }

  const response = await next();
  const out = new Headers(response.headers);
  applySecurityHeaders(request, out);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: out,
  });
});
