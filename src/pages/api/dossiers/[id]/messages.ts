import type { APIRoute } from "astro";
import { markMessagesRead } from "@/lib/dossier-data";
import { guard, json, readJson } from "@/lib/family-space";
import { messageSchema } from "@/lib/zod-auth";
import { Message } from "@/models/Message";

export const prerender = false;

/** Écrire dans la messagerie du dossier (Céline ou un proche du dossier). */
export const POST: APIRoute = async (ctx) => {
  const dossierId = ctx.params.id ?? "";
  const denied = await guard(ctx, { write: true, dossierId });
  if (denied) return denied;
  const user = ctx.locals.user!;

  let body: unknown;
  try {
    body = await readJson(ctx.request);
  } catch {
    return json({ ok: false, error: "Corps invalide." }, 400);
  }
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, 422);

  const message = await Message.create({
    dossierId,
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
    text: parsed.data.text,
  });
  // Écrire vaut lecture : ses propres messages ne comptent pas comme « non lus ».
  await markMessagesRead(user.id, dossierId);
  return json({ ok: true, id: String(message._id) }, 201);
};
