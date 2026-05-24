/** Config base de données sans importer mongoose (safe pour pages et middleware). */
export function getMongoUri(): string | undefined {
  return import.meta.env.MONGODB_URI;
}

export function isDbConfigured(): boolean {
  return Boolean(getMongoUri()?.trim());
}
