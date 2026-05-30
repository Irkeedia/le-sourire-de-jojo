import type { APIRoute } from "astro";
import { allowIndexing, resolveSiteUrl, SITEMAP_ROUTES } from "@/lib/seo";

export const GET: APIRoute = ({ site, url }) => {
  if (!allowIndexing) {
    return new Response("Not found", { status: 404 });
  }

  const siteUrl = resolveSiteUrl(site?.href, url.origin);
  const lastmod = new Date().toISOString().slice(0, 10);

  const urls = SITEMAP_ROUTES.map(
    (route) => `  <url>
    <loc>${new URL(route.path, `${siteUrl}/`).href}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(2)}</priority>
  </url>`,
  ).join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
