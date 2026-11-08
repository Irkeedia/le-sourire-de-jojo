import type { APIRoute } from "astro";
import { Readable } from "node:stream";
import { canAccessDossier, findPhoto, openPhotoStream } from "@/lib/family-space";
import { isDbConfigured } from "@/lib/db-config";

export const prerender = false;

/** Sert une photo uniquement aux personnes qui ont accès à son dossier. */
export const GET: APIRoute = async ({ params, locals }) => {
  const notFound = () => new Response("Introuvable", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!isDbConfigured() || !locals.user) return notFound();

  const photo = await findPhoto(params.id ?? "");
  if (!photo || !(await canAccessDossier(locals.user, photo.dossierId))) return notFound();

  const stream = Readable.toWeb(openPhotoStream(params.id!) as Readable) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(photo.length),
      // Privé : jamais mis en cache par un proxy ou un CDN partagé.
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
