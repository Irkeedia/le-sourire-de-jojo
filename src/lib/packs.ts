/** Identifiants stables pour les formules (formulaire + API + base). */
export const PACK_IDS = ["mensuel", "decouverte", "ponctuel", "famille", "sur_mesure"] as const;
export type PackId = (typeof PACK_IDS)[number];

export const PACK_LABELS: Record<PackId, string> = {
  mensuel: "Forfait mensuel",
  decouverte: "Pack découverte",
  ponctuel: "Accompagnement ponctuel",
  famille: "Pack famille & aidants",
  sur_mesure: "Sur-mesure",
};

export function packLabel(id: string): string {
  if (id && id in PACK_LABELS) return PACK_LABELS[id as PackId];
  return id || "—";
}
