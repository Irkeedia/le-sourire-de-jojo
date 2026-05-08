import type { APIRoute } from "astro";
import { contactSchema } from "@/lib/zod-contact";
import { connectDb } from "@/lib/db";
import { ContactMessage } from "@/models/ContactMessage";
import { sendContactNotification } from "@/lib/mail";

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

  const { website: _h, ...store } = data;

  try {
    const mongo = await connectDb();
    if (mongo) {
      await ContactMessage.create(store);
    }
  } catch (e) {
    console.error("MongoDB:", e);
  }

  const notifyTo = import.meta.env.CONTACT_TO_EMAIL;
  if (notifyTo) {
    try {
      await sendContactNotification({
        fromName: store.name,
        fromEmail: store.email,
        to: notifyTo,
        subject: `[Le Sourire de Jojo] ${store.subject}`,
        text: [
          `Nom : ${store.name}`,
          `E-mail : ${store.email}`,
          store.phone ? `Téléphone : ${store.phone}` : null,
          "",
          store.message,
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
