/**
 * DeFiLlama Connector — refactored to implement DataConnector interface.
 * Provides TVL, volume, fees, stablecoins for Solana protocols.
 */
import { BaseConnector } from "../source-registry.js";
import type { ProvenanceMetric } from "../ecosystem-types.js";

type V2Protocol = {
  id: string; name: string; category: string; tvl: number;
  chains?: string[]; chainTvls?: Record<string, number>;
  slug?: string; change_1d?: number; change_7d?: number;
  mcap?: number; symbol?: string;
};

export class DefiLlamaConnector extends BaseConnector {
  readonly sourceId = "defillama";
  readonly provider = "DeFiLlama";
  readonly type = "api" as const;
  readonly capabilities = ["tvl", "volume", "fees", "stablecoins", "protocol_list"];
  readonly endpoint = "https://api.llama.fi";

  private protocolCache: { at: number; data: V2Protocol[] } | null = null;
  private readonly cacheTtl = 60_000;

  private async getProtocols(): Promise<V2Protocol[]> {
    const now = Date.now();
    if (this.protocolCache && now - this.protocolCache.at < this.cacheTtl && this.protocolCache.data.length > 0) {
      return this.protocolCache.data;
    }
    const data = await this.fetchJson<V2Protocol[]>("https://api.llama.fi/protocols", []);
    if (data.length > 0) this.protocolCache = { at: now, data };
    return data;
  }

  protected async fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown> {
    switch (capability) {
      case "tvl":
        return this.solanaTvl();
      case "volume":
        return this.solanaVolume();
      case "fees":
        return this.solanaFees();
      case "stablecoins":
        return this.stablecoinSupply();
      case "protocol_list":
        return this.solanaProtocols();
      default:
        return null;
    }
  }

  private async solanaTvl(): Promise<number> {
    const all = await this.fetchJson<{ name: string; tvl: number }[]>("https://api.llama.fi/v2/chains", []);
    return all.find((c) => c.name === "Solana")?.tvl ?? 0;
  }

  private async solanaVolume(): Promise<number> {
    const r = await this.fetchJson<{ total24h?: number }>("https://api.llama.fi/overview/dexs/Solana?dataType=dailyVolume", {});
    return r.total24h ?? 0;
  }

  private async solanaFees(): Promise<number> {
    const r = await this.fetchJson<{ total24h?: number }>("https://api.llama.fi/overview/fees", {});
    // Sum fees for Solana protocols
    const data = r as any;
    if (data?.protocols) {
      return data.protocols
        .filter((p: any) => (p.chains || []).includes("Solana"))
        .reduce((s: number, p: any) => s + (p.total24h ?? 0), 0);
    }
    return 0;
  }

  private async stablecoinSupply(): Promise<number> {
    const data = await this.fetchJson<{
      peggedAssets: { chainCirculating?: Record<string, { current?: { peggedUSD?: number } }> }[];
    }>("https://stablecoins.llama.fi/stablecoins?includePrices=true", { peggedAssets: [] });
    let total = 0;
    for (const asset of data.peggedAssets) {
      const sol = asset.chainCirculating?.["Solana"];
      total += sol?.current?.peggedUSD ?? 0;
    }
    return total;
  }

  private async solanaProtocols(): Promise<V2Protocol[]> {
    const all = await this.getProtocols();
    return all.filter((p) => (p.chains || []).includes("Solana"));
  }

  async checkHealth() {
    const start = Date.now();
    try {
      await this.solanaTvl();
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

/** Solana-specific DeFiLlama connector (per-protocol TVL, volume) */
export class DefiLlamaProtocolConnector extends BaseConnector {
  readonly sourceId = "defillama-protocols";
  readonly provider = "DeFiLlama (per-protocol)";
  readonly type = "api" as const;
  readonly capabilities = ["tvl", "volume", "fees", "protocol_detail", "tvl_history"];
  readonly endpoint = "https://api.llama.fi";

  protected async fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown> {
    const slug = params?.slug;
    if (!slug) return null;
    switch (capability) {
      case "tvl": {
        const detail = await this.fetchJson<any>(`https://api.llama.fi/protocol/${slug}`, null);
        if (!detail) return 0;
        const ct = detail.chainTvls?.["Solana"];
        if (ct?.tvl && Array.isArray(ct.tvl) && ct.tvl.length > 0) {
          return ct.tvl[ct.tvl.length - 1]?.totalLiquidityUSD ?? 0;
        }
        if (detail.currentChainTvls?.["Solana"]) return detail.currentChainTvls["Solana"];
        return 0;
      }
      case "volume":
      case "fees": {
        const r = await this.fetchJson<any>(`https://api.llama.fi/summary/fees/24h:${slug}`, {});
        return r?.total24h ?? 0;
      }
      case "protocol_detail": {
        return await this.fetchJson<any>(`https://api.llama.fi/protocol/${slug}`, null);
      }
      case "tvl_history": {
        const detail = await this.fetchJson<any>(`https://api.llama.fi/protocol/${slug}`, null);
        const arr = detail?.chainTvls?.["Solana"]?.tvl;
        if (!Array.isArray(arr)) return [];
        return arr.map((p: any) => ({ date: p.date, tvl: p.totalLiquidityUSD }));
      }
      default:
        return null;
    }
  }

  async checkHealth() {
    const start = Date.now();
    try {
      await this.fetchJson("https://api.llama.fi/protocols", []);
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
