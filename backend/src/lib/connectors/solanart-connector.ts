/**
 * Solanart Connector — NFT marketplace data
 *
 * Capabilities: collections, sales, listings
 *
 * Solanart uses a public API at https://qzlsklfacc.median.cloud
 * No API key required for basic collection/sales data.
 *
 * Source IDs: solanart-api → solanart
 */
import { BaseConnector } from "../source-registry.js";
import type { SourceHealthCheck } from "../ecosystem-types.js";

const SOLANART_API = "https://qzlsklfacc.median.cloud";

export class SolanartConnector extends BaseConnector {
  readonly sourceId = "solanart";
  readonly provider = "Solanart";
  readonly type = "marketplace" as const;
  readonly capabilities = ["collections", "sales", "listings"];
  readonly endpoint = SOLANART_API;
  readonly auth = "none" as const;
  protected timeoutMs = 10000;

  protected async fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown> {
    switch (capability) {
      case "collections":
        return this.getCollections();
      case "sales":
        if (params?.collection) return this.getSales(params.collection);
        return this.getRecentSales();
      case "listings":
        if (params?.collection) return this.getListings(params.collection);
        return null;
      default:
        return null;
    }
  }

  private async getCollections(): Promise<unknown> {
    // Solanart collections endpoint
    const url = `${SOLANART_API}/collections`;
    const data = await this.fetchJson<unknown[]>(url, []);
    return data;
  }

  private async getRecentSales(): Promise<unknown> {
    const url = `${SOLANART_API}/trades`;
    const data = await this.fetchJson<unknown[]>(url, []);
    return data;
  }

  private async getSales(collection: string): Promise<unknown> {
    const url = `${SOLANART_API}/trades?collection=${encodeURIComponent(collection)}`;
    const data = await this.fetchJson<unknown[]>(url, []);
    return data;
  }

  private async getListings(collection: string): Promise<unknown> {
    const url = `${SOLANART_API}/listings?collection=${encodeURIComponent(collection)}`;
    const data = await this.fetchJson<unknown[]>(url, []);
    return data;
  }

  async checkHealth(): Promise<SourceHealthCheck> {
    const start = Date.now();
    try {
      const data = await this.getCollections();
      if (Array.isArray(data) || (data !== null && data !== undefined)) {
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
        error: "API returned empty",
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
