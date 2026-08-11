/**
 * DIA Connector — DIA oracle price feeds
 *
 * Capabilities: price_feeds
 *
 * DIA provides a REST API at https://api.diadata.org for price data.
 * This connector fetches real price data from DIA's public API.
 *
 * Source IDs: dia-api → dia
 */
import { BaseConnector } from "../source-registry.js";
import type { SourceHealthCheck } from "../ecosystem-types.js";

const DIA_API = "https://api.diadata.org";

interface DiaPriceResponse {
  Symbol?: string;
  Name?: string;
  Price?: number;
  Time?: string;
}

export class DiaConnector extends BaseConnector {
  readonly sourceId = "dia";
  readonly provider = "DIA";
  readonly type = "oracle" as const;
  readonly capabilities = ["price_feeds"];
  readonly endpoint = DIA_API;
  readonly auth = "none" as const;
  protected timeoutMs = 10000;

  protected async fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown> {
    if (capability !== "price_feeds") return null;

    // DIA provides asset prices via /data/v1/assetQuote or /v1/assetQuotation
    // Try fetching SOL price as a basic capability
    const symbol = params?.symbol ?? "SOL";
    const url = `${DIA_API}/data/v1/assetQuote?blockchain=Solana&address=${encodeURIComponent(symbol)}`;
    const data = await this.fetchJson<DiaPriceResponse | DiaPriceResponse[]>(url, {} as DiaPriceResponse);

    if (Array.isArray(data) && data.length > 0) return data[0]?.Price ?? null;
    if (data && typeof data === "object" && "Price" in data) {
      const price = (data as DiaPriceResponse).Price;
      if (typeof price === "number") return price;
    }
    return null;
  }

  async checkHealth(): Promise<SourceHealthCheck> {
    const start = Date.now();
    try {
      // Ping DIA API with a simple asset quote request
      const url = `${DIA_API}/data/v1/assetQuote?blockchain=Solana&address=So11111111111111111111111111111111111111112`;
      const data = await this.fetchJson<DiaPriceResponse>(url, {} as DiaPriceResponse);
      if (data && (data.Price !== undefined || data.Symbol !== undefined)) {
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
        error: "API returned empty response",
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
