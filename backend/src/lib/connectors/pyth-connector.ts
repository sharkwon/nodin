/**
 * Pyth Network Connector — oracle price feeds
 * Fetches price feeds, publisher info, and update frequency from Hermes API.
 */
import { BaseConnector } from "../source-registry.js";

interface PythPriceFeed {
  id: string;
  attributes: {
    asset_type: string;
    description: string;
    display_symbol: string;
    symbol: string;
    generic_agent_id?: string;
  };
  pp: string;
  qa: string;
}

export class PythConnector extends BaseConnector {
  readonly sourceId = "pyth";
  readonly provider = "Pyth Network";
  readonly type = "oracle" as const;
  readonly capabilities = ["price_feeds", "publishers", "update_frequency", "historical"];
  readonly endpoint = "https://hermes.pyth.network";

  protected async fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown> {
    switch (capability) {
      case "price_feeds":
        return this.getPriceFeeds();
      case "publishers":
        return this.getPublishers();
      case "update_frequency":
        return this.getUpdateFrequency();
      case "historical":
        if (params?.feedId) return this.getHistoricalPrice(params.feedId);
        return null;
      default:
        return null;
    }
  }

  /**
   * Get available price feeds from Pyth Hermes API
   */
  private async getPriceFeeds(): Promise<PythPriceFeed[] | null> {
    const data = await this.fetchJson<any>("https://hermes.pyth.network/v2/price_feeds", null);
    if (!data) return null;
    if (Array.isArray(data)) return data as PythPriceFeed[];
    if (data?.data && Array.isArray(data.data)) return data.data as PythPriceFeed[];
    return null;
  }

  /**
   * Get publisher information from Pyth
   */
  private async getPublishers(): Promise<string[] | null> {
    // Pyth Hermes provides publisher info via the benchmark endpoint
    const data = await this.fetchJson<any>("https://hermes.pyth.network/v2/publishers", null);
    if (Array.isArray(data)) return data.map((p: any) => p?.name || p?.id).filter(Boolean);
    if (data?.data && Array.isArray(data.data)) return data.data.map((p: any) => p?.name || p?.id).filter(Boolean);
    return null;
  }

  /**
   * Get update frequency stats
   */
  private async getUpdateFrequency(): Promise<number | null> {
    // Fetch latest price updates and measure how fresh they are
    const data = await this.fetchJson<any>("https://hermes.pyth.network/v2/updates/price/latest", null);
    if (!data) return null;
    // Return number of price feeds being updated
    return data?.parsed?.length ?? 0;
  }

  /**
   * Get historical price for a specific feed
   */
  private async getHistoricalPrice(feedId: string): Promise<{ price: number; time: number }[] | null> {
    const now = Math.floor(Date.now() / 1000);
    const yesterday = now - 86400;
    const data = await this.fetchJson<any>(
      `https://hermes.pyth.network/v2/updates/price/history?ids=${feedId}&startTime=${yesterday}&endTime=${now}`,
      null,
    );
    if (!data?.parsed) return null;
    return data.parsed.map((p: any) => ({
      price: p?.price?.price ? Number(p.price.price) / Math.pow(10, p.price.expo || -8) : 0,
      time: p?.price?.publish_time ?? 0,
    }));
  }

  async checkHealth() {
    const start = Date.now();
    try {
      await this.getPriceFeeds();
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
