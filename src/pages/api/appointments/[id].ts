import type { APIRoute } from "astro";
import { connectDb } from "@/lib/db";
import { canAccessDossier, guard, isValidId, json } from "@/lib/family-space";
import { Appointment } from "@/models/Appointment";

export const prerender = false;

/** Céline retire une visite de l'agenda. */
export const DELETE: APIRoute = async (ctx) => {
  const denied = await guard(ctx, { write: true, adminOnly: true });
  if (denied) return denied;
  const id = ctx.params.id ?? "";
  if (!isValidId(id)) return json({ ok: false, error: "Visite introuvable." }, 404);

  await connectDb();
  const appointment = await Appointment.findById(id).lean();
  if (!appointment || !(await canAccessDossier(ctx.locals.user, String(appointment.dossierId)))) {
    return json({ ok: false, error: "Visite introuvable." }, 404);
  }
  await Appointment.deleteOne({ _id: id });
  return json({ ok: true });
};
