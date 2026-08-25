import type { APIRoute } from "astro";
import { buildDocx, docxPayloadSchema, safeFilename } from "@/lib/docx-document";

export const prerender = false;

/** Le contrat signé embarque deux images PNG : on prévoit large, sans excès. */
const MAX_BODY_BYTES = 4 * 1024 * 1024;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const len = request.headers.get("content-length");
  if (len && Number(len) > MAX_BODY_BYTES) {
    return jsonError("Document trop volumineux.", 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Corps invalide.", 400);
  }

  const parsed = docxPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Document illisible.", 422);
  }

  let buffer: Buffer;
  try {
    buffer = await buildDocx(parsed.data);
  } catch (error) {
    console.error("[api/docx] échec de génération", error);
    return jsonError("Génération du fichier Word impossible.", 500);
  }

  const filename = `${safeFilename(parsed.data.filename)}.docx`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": DOCX_MIME,
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
};
