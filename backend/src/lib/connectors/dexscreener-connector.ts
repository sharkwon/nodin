/**
 * DEXScreener Connector — token pair data, prices, volume, trending
 */
import { BaseConnector } from "../source-registry.js";

export class DexScreenerConnector extends BaseConnector {
  readonly sourceId = "dexscreener";
  readonly provider = "DEXScreener";
  readonly type = "api" as const;
  readonly capabilities = ["pairs", "prices", "volume", "transactions", "trending"];
  readonly endpoint = "https://api.dexscreener.com";

  protected async fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown> {
    switch (capability) {
      case "trending":
        return this.getTrending();
      case "pairs":
        if (params?.tokenMint) return this.getPairsByToken(params.tokenMint);
        return this.getSolanaPairs();
      case "prices":
        if (params?.tokenMint) return this.getPriceByToken(params.tokenMint);
        return null;
      case "volume":
        if (params?.pairAddress) return this.getPairVolume(params.pairAddress);
        return null;
      case "transactions":
        if (params?.pairAddress) return this.getPairTransactions(params.pairAddress);
        return null;
      default:
        return null;
    }
  }

  private async getTrending(): Promise<unknown> {
    const data = await this.fetchJson<any>("https://api.dexscreener.com/token-boosted/top/v1", []);
    return data;
  }

  private async getSolanaPairs(): Promise<unknown> {
    // Search for Solana pairs — get latest pairs
    const data = await this.fetchJson<any>("https://api.dexscreener.com/latest/dex/search?q=solana", {});
    return data?.pairs ?? [];
  }

  private async getPairsByToken(tokenMint: string): Promise<unknown> {
    const data = await this.fetchJson<any>(`https://api.dexscreener.com/token-pairs/v1/solana/${tokenMint}`, []);
    return data;
  }

  private async getPriceByToken(tokenMint: string): Promise<unknown> {
    const data = await this.fetchJson<any>(`https://api.dexscreener.com/tokens/v1/solana/${tokenMint}`, []);
    if (Array.isArray(data) && data.length > 0) return data[0]?.priceUsd ?? null;
    return null;
  }

  private async getPairVolume(pairAddress: string): Promise<unknown> {
    const data = await this.fetchJson<any>(`https://api.dexscreener.com/pairs/v1/solana/${pairAddress}`, []);
    if (Array.isArray(data) && data.length > 0) return data[0]?.volume ?? null;
    return null;
  }

  private async getPairTransactions(pairAddress: string): Promise<unknown> {
    const data = await this.fetchJson<any>(`https://api.dexscreener.com/transactions/v1/solana/${pairAddress}`, []);
    return data;
  }

  async checkHealth() {
    const start = Date.now();
    try {
      await this.getTrending();
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
