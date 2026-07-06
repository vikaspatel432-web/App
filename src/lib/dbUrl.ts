/**
 * Resolves the Postgres connection string for the app at runtime.
 *
 * Accepts a manually-set DATABASE_URL, the standard variables from Vercel
 * Postgres / Neon, or the same variables under any custom prefix the host
 * applied (e.g. `MYPREFIX_DATABASE_URL`). Prefers a pooled URL for normal
 * queries, which is better for serverless.
 */
export function resolveDatabaseUrl(): string {
  const url =
    directUrl("runtime") ?? prefixedUrl(["_PRISMA_DATABASE_URL", "_POSTGRES_PRISMA_URL", "_DATABASE_URL", "_POSTGRES_URL"]);

  if (!url) {
    throw new Error(
      "No database connection string found. Set DATABASE_URL, or connect a Vercel/Neon Postgres database.",
    );
  }
  return url;
}

/**
 * Same as resolveDatabaseUrl but prefers a direct (non-pooled) connection,
 * which migrations require. Used by prisma.config.ts.
 */
export function resolveMigrationUrl(): string | undefined {
  return (
    directUrl("migration") ??
    prefixedUrl(["_DATABASE_URL_UNPOOLED", "_URL_NON_POOLING", "_DATABASE_URL", "_POSTGRES_URL"])
  );
}

function directUrl(mode: "runtime" | "migration"): string | undefined {
  const env = process.env;
  if (mode === "migration") {
    return (
      env.DATABASE_URL_UNPOOLED ??
      env.POSTGRES_URL_NON_POOLING ??
      env.DATABASE_URL ??
      env.POSTGRES_PRISMA_URL ??
      env.POSTGRES_URL
    );
  }
  return (
    env.DATABASE_URL ??
    env.POSTGRES_PRISMA_URL ??
    env.POSTGRES_URL ??
    env.DATABASE_URL_UNPOOLED ??
    env.POSTGRES_URL_NON_POOLING
  );
}

/** Finds an env var whose name ends with one of the given suffixes (matches prefixed host vars). */
function prefixedUrl(suffixes: string[]): string | undefined {
  const env = process.env;
  for (const suffix of suffixes) {
    const key = Object.keys(env).find((k) => k.endsWith(suffix) && env[k]);
    if (key) return env[key];
  }
  return undefined;
}
