import type { APIRoute } from "astro";
import { parisToUtc } from "@/lib/dossier-data";
import { guard, json, readJson } from "@/lib/family-space";
import { appointmentSchema } from "@/lib/zod-auth";
import { Appointment } from "@/models/Appointment";

export const prerender = false;

/** Céline ajoute une visite à l'agenda (date et heure de Paris). */
export const POST: APIRoute = async (ctx) => {
  const dossierId = ctx.params.id ?? "";
  const denied = await guard(ctx, { write: true, adminOnly: true, dossierId });
  if (denied) return denied;

  let body: unknown;
  try {
    body = await readJson(ctx.request);
  } catch {
    return json({ ok: false, error: "Corps invalide." }, 400);
  }
  const parsed = appointmentSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, 422);

  const startsAt = parisToUtc(parsed.data.date, parsed.data.time);
  if (Number.isNaN(startsAt.getTime())) return json({ ok: false, errors: { date: ["Date invalide."] } }, 422);

  const appointment = await Appointment.create({
    dossierId,
    startsAt,
    durationMinutes: parsed.data.durationMinutes,
    note: parsed.data.note,
  });
  return json({ ok: true, id: String(appointment._id) }, 201);
};
