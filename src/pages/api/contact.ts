import type { APIRoute } from "astro";
import { contactSchema } from "@/lib/zod-contact";
import { connectDb } from "@/lib/db";
import { ContactMessage } from "@/models/ContactMessage";
import { sendContactNotification } from "@/lib/mail";
import { packLabel } from "@/lib/packs";
import {
  audienceLabel,
  creneauLabel,
  horizonLabel,
  relationLabel,
  zoneLabel,
} from "@/lib/contact-form-options";
import { encryptAtRest, parseEncryptionKeyFromBase64 } from "@/lib/crypto-at-rest";

export const prerender = false;

const MAX_BODY_BYTES = 65536;

export const POST: APIRoute = async ({ request }) => {
  const len = request.headers.get("content-length");
  if (len && Number(len) > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ ok: false, error: "Message trop volumineux." }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Corps invalide." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    return new Response(JSON.stringify({ ok: false, errors: msg }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = parsed.data;
  if (data.website && data.website.length > 0) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    website: _h,
    emergency_protocol_acknowledged: _ack,
    medical_cert_date: medRaw,
    deglutition_risk_alert: alertPlain,
    ...rest
  } = data;

  const confirmedAt = new Date();
  const encKey = parseEncryptionKeyFromBase64(import.meta.env.ENCRYPTION_KEY);
  const alertTrimmed = alertPlain?.trim() || undefined;

  const mongoPayload = {
    ...rest,
    medical_cert_date:
      medRaw && medRaw.trim() !== ""
        ? new Date(`${medRaw.trim()}T12:00:00.000Z`)
        : undefined,
    emergency_protocol_confirmed: confirmedAt,
    deglutition_risk_alert: encryptAtRest(alertTrimmed, encKey),
  };

  try {
    const mongo = await connectDb();
    if (mongo) {
      await ContactMessage.create(mongoPayload);
    }
  } catch (e) {
    console.error("MongoDB:", e);
  }

  const notifyTo = import.meta.env.CONTACT_TO_EMAIL;
  if (notifyTo) {
    try {
      await sendContactNotification({
        fromName: mongoPayload.name,
        fromEmail: mongoPayload.email,
        to: notifyTo,
        subject: `[Le Sourire de Jojo] ${mongoPayload.subject}`,
        text: [
          `Nom : ${mongoPayload.name}`,
          `E-mail : ${mongoPayload.email}`,
          mongoPayload.phone ? `Téléphone : ${mongoPayload.phone}` : null,
          "",
          `Capacité juridique (art. 1145 et s. C. civ.) : confirmée`,
          `Protocole d’urgence accepté : ${confirmedAt.toISOString()} (réception serveur)`,
          medRaw && medRaw.trim() !== ""
            ? `Certificat médical aptitudes loisirs (facultatif) : ${medRaw.trim()}`
            : null,
          alertTrimmed ? `Alertes déglutition / régime alimentaire : ${alertTrimmed}` : null,
          "",
          mongoPayload.audience ? `Public concerné : ${audienceLabel(mongoPayload.audience)}` : null,
          mongoPayload.relation ? `Vous contactez en tant que : ${relationLabel(mongoPayload.relation)}` : null,
          mongoPayload.zone ? `Zone géographique : ${zoneLabel(mongoPayload.zone)}` : null,
          mongoPayload.zone_detail ? `Précision lieu : ${mongoPayload.zone_detail}` : null,
          mongoPayload.creneau ? `Créneau souhaité : ${creneauLabel(mongoPayload.creneau)}` : null,
          mongoPayload.horizon ? `Délai / urgence : ${horizonLabel(mongoPayload.horizon)}` : null,
          mongoPayload.pack ? `Formule / pack : ${packLabel(mongoPayload.pack)}` : null,
          "",
          `— Message —`,
          mongoPayload.message,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    } catch (e) {
      console.error("Mail:", e);
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Impossible d’envoyer le message pour le moment. Réessayez plus tard ou appelez-nous.",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
