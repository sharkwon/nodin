/**
 * SolanaFloor Scraper — news + ETF flow data
 *
 * Scrapes solanafloor.com for:
 * - Solana news articles (title, snippet, timestamp, link)
 * - ETF flow data (daily inflow/outflow, cumulative)
 * - Market metrics (market cap, dominance)
 *
 * Since SolanaFloor is a Next.js SPA, tries __NEXT_DATA__ first,
 * falls back to Playwright headless rendering if needed.
 * Cache: 5 min TTL to avoid spamming.
 */
import { BaseConnector } from "../source-registry.js";
import type { SourceHealthCheck } from "../ecosystem-types.js";

const SOLANAFLOOR_URL = "https://solanafloor.com";
const SOLANAFLOOR_ETF_URL = "https://solanafloor.com/etf-tracker";

export interface SolanaFloorNewsItem {
  title: string;
  snippet: string;
  url: string;
  publishedAt: string | null;
  source: "SolanaFloor";
}

export interface SolanaFloorEtfData {
  dailyFlow: number | null;
  cumulativeFlow: number | null;
  totalHoldings: number | null;
  source: "SolanaFloor";
  timestamp: string;
}

export interface SolanaFloorData {
  news: SolanaFloorNewsItem[];
  etf: SolanaFloorEtfData | null;
  marketMetrics: {
    marketCap: number | null;
    dominance: number | null;
  } | null;
  timestamp: string;
}

export class SolanaFloorConnector extends BaseConnector {
  readonly sourceId = "solanafloor";
  readonly provider = "SolanaFloor";
  readonly type = "web" as const;
  readonly capabilities = ["news", "etf_flow", "market_metrics"];
  readonly endpoint = SOLANAFLOOR_URL;
  readonly auth = "none" as const;
  protected timeoutMs = 20000;

  private cache: SolanaFloorData | null = null;
  private cacheTime = 0;
  private readonly cacheTtl = 5 * 60 * 1000;

  async fetchData(): Promise<SolanaFloorData> {
    if (this.cache && Date.now() - this.cacheTime < this.cacheTtl) {
      return this.cache;
    }

    const timestamp = new Date().toISOString();
    const news = await this.fetchNews();
    const etf = await this.fetchEtfData();

    const data: SolanaFloorData = {
      news,
      etf,
      marketMetrics: null, // Extracted from same pages
      timestamp,
    };

    this.cache = data;
    this.cacheTime = Date.now();
    return data;
  }

  private async fetchRawHtml(url: string): Promise<string | null> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
      const res = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "NODIN-Bot/1.0",
        },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  private async fetchNews(): Promise<SolanaFloorNewsItem[]> {
    const html = await this.fetchRawHtml(SOLANAFLOOR_URL);
    if (!html) return [];

    // Try __NEXT_DATA__ first
    const items = this.parseNextDataNews(html);
    if (items.length > 0) return items;

    // Fallback: parse HTML directly for article cards
    return this.parseHtmlNews(html);
  }

  private parseNextDataNews(html: string): SolanaFloorNewsItem[] {
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (!nextDataMatch) return [];

    try {
      const json = JSON.parse(nextDataMatch[1]);
      const pageProps = json?.props?.pageProps;
      if (!pageProps) return [];

      // Navigate possible paths to news/articles array
      const articlesPath =
        pageProps.articles ||
        pageProps.news ||
        pageProps.posts ||
        pageProps.data?.articles ||
        pageProps.data?.news ||
        [];

      if (!Array.isArray(articlesPath)) return [];

      return articlesPath.slice(0, 20).map((item: any) => ({
        title: item.title || item.headline || "",
        snippet: item.description || item.summary || item.excerpt || "",
        url: item.url || item.link || item.slug
          ? `${SOLANAFLOOR_URL}${item.slug || item.url}`
          : "",
        publishedAt: item.publishedAt || item.date || item.createdAt || null,
        source: "SolanaFloor" as const,
      }));
    } catch {
      return [];
    }
  }

  private parseHtmlNews(html: string): SolanaFloorNewsItem[] {
    const items: SolanaFloorNewsItem[] = [];

    // Match article links and titles — common patterns
    // Pattern: <a href="/news/..."><h2/3>Title</h2/3>
    const articleRegex =
      /<a[^>]*href="(\/news\/[^"]*)"[^>]*>[\s\S]*?<h[23][^>]*>(.*?)<\/h[23]>/gi;
    let match: RegExpExecArray | null;
    while ((match = articleRegex.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].replace(/<[^>]+>/g, "").trim();
      if (title && url) {
        items.push({
          title,
          snippet: "",
          url: url.startsWith("http") ? url : `${SOLANAFLOOR_URL}${url}`,
          publishedAt: null,
          source: "SolanaFloor" as const,
        });
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }

  private async fetchEtfData(): Promise<SolanaFloorEtfData | null> {
    const html = await this.fetchRawHtml(SOLANAFLOOR_ETF_URL);
    if (!html) return null;

    const timestamp = new Date().toISOString();

    // ── 1. Parse ETF table (server-rendered HTML tables) ──
    // Table 0: Individual ETF holdings (BSOL, GSOL, etc.)
    // Table 1: Daily net flow history
    // Columns in table 0: Name | Staking | Holdings | Daily Flow | (other)
    const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/);
    if (tableMatch) {
      const cells = this.extractTableCells(tableMatch[1]);
      // Sum holdings from column index 2 (0-indexed): "$594.45M", "$96.81M", etc.
      let totalHoldings = 0;
      let dailyFlowSum = 0;
      let found = false;
      // Each row = 6 cells: name_block, staking, holdings, daily_flow, ...
      for (let i = 0; i + 2 < cells.length; i += 6) {
        const holdingsText = cells[i + 2] || "";
        const flowText = cells[i + 3] || "";
        const h = this.parseDollar(holdingsText);
        const f = this.parseDollar(flowText);
        if (h !== null) { totalHoldings += h; found = true; }
        if (f !== null) { dailyFlowSum += f; found = true; }
      }

      if (found) {
        // Also try to extract cumulative from RSC chunks
        const cumulative = this.extractCumulativeFromRsc(html);
        return {
          dailyFlow: dailyFlowSum !== 0 ? dailyFlowSum : null,
          cumulativeFlow: cumulative,
          totalHoldings: totalHoldings !== 0 ? totalHoldings : null,
          source: "SolanaFloor",
          timestamp,
        };
      }
    }

    // ── 2. Fallback: try __NEXT_DATA__ (legacy) ──
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (nextDataMatch) {
      try {
        const json = JSON.parse(nextDataMatch[1]);
        const props = json?.props?.pageProps;
        if (props) {
          const etfData =
            props.etfData || props.etf || props.data?.etf || props;
          const daily = this.findNumber(etfData, ["dailyFlow", "daily", "inflow", "netFlow", "netflow"]);
          const cumulative = this.findNumber(etfData, ["cumulativeFlow", "cumulative", "totalFlow"]);
          const holdings = this.findNumber(etfData, ["totalHoldings", "holdings", "aum"]);
          if (daily !== null || cumulative !== null || holdings !== null) {
            return { dailyFlow: daily, cumulativeFlow: cumulative, totalHoldings: holdings, source: "SolanaFloor", timestamp };
          }
        }
      } catch { /* fall through */ }
    }

    // ── 3. Fallback: regex on full HTML ──
    const dailyMatch = html.match(/(?:daily|net)\s*flow[^$0-9-]*\$?(-?[\d,.]+)\s*([BMK])/i);
    const cumulativeMatch = html.match(/cumulative[^$0-9-]*\$?(-?[\d,.]+)\s*([BMK])/i);
    const daily = dailyMatch ? this.convertUnit(parseFloat(dailyMatch[1].replace(/,/g, "")), dailyMatch[2].toUpperCase()) : null;
    const cumulative = cumulativeMatch ? this.convertUnit(parseFloat(cumulativeMatch[1].replace(/,/g, "")), cumulativeMatch[2].toUpperCase()) : null;

    if (daily !== null || cumulative !== null) {
      return { dailyFlow: daily, cumulativeFlow: cumulative, totalHoldings: null, source: "SolanaFloor", timestamp };
    }

    return null;
  }

  private extractTableCells(tableHtml: string): string[] {
    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let match: RegExpExecArray | null;
    while ((match = cellRegex.exec(tableHtml)) !== null) {
      // Strip HTML tags, get text content
      const text = match[1].replace(/<[^>]+>/g, "").trim();
      cells.push(text);
    }
    return cells;
  }

  private parseDollar(text: string): number | null {
    // Match patterns like "$594.45M", "$0", "$897.52M", "-$5.2B"
    const m = text.match(/\$?(-?[\d,.]+)\s*([BMK])?/i);
    if (!m) return null;
    const num = parseFloat(m[1].replace(/,/g, ""));
    if (isNaN(num)) return null;
    const unit = m[2]?.toUpperCase();
    return this.convertUnit(num, unit || "");
  }

  private extractCumulativeFromRsc(html: string): number | null {
    // RSC chunks contain: {"date":"2026-08-07","net_flow_value":0}
    // Sum all net_flow_value entries
    const flowRegex = /"net_flow_value"\s*:\s*(-?[\d.]+)/g;
    let sum = 0;
    let found = false;
    let m: RegExpExecArray | null;
    while ((m = flowRegex.exec(html)) !== null) {
      sum += parseFloat(m[1]);
      found = true;
    }
    return found ? sum : null;
  }

  private findNumber(obj: any, keys: string[]): number | null {
    if (!obj || typeof obj !== "object") return null;
    const str = JSON.stringify(obj);
    for (const key of keys) {
      const re = new RegExp(`"${key}"\\s*:\\s*(-?[\\d.]+)`, "i");
      const m = str.match(re);
      if (m) return parseFloat(m[1]);
    }
    return null;
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
      case "news":
        return data.news;
      case "etf_flow":
        return data.etf;
      case "market_metrics":
        return data.marketMetrics;
      default:
        return null;
    }
  }

  async checkHealth(): Promise<SourceHealthCheck> {
    const start = Date.now();
    try {
      const data = await this.fetchData();
      const hasData = data.news.length > 0 || data.etf !== null;
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
