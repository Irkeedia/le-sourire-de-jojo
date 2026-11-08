/** Config base de données sans importer mongoose (safe pour pages et middleware). */

/**
 * Lit d'abord la variable au démarrage du serveur (process.env), puis la valeur figée au build.
 * Ainsi le mot de passe de la base n'est pas obligatoirement inscrit dans le code compilé,
 * et un changement de réglage sur Vercel ou sur un serveur Node s'applique sans rebuild.
 */
function runtimeEnv(name: "MONGODB_URI" | "ADMIN_EMAIL"): string | undefined {
  const fromProcess = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return fromProcess?.trim() || import.meta.env[name]?.trim() || undefined;
}

export function getMongoUri(): string | undefined {
  return runtimeEnv("MONGODB_URI");
}

export function isDbConfigured(): boolean {
  return Boolean(getMongoUri());
}

/** E-mail de Céline : seul compte créé sans invitation, avec le rôle administratrice. */
export function getAdminEmail(): string | undefined {
  return runtimeEnv("ADMIN_EMAIL")?.toLowerCase();
}
