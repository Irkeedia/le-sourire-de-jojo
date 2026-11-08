/** Formulaires des pages d'accès : envoi JSON, erreurs sous les champs, message d'état. */
import { sendJson, type ApiResult } from "@/scripts/espace-api";

function showErrors(form: HTMLFormElement, errors: Record<string, string[] | undefined> = {}) {
  form.querySelectorAll<HTMLElement>("[data-error-for]").forEach((el) => {
    el.classList.add("hidden");
    el.textContent = "";
  });
  for (const [key, msgs] of Object.entries(errors)) {
    const target = form.querySelector<HTMLElement>(`[data-error-for="${key}"]`);
    if (target && msgs?.[0]) {
      target.classList.remove("hidden");
      target.textContent = msgs[0];
    }
  }
}

export function wireAuthForm(options: {
  formId: string;
  endpoint: string;
  pending: string;
  body: (fd: FormData, form: HTMLFormElement) => Record<string, unknown>;
  onSuccess: (result: ApiResult, form: HTMLFormElement) => void;
  fallbackError: string;
}) {
  const form = document.getElementById(options.formId) as HTMLFormElement | null;
  const status = form?.querySelector<HTMLElement>("[data-status]");
  const submit = form?.querySelector<HTMLButtonElement>("button[type=submit]");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!status || !submit) return;
    status.textContent = options.pending;
    submit.disabled = true;
    const result = await sendJson(options.endpoint, options.body(new FormData(form), form));
    if (result.ok) {
      options.onSuccess(result, form);
      return;
    }
    submit.disabled = false;
    showErrors(form, result.data.errors);
    status.textContent = result.data.error ?? (result.data.errors ? "Vérifiez les champs en rouge." : options.fallbackError);
  });
}
