/**
 * live-data.ts — Multi-source free API fallback system
 *
 * Each data type tries sources one by one. If source A fails → try B → try C → mock.
 * All sources are free, no API keys required.
 *
 * Sources used:
 *   1. Backend (localhost:3000/api/*)
 *   2. Solana public RPC (api.mainnet-beta.solana.com) — free, CORS-enabled
 *   3. CoinGecko free API — free, CORS-enabled
 *   4. DeFiLlama API — free, CORS-enabled
 *   5. Mock data (last resort)
 */

import apiClient from "./api-client";
import type { NetworkSnapshot, NewsItem, TweetItem } from "./nodin";

/* ── Types ── */

export interface LiveNetworkData {
  tps: number;
  blockHeight: number | null;
  epoch: number | null;
  slotIndex: number | null;
  slotsInEpoch: number | null;
  slotTimeMs: number | null;
  validatorsActive: number | null;
  validatorsDelinquent: number | null;
  totalStake: number | null;
  transactionCount: number | null;
  health: string;
  source: string;
  timestamp: string;
}

export interface LivePriceData {
  price: number;
  change24h: number;
  source: string;
}

export interface LiveTvlData {
  tvl: number;
  source: string;
}

export interface LiveNewsData {
  news: NewsItem[];
  tweets: TweetItem[];
  source: string;
}

export interface LiveEtfData {
  totalHoldings: number | null;
  source: string;
}

/* ── Fallback runner — tries each source in order ── */

async function withFallbacks<T>(
  sources: { name: string; fetch: () => Promise<T> }[]
): Promise<{ data: T; source: string }> {
  let lastError: unknown;
  for (const s of sources) {
    try {
      const data = await s.fetch();
      return { data, source: s.name };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error("All sources failed");
}

/* ════════════════════════════════════════════════════════════════════════════
   1. NETWORK DATA — TPS, block height, epoch, validators
   Sources: backend → Solana RPC direct → mock
   ════════════════════════════════════════════════════════════════════════════ */

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

async function rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method} failed: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export async function fetchNetworkData(): Promise<LiveNetworkData> {
  const { data } = await withFallbacks<LiveNetworkData>([
    {
      name: "backend",
      fetch: async () => {
        const res = await apiClient.get<NetworkSnapshot>("/network/snapshot");
        const s = res.data;
        return {
          tps: s.tps ?? 0,
          blockHeight: s.blockHeight,
          epoch: s.epoch?.epoch ?? null,
          slotIndex: s.epoch?.slotIndex ?? null,
          slotsInEpoch: s.epoch?.slotsInEpoch ?? null,
          slotTimeMs: s.slotTimeMs,
          validatorsActive: s.validators?.active ?? null,
          validatorsDelinquent: s.validators?.delinquent ?? null,
          totalStake: s.validators?.totalStake ?? null,
          transactionCount: null,
          health: s.health,
          source: "backend",
          timestamp: s.timestamp,
        };
      },
    },
    {
      name: "solana-rpc",
      fetch: async () => {
        // Fire all RPC calls in parallel
        const [epochInfo, voteAccounts, perfSamples, blockHash] =
        await Promise.all([
          rpcCall<{
            epoch: number;
            slotIndex: number;
            slotsInEpoch: number;
            absoluteSlot: number;
            blockHeight: number;
          }>("getEpochInfo"),
            rpcCall<{
              current: Array<{ activatedStake: number }>;
              delinquent: Array<{ activatedStake: number }>;
            }>("getVoteAccounts"),
            rpcCall<
              Array<{
                numSlots: number;
                numTransactions: number;
                samplePeriodSecs: number;
              }>
            >("getRecentPerformanceSamples", [5]),
            rpcCall<{ blockHeight: number }>("getBlockHeight"),
          ]);

        const activeCount = voteAccounts.current.length;
        const delinquentCount = voteAccounts.delinquent.length;
        const totalStake = [...voteAccounts.current, ...voteAccounts.delinquent]
          .reduce((sum, v) => sum + v.activatedStake, 0);

        // TPS from perf samples
        let tps = 0;
        if (perfSamples.length > 0) {
          const totalTx = perfSamples.reduce(
            (sum, s) => sum + s.numTransactions,
            0
          );
          const totalSecs = perfSamples.reduce(
            (sum, s) => sum + s.samplePeriodSecs,
            0
          );
          tps = totalSecs > 0 ? totalTx / totalSecs : 0;
        }

        return {
          tps: Math.round(tps),
          blockHeight: blockHash.blockHeight ?? epochInfo.blockHeight,
          epoch: epochInfo.epoch,
          slotIndex: epochInfo.slotIndex,
          slotsInEpoch: epochInfo.slotsInEpoch,
          slotTimeMs: 400, // Solana target ~400ms
          validatorsActive: activeCount,
          validatorsDelinquent: delinquentCount,
          totalStake,
          transactionCount: null,
          health: "ok",
          source: "solana-rpc",
          timestamp: new Date().toISOString(),
        };
      },
    },
    {
      name: "mock",
      fetch: async () => ({
        tps: 2450,
        blockHeight: 314_920_401,
        epoch: 1014,
        slotIndex: 357986,
        slotsInEpoch: 432000,
        slotTimeMs: 421,
        validatorsActive: 689,
        validatorsDelinquent: 9,
        totalStake: 433_927_889_067_310_460,
        transactionCount: 536_829_168_839,
        health: "ok",
        source: "mock",
        timestamp: new Date().toISOString(),
      }),
    },
  ]);
  return data;
}

/* ════════════════════════════════════════════════════════════════════════════
   2. SOL PRICE — USD price + 24h change
   Sources: backend → CoinGecko free → DeFiLlama coins → mock
   ════════════════════════════════════════════════════════════════════════════ */

export async function fetchSolPrice(): Promise<LivePriceData> {
  const { data } = await withFallbacks<LivePriceData>([
    {
      name: "backend",
      fetch: async () => {
        // Backend snapshot doesn't directly expose SOL price here,
        // but insight/pulse does — try that
        try {
          const res = await apiClient.get<{
            snapshot: { economics: { sol: { price: number; change24h: number } } };
          }>("/insight/pulse");
          const sol = res.data.snapshot.economics.sol;
          return {
            price: sol.price,
            change24h: sol.change24h,
            source: "backend",
          };
        } catch {
          throw new Error("backend price unavailable");
        }
      },
    },
    {
      name: "coingecko",
      fetch: async () => {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true"
        );
        if (!res.ok) throw new Error(`CoinGecko: ${res.status}`);
        const json = await res.json();
        if (!json.solana) throw new Error("CoinGecko: no data");
        return {
          price: json.solana.usd,
          change24h: json.solana.usd_24h_change ?? 0,
          source: "coingecko",
        };
      },
    },
    {
      name: "defillama-coins",
      fetch: async () => {
        const res = await fetch(
          "https://coins.llama.fi/prices/current/coingecko:solana"
        );
        if (!res.ok) throw new Error(`DeFiLlama coins: ${res.status}`);
        const json = await res.json();
        const coin = json?.coins?.["coingecko:solana"];
        if (!coin) throw new Error("DeFiLlama: no SOL data");
        return {
          price: coin.price,
          change24h: 0, // DeFiLlama coins doesn't provide 24h change
          source: "defillama-coins",
        };
      },
    },
    {
      name: "mock",
      fetch: async () => ({
        price: 0,
        change24h: 0,
        source: "mock",
      }),
    },
  ]);
  return data;
}

/* ════════════════════════════════════════════════════════════════════════════
   3. TVL — Solana total value locked
   Sources: backend → DeFiLlama chains → mock
   ════════════════════════════════════════════════════════════════════════════ */

export async function fetchTvl(): Promise<LiveTvlData> {
  const { data } = await withFallbacks<LiveTvlData>([
    {
      name: "backend",
      fetch: async () => {
        try {
          const res = await apiClient.get<{
            snapshot: { economics: { tvl: number | null } };
          }>("/insight/pulse");
          const tvl = res.data.snapshot.economics.tvl;
          if (tvl == null) throw new Error("no tvl");
          return { tvl, source: "backend" };
        } catch {
          throw new Error("backend tvl unavailable");
        }
      },
    },
    {
      name: "defillama",
      fetch: async () => {
        const res = await fetch("https://api.llama.fi/v2/chains");
        if (!res.ok) throw new Error(`DeFiLlama chains: ${res.status}`);
        const chains = await res.json();
        const sol = chains.find((c: { name: string }) => c.name === "Solana");
        if (!sol) throw new Error("DeFiLlama: no Solana");
        return { tvl: sol.tvl, source: "defillama" };
      },
    },
    {
      name: "mock",
      fetch: async () => ({
        tvl: 0,
        source: "mock",
      }),
    },
  ]);
  return data;
}

/* ════════════════════════════════════════════════════════════════════════════
   4. NEWS + TWEETS — ecosystem news feed
   Sources: backend → mock
   ════════════════════════════════════════════════════════════════════════════ */

export async function fetchNews(): Promise<LiveNewsData> {
  const { data } = await withFallbacks<LiveNewsData>([
    {
      name: "backend",
      fetch: async () => {
        const res = await apiClient.get<{ news: NewsItem[]; tweets: TweetItem[] }>(
          "/insight/news"
        );
        if (!res.data.news.length && !res.data.tweets.length) {
          throw new Error("backend returned empty");
        }
        return {
          news: res.data.news,
          tweets: res.data.tweets,
          source: "backend",
        };
      },
    },
    {
      name: "mock",
      fetch: async () => ({
        news: [],
        tweets: [],
        source: "mock",
      }),
    },
  ]);
  return data;
}

/* ════════════════════════════════════════════════════════════════════════════
   5b. FULL PULSE REPORT — economics, validators, anomalies, projects, narratives, upgrades
   Sources: backend → mock
   ════════════════════════════════════════════════════════════════════════════ */

export interface PulseValidator {
  votePubkey: string;
  nodePubkey: string;
  activatedStake: number;
  commission: number;
  lastVote: number;
  rootSlot: number;
}

export interface PulseAnomaly {
  id: string;
  metric: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  observed: number;
  threshold: number;
}

export interface PulseProject {
  name: string;
  category: string;
  tvl: number;
  change7d: number;
  narrative: string;
  status: "healthy" | "watch" | "at_risk";
  evidence: string[];
}

export interface PulseNarrative {
  id: string;
  title: string;
  trend: "up" | "down" | "flat";
  summary: string;
  representativeProjects: string[];
}

export interface PulseSector {
  category: string;
  tvl: number;
  pct: number;
  topProtocols: { name: string; tvl: number }[];
}

export interface PulseEtfFlow {
  ticker: string;
  name: string;
  aum: number;
  currentFlow: number;
  totalNetFlow: number;
  volume: number;
  staking: boolean;
}

export interface PulseEconomics {
  sol: { price: number; change24h: number; marketCap: number };
  tvl: number | null;
  tvlChange24h: number | null;
  stablecoinSupply: number | null;
  dexVolume: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  rev: number | null;
  medianFeeLamports: number;
  medianFeeSol: number;
  dailyActiveWallets: number | null;
  tokenizedAssets: number | null;
  dailyTransactions: number;
  priceHistory7d?: { t: number; price: number }[];
}

export interface PulseSnapshot {
  generatedAt: string;
  network: {
    health: string;
    slot: number;
    blockHeight: number;
    epoch: number;
    epochProgress: number;
    slotsInEpoch: number;
    slotIndex: number;
    tps: number;
    avgSlotTimeSec: number;
    transactionCount: number;
    slotsPerSecond: number;
  };
  validators: {
    total: number;
    active: number;
    delinquent: number;
    totalStakeSol: number;
    topValidators: { votePubkey: string; stakeSol: number; commission: number }[];
    avgCommission: number;
  };
  economics: PulseEconomics;
  upgrades: { name: string; status: string; note: string }[];
  news: NewsItem[];
  tweets: TweetItem[];
  sources: { name: string; url: string; ok: boolean }[];
  sectorBreakdown?: PulseSector[];
  tokenizedStocks?: { name: string; category: string; tvl: number; chain: string; module: string }[];
  etfFlow?: PulseEtfFlow[];
}

export interface PulseReport {
  meta: { generatedAt: string; report: string; version: string; generator: string };
  snapshot: PulseSnapshot;
  projects: PulseProject[];
  narratives: PulseNarrative[];
  anomalies: PulseAnomaly[];
  markdown: string;
}

const MOCK_PULSE: PulseReport = {
  meta: { generatedAt: new Date().toISOString(), report: "NODIN", version: "1.0", generator: "mock" },
  snapshot: {
    generatedAt: new Date().toISOString(),
    network: {
      health: "ok", slot: 438406889, blockHeight: 416460687, epoch: 1014,
      epochProgress: 0.83, slotsInEpoch: 432000, slotIndex: 358889,
      tps: 2450, avgSlotTimeSec: 0.421, transactionCount: 536830774843, slotsPerSecond: 2.4,
    },
    validators: {
      total: 698, active: 688, delinquent: 10, totalStakeSol: 433927889,
      topValidators: [
        { votePubkey: "CcaHc2...", stakeSol: 16917849, commission: 7 },
        { votePubkey: "he1ius...", stakeSol: 15982576, commission: 0 },
        { votePubkey: "CatzoS...", stakeSol: 12486045, commission: 5 },
      ],
      avgCommission: 0.124,
    },
    economics: {
      sol: { price: 76.35, change24h: -0.32, marketCap: 44434604268 },
      tvl: 4852095771, tvlChange24h: 1.25, stablecoinSupply: 16157542252,
      dexVolume: 1347434365, circulatingSupply: 582165167, totalSupply: 631882282,
      rev: 150823, medianFeeLamports: 5000, medianFeeSol: 0.000005,
      dailyActiveWallets: 9003985, tokenizedAssets: 1832461705, dailyTransactions: 395083440,
    },
    upgrades: [
      { name: "Alpenglow (SIMD-0327)", status: "In development", note: "Consensus upgrade to improve block production and finality." },
      { name: "SIMD-525 (Composite Staking)", status: "Proposal", note: "Composite staking to enhance network security." },
      { name: "Firedancer", status: "Testnet", note: "High-performance validator client by Jump Crypto." },
    ],
    news: [], tweets: [], sources: [],
  },
  projects: [
    { name: "Jupiter", category: "DEX", tvl: 2800000000, change7d: -1.8, narrative: "DEX & Liquidity", status: "healthy", evidence: [] },
    { name: "Jito", category: "Liquid Staking", tvl: 2450000000, change7d: 2.1, narrative: "Liquid Staking & Restaking", status: "healthy", evidence: [] },
    { name: "Kamino", category: "Lending", tvl: 1850000000, change7d: 0.9, narrative: "Lending & Borrowing", status: "healthy", evidence: [] },
    { name: "Raydium", category: "DEX", tvl: 1600000000, change7d: 3.4, narrative: "DEX & Liquidity", status: "healthy", evidence: [] },
    { name: "Marinade", category: "Liquid Staking", tvl: 1200000000, change7d: 1.2, narrative: "Liquid Staking & Restaking", status: "healthy", evidence: [] },
  ],
  narratives: [
    { id: "n1", title: "DEX & On-chain Liquidity", trend: "up", summary: "DEX volume recovering as market stabilizes.", representativeProjects: ["Jupiter", "Raydium"] },
    { id: "n2", title: "Liquid Staking & Restaking", trend: "up", summary: "Jito and Marinade continue to grow stake.", representativeProjects: ["Jito", "Marinade"] },
    { id: "n3", title: "Lending & Borrowing", trend: "down", summary: "Lending TVL sees slight contraction.", representativeProjects: ["Kamino"] },
  ],
  anomalies: [
    { id: "a1", metric: "dau", severity: "info", title: "Daily active wallets elevated", detail: "DAU above 7-day average", observed: 9003985, threshold: 8500000 },
  ],
  markdown: "",
};

export async function fetchPulse(): Promise<PulseReport> {
  const { data } = await withFallbacks<PulseReport>([
    {
      name: "backend",
      fetch: async () => {
        const res = await apiClient.get<PulseReport>("/insight/pulse");
        if (!res.data?.snapshot) throw new Error("no pulse data");
        return res.data;
      },
    },
    {
      name: "mock",
      fetch: async () => MOCK_PULSE,
    },
  ]);
  return data;
}

/* ════════════════════════════════════════════════════════════════════════════
   6. ETF — Solana ETF holdings
   Sources: backend → mock
   ════════════════════════════════════════════════════════════════════════════ */

export async function fetchEtf(): Promise<LiveEtfData> {
  const { data } = await withFallbacks<LiveEtfData>([
    {
      name: "backend",
      fetch: async () => {
        const res = await apiClient.get<{
          etf: { totalHoldings: number | null } | null;
        }>("/network/etf/flow");
        if (!res.data?.etf?.totalHoldings) throw new Error("no etf");
        return {
          totalHoldings: res.data.etf.totalHoldings,
          source: "backend",
        };
      },
    },
    {
      name: "mock",
      fetch: async () => ({
        totalHoldings: null,
        source: "mock",
      }),
    },
  ]);
  return data;
}
