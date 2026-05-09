import type { APIRoute } from "astro";

const allowIndexing =
  import.meta.env.PUBLIC_ALLOW_INDEXING === "true" || import.meta.env.PUBLIC_ALLOW_INDEXING === "1";

/** Robots dynamique : hors index tant que PUBLIC_ALLOW_INDEXING n’est pas activé. */
export const GET: APIRoute = () => {
  const body = allowIndexing
    ? "User-agent: *\nAllow: /\n"
    : "User-agent: *\nDisallow: /\n# Indexation désactivée — définir PUBLIC_ALLOW_INDEXING=true pour autoriser les crawlers.\n";

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
