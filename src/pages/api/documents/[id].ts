import type { APIRoute } from "astro";
import { Readable } from "node:stream";
import { isDbConfigured } from "@/lib/db-config";
import { deleteDocument, findDocument, openDocumentStream } from "@/lib/dossier-data";
import { canAccessDossier, guard, json } from "@/lib/family-space";

export const prerender = false;

/** Télécharger un document : réservé aux personnes qui ont accès au dossier. */
export const GET: APIRoute = async ({ params, locals, url }) => {
  const notFound = () => new Response("Introuvable", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!isDbConfigured() || !locals.user) return notFound();

  const doc = await findDocument(params.id ?? "");
  if (!doc || !(await canAccessDossier(locals.user, doc.dossierId))) return notFound();

  const ext = doc.contentType === "application/pdf" ? "pdf" : "jpg";
  const filename = `${doc.title.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "document"}.${ext}`;
  const disposition = url.searchParams.has("telecharger") ? "attachment" : "inline";
  const stream = Readable.toWeb(openDocumentStream(doc.id) as Readable) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Length": String(doc.length),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, max-age=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

/** Céline retire un document. */
export const DELETE: APIRoute = async (ctx) => {
  const denied = await guard(ctx, { write: true, adminOnly: true });
  if (denied) return denied;
  const doc = await findDocument(ctx.params.id ?? "");
  if (!doc || !(await canAccessDossier(ctx.locals.user, doc.dossierId))) {
    return json({ ok: false, error: "Document introuvable." }, 404);
  }
  await deleteDocument(doc.id);
  return json({ ok: true });
};
