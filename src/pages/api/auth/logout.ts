import type { APIRoute } from "astro";
import { destroyUserSession } from "@/lib/auth-session";

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  await destroyUserSession(cookies);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
