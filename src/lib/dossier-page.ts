import type { AstroGlobal } from "astro";
import { isDbConfigured } from "@/lib/db-config";
import { canAccessDossier, isAdmin } from "@/lib/family-space";
import { Dossier } from "@/models/Dossier";

export type DossierPageContext = {
  user: NonNullable<App.Locals["user"]>;
  admin: boolean;
  dossier: { id: string; name: string };
};

/**
 * À appeler en tête de chaque page d'un dossier.
 * Sans accès (ou dossier inexistant) : renvoie une redirection vers l'accueil de l'espace,
 * sans révéler si le dossier existe.
 */
export async function loadDossierPage(Astro: AstroGlobal): Promise<DossierPageContext | Response> {
  const user = Astro.locals.user;
  const id = Astro.params.id ?? "";
  if (!user || !isDbConfigured() || !(await canAccessDossier(user, id))) return Astro.redirect("/compte");
  const dossier = await Dossier.findById(id).lean();
  if (!dossier) return Astro.redirect("/compte");
  return { user, admin: isAdmin(user), dossier: { id, name: dossier.name } };
}
