/**
 * Switchboard Connector — on-demand oracle feeds and randomness
 */
import { BaseConnector } from "../source-registry.js";

export class SwitchboardConnector extends BaseConnector {
  readonly sourceId = "switchboard";
  readonly provider = "Switchboard";
  readonly type = "oracle" as const;
  readonly capabilities = ["price_feeds", "feeds", "randomness", "queue"];
  readonly endpoint = "https://api.switchboard.xyz";

  protected async fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown> {
    switch (capability) {
      case "price_feeds":
      case "feeds":
        return this.getFeeds();
      case "randomness":
        return this.getRandomness();
      case "queue":
        return this.getQueue();
      default:
        return null;
    }
  }

  private async getFeeds(): Promise<unknown> {
    // Switchboard On-Demand mainnet feeds
    const data = await this.fetchJson<any>("https://api.switchboard.xyz/mainnet/feeds", null);
    return data;
  }

  private async getRandomness(): Promise<unknown> {
    const data = await this.fetchJson<any>("https://api.switchboard.xyz/mainnet/randomness", null);
    return data;
  }

  private async getQueue(): Promise<unknown> {
    const data = await this.fetchJson<any>("https://api.switchboard.xyz/mainnet/queue", null);
    return data;
  }

  async checkHealth() {
    const start = Date.now();
    try {
      await this.getFeeds();
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
