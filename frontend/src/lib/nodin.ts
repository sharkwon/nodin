import apiClient from "./api-client";

export interface NetworkMetrics {
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
}

export interface ValidatorMetrics {
  total: number;
  active: number;
  delinquent: number;
  totalStakeSol: number;
  topValidators: { votePubkey: string; stakeSol: number; commission: number }[];
  avgCommission: number;
}

export interface EconomicsMetrics {
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

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  imageUrl?: string;
  source: string;
  publishedAt: string;
  category: "simd" | "upgrade" | "ecosystem" | "defi" | "general";
  entityLinks?: {
    projectId: string;
    projectName: string;
    categories: string[];
    matchConfidence: number;
    matchMethod: string;
  }[];
}

export interface TweetItem {
  id: string;
  author: string;
  handle: string;
  avatar?: string;
  content: string;
  time: string;
  url?: string;
  likes?: number;
  retweets?: number;
}

export interface Snapshot {
  generatedAt: string;
  network: NetworkMetrics;
  validators: ValidatorMetrics;
  economics: EconomicsMetrics;
  upgrades: { name: string; status: string; note: string }[];
  news: NewsItem[];
  tweets: TweetItem[];
  sources: { name: string; url: string; ok: boolean }[];
  // ── Solana market data ──
  sectorBreakdown?: SolanaSectorBreakdown[];
  tokenizedStocks?: SolanaTokenizedStock[];
  gainersLosers?: { gainers: SolanaGainerLoser[]; losers: SolanaGainerLoser[] };
  launchpads?: SolanaLaunchpad[];
  etfFlow?: SolanaEtfFlow[];
}

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

export interface ProtocolListItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  solanaTvl: number;
  totalTvl: number;
  description?: string;
  ecosystemProjectId?: string | null;
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

export interface Anomaly {
  id: string;
  metric: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  observed: number;
  threshold: number;
}

export interface ProjectIntel {
  name: string;
  category: string;
  tvl: number;
  change7d: number;
  narrative: string;
  status: "healthy" | "watch" | "at_risk";
  evidence: string[];
}

export interface Narrative {
  id: string;
  title: string;
  trend: "up" | "down" | "flat";
  summary: string;
  representativeProjects: string[];
}

export interface Report {
  meta: { generatedAt: string; report: string; version: string; generator: string };
  snapshot: Snapshot;
  projects: ProjectIntel[];
  narratives: Narrative[];
  anomalies: Anomaly[];
  markdown: string;
}

export const insightApi = {
  pulse: () => apiClient.get<Report>("/insight/pulse").then((r) => r.data),
  snapshot: () => apiClient.get<Snapshot & { anomalies: Anomaly[] }>("/insight/snapshot").then((r) => r.data),
  projects: () => apiClient.get<{ projects: ProjectIntel[]; narratives: Narrative[] }>("/insight/projects").then((r) => r.data),
  narratives: () => apiClient.get<Narrative[]>("/insight/narratives").then((r) => r.data),
  news: () => apiClient.get<{ news: NewsItem[]; tweets: TweetItem[] }>("/insight/news").then((r) => r.data),
  upgrades: () => apiClient.get<{ name: string; status: string; note: string }[]>("/insight/upgrades").then((r) => r.data),
  report: () => apiClient.get<Report>("/insight/reports").then((r) => r.data),
};

// V3 — Network & Reports
export interface NetworkSnapshot {
  slot: number | null;
  blockHeight: number | null;
  epoch: {
    epoch: number;
    slotIndex: number;
    slotsInEpoch: number;
    absoluteSlot: number;
    blockHeight: number;
  } | null;
  tps: number | null;
  slotTimeMs: number | null;
  health: "ok" | "degraded" | "down";
  supply: { total: number; circulating: number; nonCirculating: number } | null;
  validators: {
    active: number;
    delinquent: number;
    totalStake: number;
    delinquencyRate: number;
    topByStake: Array<{
      votePubkey: string;
      nodePubkey: string;
      activatedStake: number;
      commission: number;
      lastVote: number;
      rootSlot: number;
    }>;
  } | null;
  timestamp: string;
  source: string;
  anomalies: Array<{
    severity: "critical" | "high" | "medium" | "low";
    metric: string;
    value: number;
    expected: number;
    description: string;
    timestamp: string;
  }>;
  anomalySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export const networkApi = {
  snapshot: () => apiClient.get<NetworkSnapshot>("/network/snapshot").then((r) => r.data),
  anomalies: () => apiClient.get<{ anomalies: NetworkSnapshot["anomalies"]; summary: NetworkSnapshot["anomalySummary"]; timestamp: string }>("/network/anomalies").then((r) => r.data),
  markdownReport: () => apiClient.get<string>("/report/markdown", { responseType: "text" }).then((r) => r.data),
  jsonReport: () => apiClient.get("/report/json").then((r) => r.data),
  newsFeed: () => apiClient.get<{ items: Array<{ title: string; snippet: string; url: string; publishedAt: string | null; source: string; author?: string }>; totalSources: number; timestamp: string }>("/network/news/feed").then((r) => r.data),
  etfFlow: () => apiClient.get<{ etf: { dailyFlow: number | null; cumulativeFlow: number | null; totalHoldings: number | null } | null; timestamp: string }>("/network/etf/flow").then((r) => r.data),
};