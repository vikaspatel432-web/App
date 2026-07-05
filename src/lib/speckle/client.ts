import "server-only";

const SERVER_URL = process.env.SPECKLE_SERVER_URL ?? "https://app.speckle.systems";

export class SpeckleApiError extends Error {
  constructor(
    message: string,
    public readonly errors: unknown,
  ) {
    super(message);
    this.name = "SpeckleApiError";
  }
}

/**
 * Server-only GraphQL client for the Speckle API.
 *
 * The token here belongs to a single service/admin Speckle account and must
 * never reach the browser. Every caller of this module is responsible for
 * checking the requesting user's project access (see src/lib/dal.ts) before
 * returning data to the client.
 */
export async function speckleGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const token = process.env.SPECKLE_TOKEN;
  if (!token) {
    throw new SpeckleApiError("SPECKLE_TOKEN environment variable is not set", null);
  }

  const res = await fetch(`${SERVER_URL}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new SpeckleApiError(`Speckle API request failed: ${res.status}`, await res.text());
  }

  const json = await res.json();
  if (json.errors) {
    throw new SpeckleApiError("Speckle API returned errors", json.errors);
  }

  return json.data as T;
}

export const SPECKLE_SERVER_URL = SERVER_URL;
