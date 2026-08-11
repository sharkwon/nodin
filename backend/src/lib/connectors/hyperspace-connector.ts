/**
 * Hyperspace Connector — NFT marketplace data
 *
 * Capabilities: collections, listings, trades, floor
 *
 * Hyperspace provides an API at https://api.hyperspace.xyz/v1
 * However, this API requires an API key for most endpoints.
 * Without a key, the connector will report "unavailable" and return null.
 *
 * Source IDs: hyperspace-api → hyperspace
 */
import { BaseConnector } from "../source-registry.js";
import type { SourceHealthCheck } from "../ecosystem-types.js";

const HYPERSPACE_API_KEY = process.env.HYPERSPACE_API_KEY ?? "";
const HYPERSPACE_API = "https://api.hyperspace.xyz/v1";

export class HyperspaceConnector extends BaseConnector {
  readonly sourceId = "hyperspace";
  readonly provider = "Hyperspace";
  readonly type = "marketplace" as const;
  readonly capabilities = ["collections", "listings", "trades", "floor"];
  readonly endpoint = HYPERSPACE_API;
  readonly auth = "api_key" as const;
  protected timeoutMs = 10000;

  protected async fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown> {
    if (!HYPERSPACE_API_KEY) return null;

    switch (capability) {
      case "collections":
        return this.getCollections();
      case "floor":
        if (params?.collection) return this.getFloorPrice(params.collection);
        return null;
      case "listings":
        if (params?.collection) return this.getListings(params.collection);
        return null;
      case "trades":
        if (params?.collection) return this.getTrades(params.collection);
        return null;
      default:
        return null;
    }
  }

  private async getCollections(): Promise<unknown> {
    const url = `${HYPERSPACE_API}/getCollections?limit=10`;
    const headers: Record<string, string> = {};
    if (HYPERSPACE_API_KEY) headers["Authorization"] = `Bearer ${HYPERSPACE_API_KEY}`;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
      const res = await fetch(url, { signal: ctrl.signal, headers });
      clearTimeout(t);
      if (!res.ok) return [];
      const data = await res.json() as { collections?: unknown[] };
      return data.collections ?? [];
    } catch {
      return [];
    }
  }

  private async getFloorPrice(collection: string): Promise<number | null> {
    const url = `${HYPERSPACE_API}/getCollectionFloor?collection=${encodeURIComponent(collection)}`;
    const data = await this.fetchJson<{ floor_price?: number }>(url, {});
    return data.floor_price ?? null;
  }

  private async getListings(collection: string): Promise<unknown> {
    const url = `${HYPERSPACE_API}/getListings?collection=${encodeURIComponent(collection)}&limit=20`;
    return this.fetchJson<unknown[]>(url, []);
  }

  private async getTrades(collection: string): Promise<unknown> {
    const url = `${HYPERSPACE_API}/getTrades?collection=${encodeURIComponent(collection)}&limit=20`;
    return this.fetchJson<unknown[]>(url, []);
  }

  async checkHealth(): Promise<SourceHealthCheck> {
    const start = Date.now();
    if (!HYPERSPACE_API_KEY) {
      return {
        sourceId: this.sourceId,
        status: "unavailable",
        checkedAt: new Date().toISOString(),
        responseTimeMs: 0,
        error: "no API key configured",
      };
    }
    try {
      const result = await this.getCollections();
      if (Array.isArray(result)) {
        return {
          sourceId: this.sourceId,
          status: "healthy",
          checkedAt: new Date().toISOString(),
          responseTimeMs: Date.now() - start,
        };
      }
      return {
        sourceId: this.sourceId,
        status: "unavailable",
        checkedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
        error: "API returned non-array",
      };
    } catch {
      return {
        sourceId: this.sourceId,
        status: "unavailable",
        checkedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
        error: "health check failed",
      };
    }
  }
}
