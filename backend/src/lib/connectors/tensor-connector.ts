/**
 * Tensor Connector — NFT marketplace data
 * Collections, listings, bids, sales, floor, activity
 */
import { BaseConnector } from "../source-registry.js";

export class TensorConnector extends BaseConnector {
  readonly sourceId = "tensor";
  readonly provider = "Tensor";
  readonly type = "marketplace" as const;
  readonly capabilities = ["collections", "listings", "bids", "sales", "floor", "activity"];
  readonly endpoint = "https://api.tensor.trade";

  protected async fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown> {
    switch (capability) {
      case "collections":
        return this.getCollections();
      case "listings":
        if (params?.collection) return this.getListings(params.collection);
        return null;
      case "bids":
        if (params?.collection) return this.getBids(params.collection);
        return null;
      case "sales":
        if (params?.collection) return this.getSales(params.collection);
        return null;
      case "floor":
        if (params?.collection) return this.getFloorPrice(params.collection);
        return null;
      case "activity":
        if (params?.collection) return this.getActivity(params.collection);
        return null;
      default:
        return null;
    }
  }

  private async getCollections(): Promise<unknown> {
    // Tensor API — may require API key for some endpoints
    return this.fetchJson<any>("https://api.tensor.trade/api/v1/collections?limit=20", []);
  }

  private async getListings(collection: string): Promise<unknown> {
    return this.fetchJson<any>(`https://api.tensor.trade/api/v1/collections/${collection}/listings?limit=20`, []);
  }

  private async getBids(collection: string): Promise<unknown> {
    return this.fetchJson<any>(`https://api.tensor.trade/api/v1/collections/${collection}/bids?limit=20`, []);
  }

  private async getSales(collection: string): Promise<unknown> {
    return this.fetchJson<any>(`https://api.tensor.trade/api/v1/collections/${collection}/sales?limit=20`, []);
  }

  private async getFloorPrice(collection: string): Promise<unknown> {
    const data = await this.fetchJson<any>(`https://api.tensor.trade/api/v1/collections/${collection}/stats`, null);
    return data?.floorPrice ?? null;
  }

  private async getActivity(collection: string): Promise<unknown> {
    return this.fetchJson<any>(`https://api.tensor.trade/api/v1/collections/${collection}/activity?limit=20`, []);
  }

  async checkHealth() {
    const start = Date.now();
    try {
      await this.getCollections();
      return {
        sourceId: this.sourceId, status: "healthy" as const,
        checkedAt: new Date().toISOString(), responseTimeMs: Date.now() - start,
      };
    } catch {
      return {
        sourceId: this.sourceId, status: "unavailable" as const,
        checkedAt: new Date().toISOString(), responseTimeMs: Date.now() - start,
        error: "health check failed",
      };
    }
  }
}
