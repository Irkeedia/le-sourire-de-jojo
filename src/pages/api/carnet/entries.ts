import type { APIRoute } from "astro";
import { connectDb, getMongoUri } from "@/lib/db";
import { carnetEntrySchema } from "@/lib/zod-auth";
import { CarnetEntry } from "@/models/CarnetEntry";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  if (!getMongoUri()) {
    return json({ ok: false, error: "Base de données non configurée." }, 503);
  }
  if (!locals.user) {
    return json({ ok: false, error: "Non connecté." }, 401);
  }

  try {
    await connectDb();
    const entries = await CarnetEntry.find({ userId: locals.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return json({
      ok: true,
      entries: entries.map((e) => ({
        id: String(e._id),
        title: e.title,
        content: e.content,
        createdAt: e.createdAt,
      })),
    });
  } catch (e) {
    console.error("Carnet GET:", e);
    return json({ ok: false, error: "Lecture impossible." }, 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!getMongoUri()) {
    return json({ ok: false, error: "Base de données non configurée." }, 503);
  }
  if (!locals.user) {
    return json({ ok: false, error: "Non connecté." }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Corps invalide." }, 400);
  }

  const parsed = carnetEntrySchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, 422);
  }

  try {
    await connectDb();
    const entry = await CarnetEntry.create({
      userId: locals.user.id,
      title: parsed.data.title,
      content: parsed.data.content,
    });

    return json({
      ok: true,
      entry: {
        id: String(entry._id),
        title: entry.title,
        content: entry.content,
        createdAt: entry.createdAt,
      },
    });
  } catch (e) {
    console.error("Carnet POST:", e);
    return json({ ok: false, error: "Enregistrement impossible." }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
