/**
 * Twitter RSS Connector — key Solana account announcements
 *
 * Fetches tweets from key Solana accounts via RSS bridge services.
 * No Twitter API key required.
 *
 * Tries multiple RSS bridge sources:
 * 1. Nitter instances (public RSS feeds)
 * 2. RSS bridge services (rss-bridge.org)
 * 3. Fallback: if all down, returns empty (graceful)
 */
import { BaseConnector } from "../source-registry.js";
import type { SourceHealthCheck } from "../ecosystem-types.js";

const NITTER_INSTANCES = [
  "https://nitter.net",
  "https://nitter.poast.org",
  "https://nitter.privacyredirect.com",
  "https://nitter.cz",
];

const TARGET_ACCOUNTS = [
  "solana",
  "SolanaFndn",
  "aeyakovenko",
  "rajgokal",
  "jito_labs",
  "JupiterExchange",
  "DriftProtocol",
  "heliuslabs",
  "SolanaStatus",
  "magineden",
  "TensorProtocol",
  "PythNetwork",
  "MarinadeFinance",
  "KaminoFinance",
  "ORCAProtocol",
  "MeteoraAG",
  "Sanctus_labs",
];

export interface TwitterRssItem {
  account: string;
  handle: string;
  content: string;
  url: string;
  publishedAt: string | null;
  source: "Twitter RSS";
}

export interface TwitterRssData {
  items: TwitterRssItem[];
  accountsTracked: number;
  successfulFeeds: number;
  timestamp: string;
}

export class TwitterRssConnector extends BaseConnector {
  readonly sourceId = "twitter-rss";
  readonly provider = "Twitter RSS";
  readonly type = "web" as const;
  readonly capabilities = ["news", "announcements", "sentiment"];
  readonly endpoint = "nitter.net";
  readonly auth = "none" as const;
  protected timeoutMs = 15000;

  private cache: TwitterRssData | null = null;
  private cacheTime = 0;
  private readonly cacheTtl = 5 * 60 * 1000;

  async fetchData(): Promise<TwitterRssData> {
    if (this.cache && Date.now() - this.cacheTime < this.cacheTtl) {
      return this.cache;
    }

    const timestamp = new Date().toISOString();
    const allItems: TwitterRssItem[] = [];
    let successfulFeeds = 0;

    // Try each Nitter instance until we get data
    for (const instance of NITTER_INSTANCES) {
      const items = await this.fetchFromInstance(instance);
      if (items.length > 0) {
        successfulFeeds++;
        allItems.push(...items);
        // If we got enough items, stop trying more instances
        if (allItems.length >= 30) break;
      }
    }

    // Deduplicate by content
    const seen = new Set<string>();
    const deduped = allItems.filter((item) => {
      const key = item.content.slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date (newest first)
    deduped.sort((a, b) => {
      if (!a.publishedAt) return 1;
      if (!b.publishedAt) return -1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    const data: TwitterRssData = {
      items: deduped.slice(0, 50),
      accountsTracked: TARGET_ACCOUNTS.length,
      successfulFeeds,
      timestamp,
    };

    this.cache = data;
    this.cacheTime = Date.now();
    return data;
  }

  private async fetchFromInstance(
    instance: string,
  ): Promise<TwitterRssItem[]> {
    const items: TwitterRssItem[] = [];

    // Fetch a few key accounts per instance (limit to avoid rate limiting)
    const accountsToFetch = TARGET_ACCOUNTS.slice(0, 5);

    for (const account of accountsToFetch) {
      try {
        const rssUrl = `${instance}/${account}/rss`;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch(rssUrl, {
          headers: {
            Accept: "application/rss+xml, application/xml, text/xml",
            "User-Agent": "NODIN-Bot/1.0",
          },
          signal: ctrl.signal,
        });
        clearTimeout(t);

        if (!res.ok) continue;
        const xml = await res.text();
        const parsed = this.parseRss(xml, account);
        items.push(...parsed);
      } catch {
        continue;
      }
    }

    return items;
  }

  private parseRss(xml: string, account: string): TwitterRssItem[] {
    const items: TwitterRssItem[] = [];

    // Simple regex RSS parser (no external XML parser dependency)
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const title = this.extractTag(itemXml, "title");
      const link = this.extractTag(itemXml, "link");
      const pubDate = this.extractTag(itemXml, "pubDate");
      const description = this.extractTag(itemXml, "description");

      // Clean up content (remove HTML tags from description)
      const rawContent = title ?? description ?? "";
      const content = rawContent.replace(/<[^>]+>/g, "").trim();

      if (content) {
        items.push({
          account: this.accountDisplayName(account),
          handle: `@${account}`,
          content,
          url: link || "",
          publishedAt: pubDate || null,
          source: "Twitter RSS" as const,
        });
      }
    }

    return items;
  }

  private extractTag(xml: string, tag: string): string | null {
    const re = new RegExp(
      `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
      "i",
    );
    const m = xml.match(re);
    return m ? m[1].trim() : null;
  }

  private accountDisplayName(handle: string): string {
    const names: Record<string, string> = {
      solana: "Solana",
      SolanaFndn: "Solana Foundation",
      aeyakovenko: "Anatoly Yakovenko",
      rajgokal: "Raj Gokal",
      jito_labs: "Jito",
      JupiterExchange: "Jupiter",
      DriftProtocol: "Drift",
      heliuslabs: "Helius",
      SolanaStatus: "Solana Status",
      magineden: "Magic Eden",
      TensorProtocol: "Tensor",
      PythNetwork: "Pyth",
      MarinadeFinance: "Marinade",
      KaminoFinance: "Kamino",
      ORCAProtocol: "Orca",
      MeteoraAG: "Meteora",
      Sanctus_labs: "Sanctum",
    };
    return names[handle] || handle;
  }

  protected async fetchCapability(
    capability: string,
  ): Promise<unknown> {
    const data = await this.fetchData();
    switch (capability) {
      case "news":
      case "announcements":
      case "sentiment":
        return data.items;
      default:
        return null;
    }
  }

  async checkHealth(): Promise<SourceHealthCheck> {
    const start = Date.now();
    try {
      const data = await this.fetchData();
      return {
        sourceId: this.sourceId,
        status: data.successfulFeeds > 0 ? "healthy" : "unavailable",
        checkedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
      };
    } catch {
      return {
        sourceId: this.sourceId,
        status: "unavailable",
        checkedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
        error: "RSS fetch failed",
      };
    }
  }
}
