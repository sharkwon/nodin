/**
 * Solana.com Data Scraper — cross-reference ecosystem stats
 *
 * Scrapes https://solana.com/data for:
 * - Validator count (active/delinquent)
 * - Total stake
 * - SOL price
 * - TVL
 * - Stablecoin supply
 * - DEX volume
 * - Transaction count
 *
 * Uses HTTP fetch + HTML/JSON parse. Graceful fallback on structure change.
 */
import { BaseConnector } from "../source-registry.js";
import type { SourceHealthCheck } from "../ecosystem-types.js";

const SOLANA_DATA_URL = "https://solana.com/data";

export interface SolanaComData {
  validators?: number;
  totalStake?: number;
  solPrice?: number;
  tvl?: number;
  stablecoinSupply?: number;
  dexVolume?: number;
  transactionCount?: number;
  medianFee?: number;
  avgTxFee?: number;
  blockTime?: number;
  monthlyActiveAddresses?: number;
  raw?: string;
  timestamp: string;
}

export class SolanaComDataConnector extends BaseConnector {
  readonly sourceId = "solana-com-data";
  readonly provider = "Solana.com";
  readonly type = "web" as const;
  readonly capabilities = ["ecosystem_stats", "validators"];
  readonly endpoint = SOLANA_DATA_URL;
  readonly auth = "none" as const;
  protected timeoutMs = 20000;

  private cache: SolanaComData | null = null;
  private cacheTime = 0;
  private readonly cacheTtl = 5 * 60 * 1000; // 5 min

  async fetchData(): Promise<SolanaComData> {
    // Check cache
    if (this.cache && Date.now() - this.cacheTime < this.cacheTtl) {
      return this.cache;
    }

    const timestamp = new Date().toISOString();
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
      const res = await fetch(SOLANA_DATA_URL, {
        headers: {
          "Accept": "text/html,application/xhtml+xml",
          "User-Agent": "NODIN-Bot/1.0",
        },
        signal: ctrl.signal,
      });
      clearTimeout(t);

      if (!res.ok) {
        return { timestamp, raw: `HTTP ${res.status}` };
      }

      const html = await res.text();
      const data = this.parseHtml(html);
      data.timestamp = timestamp;
      this.cache = data;
      this.cacheTime = Date.now();
      return data;
    } catch {
      return { timestamp };
    }
  }

  private parseHtml(html: string): SolanaComData {
    const data: SolanaComData = { timestamp: new Date().toISOString() };

    // ── 1. Parse RSC chunks (React Server Components) ──
    // solana.com/data uses Next.js with RSC, not __NEXT_DATA__
    // Stats are in format: "value":"$$10B","label":"Stablecoin supply"
    const rscRegex =
      /self\.__next_f\.push\(\[1,\s*"((?:[^"\\]|\\.)*)"\]\)/g;
    let rscMatch: RegExpExecArray | null;
    while ((rscMatch = rscRegex.exec(html)) !== null) {
      const decoded = rscMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");

      // Extract all value-label pairs
      const statRegex =
        /"value"\s*:\s*"?([^",}]+)"?\s*[,}]\s*"label"\s*:\s*"([^"]*)"/g;
      let statMatch: RegExpExecArray | null;
      while ((statMatch = statRegex.exec(decoded)) !== null) {
        const rawValue = statMatch[1];
        const label = statMatch[2];

        if (data.medianFee === undefined && /median\s*fee/i.test(label)) {
          const v = this.parseDollarValue(rawValue);
          if (v !== null) data.medianFee = v;
        }
        if (data.solPrice === undefined && /sol\s*price/i.test(label)) {
          const v = this.parseDollarValue(rawValue);
          if (v !== null) data.solPrice = v;
        }
        if (data.tvl === undefined && /tvl/i.test(label)) {
          const v = this.parseDollarValue(rawValue);
          if (v !== null) data.tvl = v;
        }
        if (data.stablecoinSupply === undefined && /stablecoin\s*supply/i.test(label)) {
          const v = this.parseDollarValue(rawValue);
          if (v !== null) data.stablecoinSupply = v;
        }
        if (data.dexVolume === undefined && /dex\s*volume/i.test(label)) {
          const v = this.parseDollarValue(rawValue);
          if (v !== null) data.dexVolume = v;
        }
        if (data.transactionCount === undefined && /quarterly\s*transactions|daily\s*transactions|monthly\s*transactions/i.test(label)) {
          const v = this.parseNumericValue(rawValue);
          if (v !== null) data.transactionCount = v;
        }
        if (data.avgTxFee === undefined && /average\s*transaction\s*(fee|cost)/i.test(label)) {
          const v = this.parseDollarValue(rawValue);
          if (v !== null) data.avgTxFee = v;
        }
        if (data.blockTime === undefined && /block\s*time/i.test(label)) {
          const v = this.parseNumericValue(rawValue);
          if (v !== null) data.blockTime = v;
        }
        if (data.monthlyActiveAddresses === undefined && /monthly\s*active/i.test(label)) {
          const v = this.parseNumericValue(rawValue);
          if (v !== null) data.monthlyActiveAddresses = v;
        }
      }
    }

    // ── 2. Fallback: __NEXT_DATA__ (legacy) ──
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (nextDataMatch) {
      try {
        const json = JSON.parse(nextDataMatch[1]);
        const pageProps = json?.props?.pageProps;
        if (pageProps) this.extractFromNextData(pageProps, data);
      } catch {}
    }

    // ── 3. Fallback: regex on HTML ──
    if (data.validators === undefined) {
      const m = html.match(/(\d[\d,]*)\s*(?:active\s*)?validators/i);
      if (m) data.validators = parseInt(m[1].replace(/,/g, ""), 10);
    }

    return data;
  }

  private parseDollarValue(raw: string): number | null {
    // Patterns: "$$10B", "$0.0013", "$2T", "$1.2T"
    const m = raw.match(/\$*(-?[\d,.]+)\s*([TBMK])?/i);
    if (!m) return null;
    const num = parseFloat(m[1].replace(/,/g, ""));
    if (isNaN(num)) return null;
    const unit = m[2]?.toUpperCase() || "";
    return this.convertUnit(num, unit);
  }

  private parseNumericValue(raw: string): number | null {
    // Patterns: "100M+", "8.5B", "3.5B", "50M"
    const m = raw.match(/(-?[\d,.]+)\s*([TBMK])?\+?/i);
    if (!m) return null;
    const num = parseFloat(m[1].replace(/,/g, ""));
    if (isNaN(num)) return null;
    const unit = m[2]?.toUpperCase() || "";
    return this.convertUnit(num, unit);
  }

  private extractFromNextData(props: unknown, data: SolanaComData): void {
    const str = JSON.stringify(props);
    const find = (key: string): number | undefined => {
      // Look for numeric values near key names
      const re = new RegExp(`"${key}"[^0-9-]*([\\d.]+)`, "i");
      const m = str.match(re);
      if (m) return parseFloat(m[1]);
      return undefined;
    };

    if (data.validators === undefined)
      data.validators = find("validators") ?? find("validatorCount");
    if (data.totalStake === undefined)
      data.totalStake = find("stake") ?? find("totalStake");
    if (data.solPrice === undefined)
      data.solPrice = find("solPrice") ?? find("price");
    if (data.tvl === undefined) data.tvl = find("tvl");
    if (data.transactionCount === undefined)
      data.transactionCount = find("transactions") ?? find("txCount");
  }

  private convertUnit(num: number, unit: string): number {
    switch (unit) {
      case "B":
        return num * 1e9;
      case "M":
        return num * 1e6;
      case "K":
        return num * 1e3;
      default:
        return num;
    }
  }

  protected async fetchCapability(
    capability: string,
  ): Promise<unknown> {
    const data = await this.fetchData();
    switch (capability) {
      case "ecosystem_stats":
        return data;
      case "validators":
        return data.validators ?? null;
      default:
        return null;
    }
  }

  async checkHealth(): Promise<SourceHealthCheck> {
    const start = Date.now();
    try {
      const data = await this.fetchData();
      const hasData =
        data.validators !== undefined ||
        data.solPrice !== undefined ||
        data.tvl !== undefined;
      return {
        sourceId: this.sourceId,
        status: hasData ? "healthy" : "unavailable",
        checkedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
      };
    } catch {
      return {
        sourceId: this.sourceId,
        status: "unavailable",
        checkedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
        error: "scrape failed",
      };
    }
  }
}
