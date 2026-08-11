/**
 * Jupiter Connector — DEX aggregator data
 * Swap quotes, token list, price, routing stats, volume
 */
import { BaseConnector } from "../source-registry.js";

export class JupiterConnector extends BaseConnector {
  readonly sourceId = "jupiter";
  readonly provider = "Jupiter";
  readonly type = "api" as const;
  readonly capabilities = ["swap_quote", "token_list", "price", "routing", "volume", "trades"];
  readonly endpoint = "https://quote-api.jup.ag/v6";

  protected async fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown> {
    switch (capability) {
      case "token_list":
        return this.getTokenList();
      case "price":
        if (params?.mint) return this.getPrice(params.mint);
        return null;
      case "swap_quote":
        if (params?.inputMint && params?.outputMint && params?.amount) {
          return this.getSwapQuote(params.inputMint, params.outputMint, params.amount);
        }
        return null;
      case "routing":
      case "volume":
      case "trades":
        return this.getStats();
      default:
        return null;
    }
  }

  private async getTokenList(): Promise<unknown> {
    return this.fetchJson<any>("https://token.jup.ag/all", []);
  }

  private async getPrice(mint: string): Promise<unknown> {
    const data = await this.fetchJson<any>(`https://price.jup.ag/v6/price?ids=${mint}`, {});
    return data?.data?.[mint]?.price ?? null;
  }

  private async getSwapQuote(inputMint: string, outputMint: string, amount: string): Promise<unknown> {
    return this.fetchJson<any>(
      `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`,
      null,
    );
  }

  private async getStats(): Promise<unknown> {
    return this.fetchJson<any>("https://stats.jup.ag/general/v1/summary", null);
  }

  async checkHealth() {
    const start = Date.now();
    try {
      await this.getTokenList();
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
