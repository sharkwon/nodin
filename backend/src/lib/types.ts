export interface NetworkMetrics {
  health: string;
  slot: number;
  blockHeight: number;
  epoch: number;
  epochProgress: number; // 0-1
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
  // -- mission scope additions --
  rev: number | null; // Real Economic Value (24h, USD)
  medianFeeLamports: number; // median per-tx fee in lamports
  medianFeeSol: number;
  dailyActiveWallets: number | null; // estimated DAU
  tokenizedAssets: number | null; // RWA / tokenized asset volume (USD)
  dailyTransactions: number; // 24h tx estimate
  priceHistory7d?: { t: number; price: number }[]; // SOL price 7-day sparkline
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

export interface UpgradesSummary {
  name: string;
  status: string;
  note: string;
}

export interface Snapshot {
  generatedAt: string; // ISO
  network: NetworkMetrics;
  validators: ValidatorMetrics;
  economics: EconomicsMetrics;
  upgrades: UpgradesSummary[];
  news: NewsItem[];
  tweets: TweetItem[];
  sources: { name: string; url: string; ok: boolean }[];
  // ── Solana market data ──
  sectorBreakdown?: import("./publicData.js").SolanaSectorBreakdown[];
  tokenizedStocks?: import("./publicData.js").SolanaTokenizedStock[];
  gainersLosers?: { gainers: import("./publicData.js").SolanaGainerLoser[]; losers: import("./publicData.js").SolanaGainerLoser[] };
  launchpads?: import("./publicData.js").SolanaLaunchpad[];
  etfFlow?: import("./publicData.js").SolanaEtfFlow[];
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