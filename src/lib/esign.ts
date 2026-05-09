/**
 * Point d’extension pour une signature électronique qualifiée (Yousign, HelloSign, etc.).
 * Une intégration complète impose : compte marchand, webhooks, identification du signataire,
 * conservation probante — à mettre en œuvre avec votre prestataire et votre conseil juridique.
 */
export type EsignProvider = "yousign" | "hellosign" | "none";

export function esignConfigured(): boolean {
  return Boolean(process.env.YOUSIGN_API_KEY?.trim() || process.env.HELLOSIGN_API_KEY?.trim());
}

/** Placeholder : déclencher une procédure de signature pour un PDF — à implémenter selon l’API choisie. */
export async function initiateConsentSignatureFlow(): Promise<{ ok: false; reason: string }> {
  return {
    ok: false,
    reason:
      "Signature électronique non branchée : renseigner YOUSIGN_API_KEY (ou équivalent) et implémenter le flux métier (voir docs).",
  };
}
