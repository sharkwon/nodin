/** 
 * Public off-chain data clients (DeFiLlama, CoinGecko, Solana news RSS,
 * GitHub, stablecoin tracker, Twitter/X). All keyless.
 * Replacements for the report.
 */
import type { TweetItem } from "./types.js";

const TIMEOUT_MS = 8000;

// ── Shared cache for /protocols (used by 4+ consumers per pulse) ──
type V2Protocol = {
  id: string; name: string; category: string; tvl: number;
  chainTvls?: Record<string, number>; chains?: string[]; slug?: string;
  change_1d?: number; change_7d?: number; description?: string; mcap?: number;
  url?: string; twitter?: string; symbol?: string;
};
let v2Cache: { at: number; data: V2Protocol[] } | null = null;
const V2_TTL = 60_000;

async function getV2Protocols(): Promise<V2Protocol[]> {
  const now = Date.now();
  if (v2Cache && now - v2Cache.at < V2_TTL && v2Cache.data.length > 0) return v2Cache.data;
  const data = await getJson<V2Protocol[]>("https://api.llama.fi/protocols", []);
  if (data.length > 0) v2Cache = { at: now, data };
  return data;
}

async function getText(url: string, fallback = ""): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "text/html,application/xml,application/json", "User-Agent": "insight-agent/1.0" },
    });
    clearTimeout(t);
    if (!res.ok) return fallback;
    return await res.text();
  } catch {
    return fallback;
  }
}

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "insight-agent/1.0" },
    });
    clearTimeout(t);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export const defiLlama = {
  solanaTvl: () =>
    getJson<{ name: string; tvl: number }[]>("https://api.llama.fi/v2/chains", []).then((all) =>
      all.find((c) => c.name === "Solana")?.tvl ?? 0
    ),
  solanaProtocols: () =>
    getJson<LlamaProtocol[]>("https://api.llama.fi/protocols", []).then((all) =>
      all.filter((p) => (p.chains || []).includes("Solana"))
    ),
  // Stablecoin supply on Solana (USDC/USDT + others) — keyless.
  stablecoinSupply: async (): Promise<number> => {
    const data = await getJson<{ peggedAssets: { symbol: string; chainCirculating: Record<string, { current?: { peggedUSD?: number } }> }[] }>(
      "https://stablecoins.llama.fi/stablecoins?includePrices=true",
      { peggedAssets: [] }
    );
    let total = 0;
    for (const asset of data.peggedAssets) {
      const sol = asset.chainCirculating?.["Solana"];
      total += sol?.current?.peggedUSD ?? 0;
    }
    return total;
  },
};

// ── CoinGecko rate-limit-resilient cache ──
let cgPriceCache: { at: number; data: { price: number; change24h: number; marketCap: number } } | null = null;
const CG_TTL = 30_000;

export const coinGecko = {
  solPrice: async () => {
    const now = Date.now();
    if (cgPriceCache && now - cgPriceCache.at < CG_TTL && cgPriceCache.data.price > 0) {
      return cgPriceCache.data;
    }
    const r = await getJson<{ solana?: { usd: number; usd_24h_change: number; usd_market_cap: number } }>(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true",
      {}
    );
    const result = {
      price: r.solana?.usd ?? 0,
      change24h: r.solana?.usd_24h_change ?? 0,
      marketCap: r.solana?.usd_market_cap ?? 0,
    };
    // Fallback to DeFiLlama coins API when CoinGecko is rate-limited (returns price 0).
    // DeFiLlama has no daily-change/market-cap, so keep the last cached values for those.
    if (result.price <= 0) {
      try {
        const llama = await getJson<{ coins?: Record<string, { price: number }> }>(
          "https://coins.llama.fi/prices/current/coingecko:solana",
          {}
        );
        const p = llama.coins?.["coingecko:solana"]?.price ?? 0;
        if (p > 0) {
          result.price = p;
          result.change24h = cgPriceCache?.data.change24h ?? 0;
          result.marketCap = cgPriceCache?.data.marketCap ?? 0;
        }
      } catch {}
    }
    if (result.price > 0) cgPriceCache = { at: now, data: result };
    return result;
  },

  solPriceHistory7d: () =>
    getJson<{ prices?: [number, number][] }>(
      "https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=7",
      {}
    ).then((r) => {
      const prices = r.prices || [];
      // Downsample to ~24 points (one per ~7 hours)
      const step = Math.max(1, Math.floor(prices.length / 24));
      const sampled: { t: number; price: number }[] = [];
      for (let i = 0; i < prices.length; i += step) {
        sampled.push({ t: prices[i][0], price: prices[i][1] });
      }
      // Always include last point
      if (sampled.length > 0 && prices.length > 0) {
        const last = prices[prices.length - 1];
        if (sampled[sampled.length - 1].t !== last[0]) {
          sampled.push({ t: last[0], price: last[1] });
        }
      }
      return sampled;
    }),
};

export const defiLlamaCharts = {
  // Solana DEX volume via DeFiLlama overview/dexs (keyless).
  solanaVolume: () =>
    getJson<{ total24h?: number }>(
      "https://api.llama.fi/overview/dexs/Solana?dataType=dailyVolume",
      {}
    ).then((r) => r.total24h ?? 0),
};

/* ════════════════════════════════════════════════════════════════════════════
   SOLANA MARKET DATA — tokenized stocks, sector breakdown, gainers/losers,
   launchpad revenue, ETF flow. All Solana-only, keyless.
   ════════════════════════════════════════════════════════════════════════════ */

export interface SolanaSectorBreakdown {
  category: string;
  tvl: number;
  pct: number;
  topProtocols: { name: string; tvl: number }[];
}

export interface SolanaTokenizedStock {
  name: string;
  category: string;
  tvl: number;
  chain: string;
  module: string;
}

export interface SolanaGainerLoser {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}

export interface SolanaLaunchpad {
  name: string;
  category: string;
  tvl: number;
  chain: string;
  revenue24h: number;
  revenue7d: number;
}

export interface DexVolumeItem {
  name: string;
  slug: string;
  volume24h: number;
  change_1d: number;
  change_7d: number;
}

export interface StablecoinItem {
  name: string;
  symbol: string;
  pegType: string;
  circulating: number;
  price: number;
}

export interface FeeRevenueItem {
  name: string;
  slug: string;
  revenue24h: number;
  revenue7d: number;
  change_1d: number;
}

export interface SolanaEtfFlow {
  ticker: string;
  name: string;
  aum: number;
  currentFlow: number;
  totalNetFlow: number;
  volume: number;
  staking: boolean;
  dailyFlows: { date: string; flow: number }[];
}

export interface ProtocolListItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  solanaTvl: number;
  totalTvl: number;
  description?: string;
}

export interface ProtocolDetail {
  id: string;
  name: string;
  slug: string;
  category: string;
  solanaTvl: number;
  totalTvl: number;
  description: string;
  chains: string[];
  change_1d?: number;
  change_7d?: number;
  mcap?: number;
  gecko_id?: string;
  url?: string;
  twitter?: string;
  audit_links?: string[];
  parentProtocols?: string[];
  misc?: Record<string, string>;
}

// Blockworks-style category mapping
export const SOLANA_CATEGORIES: Record<string, string[]> = {
  "Spot DEXs": ["Dexs", "AMM"],
  "Perp DEXs": ["Derivatives"],
  "Lending": ["Lending", "CDP", "NFT Lending"],
  "Vaults": ["Yield Aggregator", "Yield", "Liquidity manager"],
  "Launchpads": ["Launchpad"],
  "Liquid Staking": ["Liquid Staking", "Liquid Restaking", "Restaking", "Staking Pool"],
  "Real-World Assets": ["RWA", "RWA Lending"],
  "Bridges": ["Bridge", "Cross Chain Bridge"],
  "Oracles": ["Oracle"],
  "Prediction Markets": ["Prediction Market"],
  "Synthetics": ["Synthetics"],
  "Options": ["Options", "Options Vault"],
  "Insurance": ["Insurance"],
  "NFT Marketplace": ["NFT Marketplace"],
  "Stablecoins": ["Stablecoins"],
};

export const solanaMarketData = {
  // List all Solana protocols grouped by Blockworks-style categories
  protocolDirectory: async (): Promise<Record<string, ProtocolListItem[]>> => {
    const all = await getV2Protocols();
    // Filter Solana protocols: use chains array (more reliable than chainTvls for NFT/Oracle/etc)
    // Exclude CEX — they hold Solana assets but aren't on-chain protocols
    const solProtocols = all.filter((p) => {
      const chains = p.chains || [];
      if (!chains.includes("Solana")) return false;
      if (p.category === "CEX") return false;
      return true;
    });
    const result: Record<string, ProtocolListItem[]> = {};
    for (const [bwCat, dlCats] of Object.entries(SOLANA_CATEGORIES)) {
      const matches = solProtocols
        .filter((p) => dlCats.some((dc) => p.category === dc))
        .map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug || p.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9.-]/g, ""),
          category: p.category,
          solanaTvl: typeof p.chainTvls?.["Solana"] === "number" ? p.chainTvls["Solana"] : 0,
          totalTvl: p.tvl || 0,
        }))
        .sort((a, b) => b.solanaTvl - a.solanaTvl);

      // For Launchpads: also include fee-only protocols (pump.fun, BONK.fun etc.) that have 0 TVL
      if (bwCat === "Launchpads") {
        const feeData = await getJson<{
          protocols: { displayName?: string; name?: string; chains?: string[]; total24h?: number; category?: string }[];
        }>("https://api.llama.fi/overview/fees", { protocols: [] });
        const seen = new Set(matches.map((m) => m.name.toLowerCase()));
        for (const p of feeData.protocols) {
          const chains = p.chains || [];
          if (!chains.includes("Solana")) continue;
          if (p.category !== "Launchpad") continue;
          const name = p.displayName || p.name || "";
          if (seen.has(name.toLowerCase())) continue;
          const rev = p.total24h ?? 0;
          if (rev <= 0) continue;
          seen.add(name.toLowerCase());
          matches.push({
            id: "0",
            name,
            slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9.-]/g, ""),
            category: "Launchpad",
            solanaTvl: 0,
            totalTvl: rev,
          });
        }
        matches.sort((a, b) => b.totalTvl - a.totalTvl);
      }

      if (matches.length > 0) result[bwCat] = matches;
    }
    return result;
  },

  // Get detailed info for a single protocol
  protocolDetail: async (slug: string): Promise<ProtocolDetail | null> => {
    const detail = await getJson<{
      id: string; name: string; slug?: string; category: string; description?: string;
      chains?: string[]; url?: string; twitter?: string; mcap?: number; gecko_id?: string;
      chainTvls?: Record<string, { tvl?: any; tokensInUsd?: any; tokens?: any }>;
      parentProtocol?: string; parentProtocolSlug?: string; audit_links?: string[];
      audits?: string; hacks?: any[]; otherProtocols?: string[]; tags?: string[];
      symbol?: string; openSource?: boolean; tvl?: any; currentChainTvls?: Record<string, number>;
      parentProtocols?: string[]; misc?: Record<string, string>;
    }>(`https://api.llama.fi/protocol/${slug}`, null as any);
    if (!detail) return null;

    // Solana TVL from chainTvls history or currentChainTvls
    const ct = detail.chainTvls;
    let solTvl = 0;
    const tvlArr = ct && ct["Solana"] ? ct["Solana"].tvl : null;
    if (Array.isArray(tvlArr) && tvlArr.length > 0) {
      const last = tvlArr[tvlArr.length - 1];
      solTvl = typeof last === "object" && last ? (last.totalLiquidityUSD ?? 0) : 0;
    } else if (detail.currentChainTvls && typeof detail.currentChainTvls["Solana"] === "number") {
      solTvl = detail.currentChainTvls["Solana"];
    }

    // Total TVL — extract from tvl history array
    let totalTvl = 0;
    const fullTvl = detail.tvl;
    if (Array.isArray(fullTvl) && fullTvl.length > 0) {
      const last = fullTvl[fullTvl.length - 1];
      totalTvl = typeof last === "object" && last ? (last.totalLiquidityUSD ?? 0) : 0;
    } else if (typeof fullTvl === "number") {
      totalTvl = fullTvl;
    }
    if (totalTvl === 0) totalTvl = solTvl;

    // Compute 1d/7d changes from history
    let change_1d: number | undefined;
    let change_7d: number | undefined;
    const histArr = Array.isArray(tvlArr) ? tvlArr : (Array.isArray(fullTvl) ? fullTvl : []);
    if (histArr.length >= 2) {
      const last = histArr[histArr.length - 1];
      const prev1 = histArr[histArr.length - 2];
      const lastVal = typeof last === "object" ? last?.totalLiquidityUSD : 0;
      const prev1Val = typeof prev1 === "object" ? prev1?.totalLiquidityUSD : 0;
      if (prev1Val && prev1Val > 0) change_1d = ((lastVal - prev1Val) / prev1Val) * 100;
    }
    if (histArr.length >= 8) {
      const last = histArr[histArr.length - 1];
      const prev7 = histArr[histArr.length - 8];
      const lastVal = typeof last === "object" ? last?.totalLiquidityUSD : 0;
      const prev7Val = typeof prev7 === "object" ? prev7?.totalLiquidityUSD : 0;
      if (prev7Val && prev7Val > 0) change_7d = ((lastVal - prev7Val) / prev7Val) * 100;
    }

    // Build misc metadata
    const misc: Record<string, string> = {};
    if (detail.symbol) misc["Token"] = detail.symbol;
    if (detail.openSource != null) misc["Open Source"] = detail.openSource ? "Yes" : "No";
    if (detail.audits) misc["Audit Count"] = detail.audits;
    if (detail.hacks && detail.hacks.length > 0) misc["Past Hacks"] = `${detail.hacks.length}`;
    if (detail.tags && detail.tags.length > 0) misc["Tags"] = detail.tags.join(", ");
    if (detail.otherProtocols && detail.otherProtocols.length > 0) misc["Related Protocols"] = detail.otherProtocols.join(", ");

    // Parent protocols
    const parentProtocols = detail.parentProtocol
      ? [detail.parentProtocol.replace(/^parent#/, "")]
      : (detail.parentProtocols || []);

    return {
      id: detail.id,
      name: detail.name,
      slug: detail.slug || slug,
      category: detail.category,
      solanaTvl: solTvl,
      totalTvl,
      description: detail.description ?? "",
      chains: detail.chains ?? [],
      change_1d,
      change_7d,
      mcap: detail.mcap ?? undefined,
      gecko_id: detail.gecko_id,
      url: detail.url,
      twitter: detail.twitter,
      audit_links: detail.audit_links,
      parentProtocols,
      misc: Object.keys(misc).length > 0 ? misc : undefined,
    };
  },

  // Historical TVL chart data for a single protocol (Solana-specific)
  protocolTvlChart: async (slug: string, rangeDays = 90): Promise<{ date: number; tvl: number }[]> => {
    const detail = await getJson<{
      chainTvls?: Record<string, { tvl?: any }>;
    }>(`https://api.llama.fi/protocol/${slug}`, null as any);
    if (!detail?.chainTvls?.["Solana"]) return [];
    const tvlArr = detail.chainTvls["Solana"].tvl;
    if (!Array.isArray(tvlArr) || !tvlArr.length) return [];
    const cutoff = Date.now() / 1000 - rangeDays * 86400;
    const filtered = tvlArr
      .filter((p: any) => typeof p === "object" && p.date >= cutoff && typeof p.totalLiquidityUSD === "number")
      .map((p: any) => ({ date: p.date, tvl: p.totalLiquidityUSD }));
    if (!filtered.length) return [];
    // Downsample to ~60 points max
    const step = Math.max(1, Math.floor(filtered.length / 60));
    const sampled: { date: number; tvl: number }[] = [];
    for (let i = 0; i < filtered.length; i += step) {
      sampled.push(filtered[i]);
    }
    // Always include last point
    const last = filtered[filtered.length - 1];
    if (sampled.length > 0 && sampled[sampled.length - 1].date !== last.date) {
      sampled.push(last);
    }
    return sampled;
  },

  sectorBreakdown: async (): Promise<SolanaSectorBreakdown[]> => {
    const all = await getV2Protocols();
    // Use chains array (more reliable), exclude CEX
    const sol = all
      .filter((p) => (p.chains || []).includes("Solana") && p.category !== "CEX")
      .map((p) => ({ name: p.name, category: p.category || "unknown", tvl: typeof p.chainTvls?.["Solana"] === "number" ? p.chainTvls["Solana"] : 0 }));
    const cats: Record<string, { tvl: number; protocols: { name: string; tvl: number }[] }> = {};
    for (const p of sol) {
      const c = p.category || "unknown";
      if (!cats[c]) cats[c] = { tvl: 0, protocols: [] };
      cats[c].tvl += p.tvl;
      cats[c].protocols.push({ name: p.name, tvl: p.tvl });
    }
    const total = Object.values(cats).reduce((s, c) => s + c.tvl, 0) || 1;
    return Object.entries(cats)
      .map(([category, data]) => ({
        category,
        tvl: data.tvl,
        pct: (data.tvl / total) * 100,
        topProtocols: data.protocols.sort((a, b) => b.tvl - a.tvl).slice(0, 5),
      }))
      .sort((a, b) => b.tvl - a.tvl);
  },

  // Tokenized stocks / RWA on Solana
  tokenizedStocks: async (): Promise<SolanaTokenizedStock[]> => {
    const all = await getV2Protocols();
    return all
      .filter((p) => p.category === "RWA" && (p.chains || []).includes("Solana"))
      .map((p) => ({
        name: p.name,
        category: p.category,
        tvl: typeof p.chainTvls?.["Solana"] === "number" ? p.chainTvls["Solana"] : 0,
        chain: "Solana",
        module: p.id,
      }))
      .sort((a, b) => b.tvl - a.tvl);
  },

  gainersLosers: async (): Promise<{ gainers: SolanaGainerLoser[]; losers: SolanaGainerLoser[] }> => {
    const data = await getJson<{
      symbol?: string;
      name?: string;
      current_price?: number;
      price_change_percentage_24h?: number;
      market_cap?: number;
      total_volume?: number;
    }[]>(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h",
      []
    );
    // Exclude bridged/wrapped tokens from other chains + stablecoins
    const BRIDGED = new Set(["wbtc", "cbbtc", "link", "aave", "wlfi", "usdt", "usdc", "usds", "usde", "usdg", "usyc", "pyusd", "buidl", "usdy", "susde", "usdgo", "syrupusdc", "usd1", "stusdc", "usdsr", "ena", "ohm"]);
    const isStable = (p?: number, ch?: number) => p != null && p > 0.9 && p < 1.2 && Math.abs(ch ?? 0) < 1.5;
    const coins: SolanaGainerLoser[] = data
      .filter((c) => {
        const sym = (c.symbol || "").toLowerCase();
        if (BRIDGED.has(sym)) return false;
        if (isStable(c.current_price, c.price_change_percentage_24h)) return false;
        return true;
      })
      .map((c) => ({
        symbol: (c.symbol || "").toUpperCase(),
        name: c.name || "",
        price: c.current_price || 0,
        change24h: c.price_change_percentage_24h || 0,
        marketCap: c.market_cap || 0,
        volume24h: c.total_volume || 0,
      }));
    const sorted = [...coins].sort((a, b) => b.change24h - a.change24h);
    return {
      gainers: sorted.filter((c) => c.change24h > 0).slice(0, 5),
      losers: sorted.filter((c) => c.change24h < 0).reverse().slice(0, 5),
    };
  },

  // Top Solana launchpads & token platforms — hardcoded by real-world relevance, TVL from v2/protocols
  launchpads: async (): Promise<SolanaLaunchpad[]> => {
    const all = await getV2Protocols();
    // Also fetch fee data for revenue context
    const feeData = await getJson<{
      protocols: { displayName?: string; name?: string; chains?: string[]; total24h?: number; total7d?: number; category?: string }[];
    }>("https://api.llama.fi/overview/fees", { protocols: [] });
    const feeMap = new Map<string, { revenue24h: number; revenue7d: number }>();
    for (const p of feeData.protocols) {
      const chains = p.chains || [];
      if (!chains.includes("Solana")) continue;
      const name = (p.displayName || p.name || "").toLowerCase();
      const f24 = p.total24h ?? 0;
      const f7d = p.total7d ?? 0;
      if (f24 > 0 || f7d > 0) feeMap.set(name, { revenue24h: f24, revenue7d: f7d });
    }

    // Launchpads on Solana (use chains array, not chainTvls)
    const seen = new Set<string>();
    const out: SolanaLaunchpad[] = all
      .filter((p) => p.category === "Launchpad" && (p.chains || []).includes("Solana"))
      .map((p) => {
        const solTvl = typeof p.chainTvls?.["Solana"] === "number" ? p.chainTvls["Solana"] : 0;
        const fees = feeMap.get((p.name || "").toLowerCase());
        seen.add((p.name || "").toLowerCase());
        return {
          name: p.name,
          category: p.category,
          tvl: solTvl,
          chain: "Solana",
          revenue24h: fees?.revenue24h ?? 0,
          revenue7d: fees?.revenue7d ?? 0,
        };
      });

    // Also include fee-only launchpads (no TVL but significant revenue)
    // Dynamically from overview/fees, not hardcoded
    for (const p of feeData.protocols) {
      const chains = p.chains || [];
      if (!chains.includes("Solana")) continue;
      if (p.category !== "Launchpad") continue;
      const name = p.displayName || p.name || "";
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      const f24 = p.total24h ?? 0;
      const f7d = p.total7d ?? 0;
      if (f24 > 0 || f7d > 0) {
        seen.add(key);
        out.push({
          name,
          category: "Launchpad",
          tvl: 0,
          chain: "Solana",
          revenue24h: f24,
          revenue7d: f7d,
        });
      }
    }

    return out.sort((a, b) => b.tvl + b.revenue24h - (a.tvl + a.revenue24h)).slice(0, 12);
  },

  // Solana ETF flow — scraped from SolanaFloor RSC payload (Solana-only)
  // Solana DEX volume leaderboard — 24h volume per DEX (Solana chain only)
  dexVolumeLeaderboard: async (): Promise<DexVolumeItem[]> => {
    const data = await getJson<{
      protocols: {
        displayName?: string; name?: string; slug?: string;
        breakdown24h?: Record<string, Record<string, number>> | null;
        change_1d?: number; change_7d?: number;
      }[];
    }>("https://api.llama.fi/overview/dexs?dataType=dailyVolume", { protocols: [] });

    const out: DexVolumeItem[] = [];
    for (const p of data.protocols) {
      const bd = p.breakdown24h;
      if (!bd) continue;
      const sol = bd["solana"];
      if (!sol || typeof sol !== "object") continue;
      const vol = Object.values(sol).reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
      if (vol > 0) {
        out.push({
          name: p.displayName || p.name || "",
          slug: p.slug || "",
          volume24h: vol,
          change_1d: p.change_1d ?? 0,
          change_7d: p.change_7d ?? 0,
        });
      }
    }
    return out.sort((a, b) => b.volume24h - a.volume24h).slice(0, 20);
  },

  // Stablecoin breakdown on Solana — per token circulating supply
  stablecoinBreakdown: async (): Promise<StablecoinItem[]> => {
    const data = await getJson<{
      peggedAssets: {
        name?: string; symbol?: string; pegType?: string; price?: number;
        chainCirculating?: Record<string, { current?: { peggedUSD?: number } }>;
      }[];
    }>("https://stablecoins.llama.fi/stablecoins?includePrices=true", { peggedAssets: [] });

    const out: StablecoinItem[] = [];
    for (const a of data.peggedAssets) {
      const sol = a.chainCirculating?.["Solana"];
      const circ = sol?.current?.peggedUSD ?? 0;
      if (circ > 0) {
        out.push({
          name: a.name || "",
          symbol: a.symbol || "",
          pegType: a.pegType || "",
          circulating: circ,
          price: a.price ?? 1,
        });
      }
    }
    return out.sort((a, b) => b.circulating - a.circulating);
  },

  // Revenue leaderboard — Solana protocols by 24h revenue
  feeRevenueLeaderboard: async (): Promise<FeeRevenueItem[]> => {
    const data = await getJson<{
      protocols: {
        displayName?: string; name?: string; defillamaId?: string; slug?: string;
        chains?: string[]; total24h?: number; total7d?: number;
        change_1d?: number;
      }[];
    }>("https://api.llama.fi/overview/fees", { protocols: [] });

    const out: FeeRevenueItem[] = [];
    for (const p of data.protocols) {
      const chains = p.chains || [];
      if (!chains.includes("Solana")) continue;
      const rev24h = p.total24h ?? 0;
      if (rev24h <= 0) continue;
      out.push({
        name: p.displayName || p.name || "",
        slug: p.slug || p.defillamaId || "",
        revenue24h: rev24h,
        revenue7d: p.total7d ?? 0,
        change_1d: p.change_1d ?? 0,
      });
    }
    return out.sort((a, b) => b.revenue24h - a.revenue24h).slice(0, 20);
  },

  // Historical Solana network TVL (90 days, downsampled)
  solanaTvlHistory: async (rangeDays = 90): Promise<{ date: number; tvl: number }[]> => {
    const data = await getJson<{ date: number; tvl: number }[]>(
      "https://api.llama.fi/v2/historicalChainTvl/Solana",
      []
    );
    if (!data.length) return [];
    const cutoff = Date.now() / 1000 - rangeDays * 86400;
    const filtered = data.filter((p) => p.date >= cutoff);
    if (!filtered.length) return [];
    const step = Math.max(1, Math.floor(filtered.length / 60));
    const sampled: { date: number; tvl: number }[] = [];
    for (let i = 0; i < filtered.length; i += step) {
      sampled.push(filtered[i]);
    }
    const last = filtered[filtered.length - 1];
    if (sampled.length > 0 && sampled[sampled.length - 1].date !== last.date) {
      sampled.push(last);
    }
    return sampled;
  },

  etfFlow: async (): Promise<SolanaEtfFlow[]> => {
    const html = await getText("https://solanafloor.com/etf-tracker");
    if (!html) return [];
    // Extract RSC push chunks
    const chunkRe = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
    let full = "";
    let m;
    while ((m = chunkRe.exec(html)) !== null) {
      full += m[1];
    }
    // Unescape
    full = full.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\//g, "/");
    // Find solanaEtfs array
    const idx = full.indexOf('"solanaEtfs":[');
    if (idx === -1) return [];
    const start = full.indexOf("[", idx);
    if (start === -1) return [];
    // Find matching ] by counting brackets
    let depth = 0;
    let end = start;
    let inStr = false;
    let esc = false;
    for (let i = start; i < full.length; i++) {
      const c = full[i];
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === "[") depth++;
      else if (c === "]") { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    try {
      const arr = JSON.parse(full.slice(start, end)) as Array<{
        ticker: string; name: string; current_aum: number;
        current_flow: number; total_net_flows: number; volume: number;
        staking: boolean;
        solana_etf_flows: { date: string; net_flow_value: number }[];
      }>;
      // Filter out "All Issuers" aggregate
      return arr
        .filter((e) => e.ticker && e.ticker !== "All")
        .map((e) => ({
          ticker: e.ticker,
          name: e.name,
          aum: e.current_aum || 0,
          currentFlow: e.current_flow || 0,
          totalNetFlow: e.total_net_flows || 0,
          volume: e.volume || 0,
          staking: e.staking || false,
          dailyFlows: (e.solana_etf_flows || []).map((f) => ({ date: f.date, flow: f.net_flow_value })),
        }));
    } catch {
      return [];
    }
  },
};

/* ---------- Solana official news (RSS from solana.com, keyless) ---------- */

export interface RssNewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
}

function unescapeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export const solanaNews = {
  latest: async (limit = 12): Promise<RssNewsItem[]> => {
    // Source 1: solana.com RSS
    const xml = await getText("https://solana.com/news/rss.xml");
    const items: RssNewsItem[] = [];
    if (xml) {
      const itemRe = /<item>([\s\S]*?)<\/item>/g;
      let m: RegExpExecArray | null;
      while ((m = itemRe.exec(xml)) !== null && items.length < limit) {
        const block = m[1];
        const title = unescapeXml(block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)![1] ?? "");
        const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "";
        const guid = block.match(/<guid>([\s\S]*?)<\/guid>/)?.[1] ?? "";
        const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
        const desc = unescapeXml(block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)![1] ?? "");
        const img = block.match(/<enclosure[^>]*url="([^"]+)"/)?.[1];
        if (!link) continue;
        items.push({
          id: guid || link,
          title,
          summary: desc,
          url: link,
          imageUrl: img,
          publishedAt: pubDate,
        });
      }
    }

    // Source 2: SolanaFloor CMS API (Directus)
    if (items.length < limit) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        const res = await fetch("https://cms.solanafloor.com/items/articles?limit=" + (limit - items.length) + "&sort=-date&fields=id,title,slug,date,image", {
          signal: ctrl.signal,
          headers: { Accept: "application/json", "User-Agent": "insight-agent/1.0" },
        });
        clearTimeout(t);
        if (res.ok) {
          const data = await res.json() as { data: { id: string; title: string; slug: string; date: string; image?: string }[] };
          for (const a of data.data) {
            if (items.length >= limit) break;
            items.push({
              id: "sf-" + a.id,
              title: a.title,
              summary: "",
              url: "https://solanafloor.com/news/" + a.slug,
              imageUrl: a.image ? `https://img.solanafloor.com/unsafe/s-512/plain/https%3A%2F%2Fcms.solanafloor.com%2Fassets%2F${a.image}` : undefined,
              publishedAt: a.date,
            });
          }
        }
      } catch {
        // SolanaFloor API blocked or rate-limited — skip
      }
    }

    return items.slice(0, limit);
  },
};

// ---------- GitHub SIMD tracker (keyless API) ----------
export const simdGithub = {
  latest: async (limit = 16) => {
    const data = await getJson<
      { number: number; title: string; state: string; html_url: string; created_at: string; labels?: { name: string }[] }[]
    >("https://api.github.com/repos/solana-foundation/solana-improvement-documents/pulls?state=all&per_page=60", []);
    return data
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, limit)
      .map((p) => ({
        number: p.number,
        title: p.title,
        state: p.state,
        url: p.html_url,
        created_at: p.created_at,
        label: (p.labels || []).map((l) => l.name).join(", ") || "proposal",
      }));
  },
};

// ---------- Twitter/X (keyless syndication best-effort, graceful fallback) ----------
export const twitterPublic = {
  timeline: async (screenName: string): Promise<TweetItem[]> => {
    const html = await getText(
      `https://cdn.syndication.twimg.com/widgets/timelines/?screen_name=${screenName}&lang=en`
    );
    const out: TweetItem[] = [];
    // fallback: try the profile widget route
    if (!html) return out;
    const re = /<li[^>]*data-tweet-id="(\d+)"[^>]*>([\s\S]*?)<\/li>/g;
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(html)) !== null && guard++ < 15) {
      const id = m[1];
      const body = m[2];
      const text = (body.match(/<p[^>]*>([\s\S]*?)<\/p>/) || [])[1] || "";
      const clean = text.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
      if (!clean) continue;
      // Filter out RTs, replies, and spaces — only real news content
      if (/^RT\b/i.test(clean)) continue;           // retweets
      if (/^@\w+/.test(clean)) continue;             // replies (starts with @mention)
      if (/^Replying to/i.test(clean)) continue;     // reply header
      if (/\b(space|spaces|audio)\b/i.test(clean) && clean.length < 100) continue; // space tweets
      out.push({
        id,
        author: screenName,
        handle: screenName,
        content: clean,
        time: "",
        url: `https://twitter.com/${screenName}/status/${id}`,
      });
    }
    return out;
  },
};

export interface LlamaProtocol {
  name: string;
  slug: string;
  tvl: number;
  chains: string[];
  category: string;
  change_1d?: number;
  change_7d?: number;
  mcap?: number;
}