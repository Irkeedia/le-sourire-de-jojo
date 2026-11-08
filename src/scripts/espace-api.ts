/** Petits outils partagés par les pages de l'espace familles (côté navigateur). */

export type ApiResult = { ok: boolean; status: number; data: { error?: string; errors?: Record<string, string[]>; [k: string]: unknown } };

/**
 * Envoie du JSON. Toujours un corps, même pour une suppression : sans « Content-Type »,
 * la protection checkOrigin d'Astro peut refuser la requête à tort.
 */
export async function sendJson(url: string, body: unknown = {}, method = "POST"): Promise<ApiResult> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).catch(() => null);
  const data = res ? await res.json().catch(() => ({})) : { error: "Pas de connexion internet." };
  return { ok: Boolean(res?.ok), status: res?.status ?? 0, data };
}

export function firstError(data: ApiResult["data"], fallback: string): string {
  return data.error ?? Object.values(data.errors ?? {})[0]?.[0] ?? fallback;
}

/** Bouton « Supprimer » : confirmation, appel DELETE, puis rechargement de la page. */
export function wireDeleteButtons(selector: string, endpoint: (id: string) => string, question: string) {
  document.querySelectorAll<HTMLButtonElement>(selector).forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm(btn.dataset.confirm ?? question)) return;
      btn.disabled = true;
      const { ok, data } = await sendJson(endpoint(btn.dataset.id ?? ""), {}, "DELETE");
      if (ok) window.location.reload();
      else {
        btn.disabled = false;
        alert(firstError(data, "Suppression impossible."));
      }
    });
  });
}
