import type { APIRoute } from "astro";
import { allowIndexing, resolveSiteUrl } from "@/lib/seo";

/** Robots dynamique : hors index tant que PUBLIC_ALLOW_INDEXING n’est pas activé. */
export const GET: APIRoute = ({ site, url }) => {
  const siteUrl = resolveSiteUrl(site?.href, url.origin);
  const sitemapUrl = new URL("/sitemap.xml", `${siteUrl}/`).href;

  const body = allowIndexing
    ? `User-agent: *
Allow: /
Disallow: /compte
Disallow: /compte/
Disallow: /imprimer/
Disallow: /presentation

Sitemap: ${sitemapUrl}
`
    : "User-agent: *\nDisallow: /\n# Indexation désactivée — définir PUBLIC_ALLOW_INDEXING=true pour autoriser les crawlers.\n";

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
