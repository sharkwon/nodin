/**
 * Birdeye Connector — token analytics, price tracking, trending tokens
 */
import { BaseConnector } from "../source-registry.js";

export class BirdeyeConnector extends BaseConnector {
  readonly sourceId = "birdeye";
  readonly provider = "Birdeye";
  readonly type = "api" as const;
  readonly capabilities = ["token_prices", "trending", "trade_data", "ohlcv"];
  readonly endpoint = "https://public-api.birdeye.so";
  readonly auth = "api_key" as const;

  protected async fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown> {
    switch (capability) {
      case "token_prices":
        if (params?.mint) return this.getTokenPrice(params.mint);
        return null;
      case "trending":
        return this.getTrending();
      case "trade_data":
        if (params?.mint) return this.getTradeData(params.mint);
        return null;
      case "ohlcv":
        if (params?.mint) return this.getOHLCV(params.mint);
        return null;
      default:
        return null;
    }
  }

  private async getTokenPrice(mint: string): Promise<unknown> {
    // Birdeye public API — may require API key
    const data = await this.fetchJson<any>(`https://public-api.birdeye.so/defi/price?address=${mint}`, null);
    return data?.data?.value ?? null;
  }

  private async getTrending(): Promise<unknown> {
    const data = await this.fetchJson<any>("https://public-api.birdeye.so/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&limit=20", null);
    return data?.data ?? [];
  }

  private async getTradeData(mint: string): Promise<unknown> {
    const data = await this.fetchJson<any>(`https://public-api.birdeye.so/defi/price?address=${mint}`, null);
    return data?.data ?? null;
  }

  private async getOHLCV(mint: string): Promise<unknown> {
    const data = await this.fetchJson<any>(`https://public-api.birdeye.so/defi/history?address=${mint}&type=15m`, null);
    return data?.data ?? [];
  }

  async checkHealth() {
    const start = Date.now();
    try {
      // Birdeye might require API key — just check if endpoint responds
      await this.getTrending();
      return {
        sourceId: this.sourceId, status: "healthy" as const,
        checkedAt: new Date().toISOString(), responseTimeMs: Date.now() - start,
      };
    } catch {
      return {
        sourceId: this.sourceId, status: "unavailable" as const,
        checkedAt: new Date().toISOString(), responseTimeMs: Date.now() - start,
        error: "health check failed — API key may be required",
      };
    }
  }
}
