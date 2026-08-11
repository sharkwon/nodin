/**
 * CoinGecko Connector — token price, market cap, volume, price change
 *
 * Uses the free CoinGecko API (no key required, rate-limited).
 * Capabilities: price, market_cap, volume, price_change
 *
 * Source IDs that resolve to this connector:
 *   coingecko-bonk → coingecko, params: { coinId: "bonk" }
 *   coingecko-wif  → coingecko, params: { coinId: "dogwifhat" }
 *   coingecko-popcat → coingecko, params: { coinId: "popcat" }
 *
 * The SourceMapper pattern "coingecko-{symbol}" resolves to connector "coingecko".
 * The coinId mapping is done via the project's token.coingeckoId field or
 * by matching the symbol to CoinGecko's coin list.
 */
import { BaseConnector } from "../source-registry.js";
import type { SourceHealthCheck } from "../ecosystem-types.js";

// Map of common Solana token symbols → CoinGecko coin IDs
// These are verified CoinGecko coin IDs, not guesses.
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  bonk: "bonk",
  wif: "dogwifhat",
  popcat: "popcat",
  jup: "jupiter-exchange-solana",
  jito: "jito-governance-token",
  ray: "raydium",
  orca: "orca",
};

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  current_price: number | null;
  market_cap: number | null;
  total_volume: number | null;
  price_change_percentage_24h: number | null;
  market_cap_rank: number | null;
}

export class CoinGeckoConnector extends BaseConnector {
  readonly sourceId = "coingecko";
  readonly provider = "CoinGecko";
  readonly type = "api" as const;
  readonly capabilities = ["price", "market_cap", "volume", "price_change"];
  readonly endpoint = "https://api.coingecko.com/api/v3";
  protected timeoutMs = 10000;

  protected async fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown> {
    const coinId = this.resolveCoinId(params);
    if (!coinId) return null;

    switch (capability) {
      case "price":
        return this.getPrice(coinId);
      case "market_cap":
        return this.getMarketCap(coinId);
      case "volume":
        return this.getVolume(coinId);
      case "price_change":
        return this.getPriceChange(coinId);
      default:
        return null;
    }
  }

  private resolveCoinId(params?: Record<string, string>): string | null {
    // Direct coinId param
    if (params?.coinId) return params.coinId;
    // Symbol-based lookup
    if (params?.symbol) {
      const id = SYMBOL_TO_COINGECKO_ID[params.symbol.toLowerCase()];
      if (id) return id;
    }
    // Try the source ID suffix (e.g. coingecko-bonk → "bonk")
    if (params?.sourceSuffix) {
      const id = SYMBOL_TO_COINGECKO_ID[params.sourceSuffix.toLowerCase()];
      if (id) return id;
    }
    return null;
  }

  private async fetchMarketData(coinId: string): Promise<CoinGeckoMarketData | null> {
    const url = `${this.endpoint}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coinId)}&sparkline=false`;
    const data = await this.fetchJson<CoinGeckoMarketData[]>(url, []);
    if (Array.isArray(data) && data.length > 0) return data[0];
    return null;
  }

  private async getPrice(coinId: string): Promise<number | null> {
    const data = await this.fetchMarketData(coinId);
    return data?.current_price ?? null;
  }

  private async getMarketCap(coinId: string): Promise<number | null> {
    const data = await this.fetchMarketData(coinId);
    return data?.market_cap ?? null;
  }

  private async getVolume(coinId: string): Promise<number | null> {
    const data = await this.fetchMarketData(coinId);
    return data?.total_volume ?? null;
  }

  private async getPriceChange(coinId: string): Promise<number | null> {
    const data = await this.fetchMarketData(coinId);
    return data?.price_change_percentage_24h ?? null;
  }

  async checkHealth(): Promise<SourceHealthCheck> {
    const start = Date.now();
    try {
      // Ping the API
      const data = await this.fetchJson<{ gecko_says: string }>(`${this.endpoint}/ping`, { gecko_says: "" });
      if (data.gecko_says) {
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
        error: "ping returned empty",
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
