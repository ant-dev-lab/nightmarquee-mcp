import { apiGet, type Catalog, type Session } from "./api.js";

const TTL_MS = 5 * 60 * 1000;

let cache: { at: number; data: Catalog } | null = null;

/** Catalog with a short in-memory TTL, so a long session stays current. */
export async function getCatalog(session: Session): Promise<Catalog> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const data = await apiGet<Catalog>("/api/mcp/catalog", session);
  cache = { at: Date.now(), data };
  return data;
}

/** Test seam. */
export function resetCatalogCache(): void {
  cache = null;
}
