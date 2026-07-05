/**
 * Resolves the Postgres connection string for the app at runtime.
 *
 * Accepts a manually-set DATABASE_URL, or the variables auto-injected by
 * Vercel Postgres / Neon. Prefers the pooled URL for normal queries (better
 * for serverless), falling back to any non-pooled URL that's available.
 */
export function resolveDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING;

  if (!url) {
    throw new Error(
      "No database connection string found. Set DATABASE_URL (or connect a Vercel Postgres database).",
    );
  }
  return url;
}
