/**
 * Magic Eden Connector — NFT marketplace data
 * Collections, listings, bids, sales, floor prices, events, metadata
 */
import { BaseConnector } from "../source-registry.js";

export class MagicEdenConnector extends BaseConnector {
  readonly sourceId = "magic-eden";
  readonly provider = "Magic Eden";
  readonly type = "marketplace" as const;
  readonly capabilities = ["collections", "listings", "bids", "sales", "floor_price", "metadata", "events"];
  readonly endpoint = "https://api-mainnet.magiceden.dev/v2";

  protected async fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown> {
    switch (capability) {
      case "collections":
        return this.getCollections(params?.limit);
      case "listings":
        if (params?.collection) return this.getListings(params.collection, params?.limit);
        return null;
      case "bids":
        if (params?.collection) return this.getBids(params.collection, params?.limit);
        return null;
      case "sales":
        if (params?.collection) return this.getSales(params.collection, params?.limit);
        return null;
      case "floor_price":
        if (params?.collection) return this.getFloorPrice(params.collection);
        return null;
      case "metadata":
        if (params?.collection) return this.getCollectionMetadata(params.collection);
        return null;
      case "events":
        if (params?.collection) return this.getEvents(params.collection, params?.limit);
        return null;
      default:
        return null;
    }
  }

  private async getCollections(limit?: string): Promise<unknown> {
    const l = limit || "20";
    return this.fetchJson<any>(`https://api-mainnet.magiceden.dev/v2/collections?limit=${l}`, []);
  }

  private async getListings(collection: string, limit?: string): Promise<unknown> {
    const l = limit || "20";
    return this.fetchJson<any>(`https://api-mainnet.magiceden.dev/v2/collections/${collection}/listings?limit=${l}`, []);
  }

  private async getBids(collection: string, limit?: string): Promise<unknown> {
    const l = limit || "20";
    return this.fetchJson<any>(`https://api-mainnet.magiceden.dev/v2/collections/${collection}/bids?limit=${l}`, []);
  }

  private async getSales(collection: string, limit?: string): Promise<unknown> {
    const l = limit || "20";
    return this.fetchJson<any>(`https://api-mainnet.magiceden.dev/v2/collections/${collection}/activities?limit=${l}&type=buy`, []);
  }

  private async getFloorPrice(collection: string): Promise<unknown> {
    const data = await this.fetchJson<any>(`https://api-mainnet.magiceden.dev/v2/collections/${collection}/stats`, null);
    return data?.floorPrice ?? null;
  }

  private async getCollectionMetadata(collection: string): Promise<unknown> {
    return this.fetchJson<any>(`https://api-mainnet.magiceden.dev/v2/collections/${collection}`, null);
  }

  private async getEvents(collection: string, limit?: string): Promise<unknown> {
    const l = limit || "20";
    return this.fetchJson<any>(`https://api-mainnet.magiceden.dev/v2/collections/${collection}/activities?limit=${l}`, []);
  }

  async checkHealth() {
    const start = Date.now();
    try {
      await this.getCollections("1");
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
