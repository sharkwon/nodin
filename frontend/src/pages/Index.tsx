import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Cpu,
  DollarSign,
  Zap,
  Gauge,
  Layers,
  Rocket,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchNetworkData,
  fetchSolPrice,
  fetchTvl,
  fetchNews,
  fetchEtf,
  fetchPulse,
  type LiveNetworkData,
  type LivePriceData,
  type LiveTvlData,
  type LiveNewsData,
  type LiveEtfData,
  type PulseReport,
} from "@/lib/live-data";
import { fmtNum, fmtUsd } from "@/lib/format";

/* ════════════════════════════════════════════════════════════════════════════
   MOCK DATA — Fallback when all API sources fail
   ════════════════════════════════════════════════════════════════════════════ */

interface Report {
  id: string;
  vol: string;
  timestamp: string;
  headline: string;
  summary: string;
  imageUrl: string;
}

interface MockTweet {
  id: string;
  author: string;
  handle: string;
  time: string;
  avatarUrl: string;
  content: string;
}

interface ChartPoint {
  name: string;
  value: number;
}

const MOCK_REPORTS: Report[] = [
  {
    id: "rpt-001",
    vol: "VOL. 04 // 26",
    timestamp: "894320",
    headline: "SOLANA ANONYMOUS VOLUME INVERSION DETECTED",
    summary:
      "On-chain metrics reveal a systemic shifts in non-custodial pooling behavior across liquidity hubs. Deep-dive into metadata masking patterns inside the blockspace.",
    imageUrl:
      "https://images.unsplash.com/photo-1639762681485-ab54ed4ff9b9?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "rpt-002",
    vol: "VOL. 05 // 26",
    timestamp: "894336",
    headline: "VALIDATOR ROTATION ANOMALY ACROSS MAINNET-BETA",
    summary:
      "Non-custodial staking pools exhibit irregular epoch transition behavior. We trace the origin to a cluster of anonymized node operators redistributing stake weight during slot transitions.",
    imageUrl:
      "https://images.unsplash.com/photo-1518186285589-4f75461adaded2?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "rpt-003",
    vol: "VOL. 06 // 26",
    timestamp: "894351",
    headline: "BLOCKSPACE METADATA LEAKAGE IN PRIVACY POOLS",
    summary:
      "Confidential transaction metadata is being inferred through side-channel block timing analysis. This report maps the exposure surface and recommends countermeasures for anonymity-preserving protocols.",
    imageUrl:
      "https://images.unsplash.com/photo-1639322537504-6427e1b1c9de?auto=format&fit=crop&w=1200&q=80",
  },
];

const MOCK_TWEETS: MockTweet[] = [
  {
    id: "tw-001",
    author: "Solana Privacy Initiative",
    handle: "@SolShield",
    time: "2h",
    avatarUrl:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
    content:
      "New Nodin volumetric report is out. Fascinating insights into the anonymized validator distribution layers on Mainnet-Beta. Open-source data at its finest.",
  },
  {
    id: "tw-002",
    author: "Solana Privacy Initiative",
    handle: "@SolShield",
    time: "5h",
    avatarUrl:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
    content:
      "New Nodin volumetric report is out. Fascinating insights into the anonymized validator distribution layers on Mainnet-Beta. Open-source data at its finest.",
  },
  {
    id: "tw-003",
    author: "Solana Privacy Initiative",
    handle: "@SolShield",
    time: "8h",
    avatarUrl:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
    content:
      "New Nodin volumetric report is out. Fascinating insights into the anonymized validator distribution layers on Mainnet-Beta. Open-source data at its finest.",
  },
];

const CHART_DATA: ChartPoint[] = [
  { name: "Epoch 810", value: 94.2 },
  { name: "Epoch 811", value: 95.8 },
  { name: "Epoch 812", value: 96.1 },
  { name: "Epoch 813", value: 97.5 },
  { name: "Epoch 814", value: 98.2 },
  { name: "Epoch 815", value: 98.9 },
];

const FALLBACK_MARQUEE =
  "STATUS // SHIELD_ONLINE // CURRENT_TPS: 2,450 // BLOCK_HT: 314,920,401 // ANONYMITY_INDEX: 98.4% // OPEN_SOURCE_CORE //";

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — orchestrates all live data queries
   ════════════════════════════════════════════════════════════════════════════ */

export default function Index() {
  const { data: netData } = useQuery({
    queryKey: ["live-network"],
    queryFn: fetchNetworkData,
    refetchInterval: 30_000,
    retry: 1,
  });

  const { data: priceData } = useQuery({
    queryKey: ["live-sol-price"],
    queryFn: fetchSolPrice,
    refetchInterval: 60_000,
    retry: 1,
  });

  const { data: tvlData } = useQuery({
    queryKey: ["live-tvl"],
    queryFn: fetchTvl,
    refetchInterval: 60_000,
    retry: 1,
  });

  const { data: newsData } = useQuery({
    queryKey: ["live-news"],
    queryFn: fetchNews,
    refetchInterval: 60_000,
    retry: 1,
  });

  const { data: etfData } = useQuery({
    queryKey: ["live-etf"],
    queryFn: fetchEtf,
    refetchInterval: 120_000,
    retry: 1,
  });

  const { data: pulseData } = useQuery({
    queryKey: ["live-pulse"],
    queryFn: fetchPulse,
    refetchInterval: 60_000,
    retry: 1,
  });

  return (
    <div className="min-h-screen bg-background">
      <MarqueeStrip net={netData} price={priceData} tvl={tvlData} etf={etfData} />
      <HeroSection net={netData} price={priceData} tvl={tvlData} pulse={pulseData} />
      <SolPriceChartSection pulse={pulseData} />
      <NetworkPerformanceSection pulse={pulseData} />
      <ValidatorSection pulse={pulseData} />
      <EconomicIndicatorsSection pulse={pulseData} />
      <EcosystemGrowthSection pulse={pulseData} />
      <AnomalySection pulse={pulseData} />
      <UpgradesSection pulse={pulseData} />
      <MainGrid newsData={newsData} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   1. MARQUEE STRIP
   ════════════════════════════════════════════════════════════════════════════ */

function MarqueeStrip({
  net,
  price,
  tvl,
  etf,
}: {
  net?: LiveNetworkData | null;
  price?: LivePriceData | null;
  tvl?: LiveTvlData | null;
  etf?: LiveEtfData | null;
}) {
  const tps = net?.tps ?? 2450;
  const blockHt = net?.blockHeight ?? 314_920_401;
  const epoch = net?.epoch ?? 1014;
  const validators = net?.validatorsActive ?? 689;
  const solPrice = price?.price ?? 0;
  const tvlVal = tvl?.tvl ?? 0;
  const etfHoldings = etf?.totalHoldings ?? null;

  const liveText = [
    "STATUS // SHIELD_ONLINE",
    `CURRENT_TPS: ${fmtNum(tps)}`,
    `BLOCK_HT: ${fmtNum(blockHt)}`,
    `EPOCH: ${epoch}`,
    `VALIDATORS: ${validators} ACTIVE`,
    `ANONYMITY_INDEX: 98.4%`,
    solPrice > 0 ? `SOL_PRICE: $${solPrice.toFixed(2)}` : "",
    tvlVal > 0 ? `TVL: ${fmtUsd(tvlVal)}` : "",
    etfHoldings ? `ETF_HOLDINGS: ${fmtUsd(etfHoldings)}` : "",
    "OPEN_SOURCE_CORE",
    net ? `DATA_SRC: ${net.source.toUpperCase()}` : "",
  ]
    .filter(Boolean)
    .join(" // ");

  const marqueeText = liveText || FALLBACK_MARQUEE;

  return (
    <div className="w-full bg-card border-b border-border py-2 overflow-hidden flex whitespace-nowrap">
      <motion.div
        animate={{ x: [0, -1000] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
        className="flex whitespace-nowrap"
      >
        <span className="font-mono text-xs text-primary tracking-wider uppercase px-4">
          {marqueeText}
        </span>
        <span className="font-mono text-xs text-primary tracking-wider uppercase px-4">
          {marqueeText}
        </span>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   2. HERO SECTION
   ════════════════════════════════════════════════════════════════════════════ */

function HeroSection({
  net,
  price,
  tvl,
  pulse,
}: {
  net?: LiveNetworkData | null;
  price?: LivePriceData | null;
  tvl?: LiveTvlData | null;
  pulse?: PulseReport | null;
}) {
  const econ = pulse?.snapshot?.economics;
  return (
    <section className="pt-16 pb-20 px-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-baseline border-b border-border pb-8 w-full">
        <h1 className="font-syllabic font-extrabold text-7xl md:text-8xl text-primary tracking-tight md:mr-6 drop-shadow-[0_0_12px_rgba(0,245,212,0.3)]">
          {"\u14C4\u144E\u14D0"}
        </h1>
        <h2 className="font-sans font-black text-5xl md:text-6xl text-slate-100 tracking-[0.3em] uppercase">
          NODIN
        </h2>
      </div>

      <div className="mt-8">
        <span className="text-primary font-mono font-bold tracking-[0.4em] text-sm md:text-base mb-2 uppercase block">
          NEWS LIKE A WIND.
        </span>
        <p className="text-muted-foreground text-xs md:text-sm font-mono tracking-wide max-w-3xl leading-relaxed uppercase">
          AN ANONYMOUS REPORT ARCHIVE. PERIODIC, OPEN-SOURCE DATA ANALYTICS
          FOR THE SOVEREIGN NETWORK. WE INSPECT THE BLOCKSPACE BECAUSE
          CENTRALIZATION BREEDS COMPROMISE.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-xl overflow-hidden">
        <LiveMetric label="LIVE TPS" value={net?.tps ? fmtNum(net.tps) : "---"} sub={net?.source ? `via ${net.source}` : undefined} />
        <LiveMetric label="EPOCH" value={net?.epoch ? String(net.epoch) : "---"} sub={net?.slotIndex && net?.slotsInEpoch ? `${((net.slotIndex / net.slotsInEpoch) * 100).toFixed(1)}% progress` : undefined} />
        <LiveMetric label="SOL // USD" value={price?.price ? `$${price.price.toFixed(2)}` : econ?.sol?.price ? `$${econ.sol.price.toFixed(2)}` : "---"} sub={econ?.sol?.change24h != null ? `${econ.sol.change24h >= 0 ? "+" : ""}${econ.sol.change24h.toFixed(1)}% 24h` : undefined} />
        <LiveMetric label="TOTAL TVL" value={tvl?.tvl ? fmtUsd(tvl.tvl) : econ?.tvl ? fmtUsd(econ.tvl) : "---"} sub={tvl?.source ? `via ${tvl.source}` : undefined} />
      </div>
    </section>
  );
}

function LiveMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card px-5 py-6 flex flex-col gap-1">
      <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">{label}</span>
      <span className="text-primary font-mono text-2xl md:text-3xl font-bold tabular-nums leading-none">{value}</span>
      {sub && <span className="font-mono text-[10px] text-muted-foreground mt-1">{sub}</span>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   3. NETWORK PERFORMANCE — TPS, slot time, block height, epoch progress
   ════════════════════════════════════════════════════════════════════════════ */

function NetworkPerformanceSection({ pulse }: { pulse?: PulseReport | null }) {
  const n = pulse?.snapshot?.network;
  if (!n) return null;
  const epochPct = n.slotsInEpoch > 0 ? (n.slotIndex / n.slotsInEpoch) * 100 : 0;
  const filled = Math.round((epochPct / 100) * 30);

  return (
    <section className="border-t border-border max-w-7xl mx-auto w-full px-8 py-16">
      <SectionHeader icon={Cpu} title="NETWORK PERFORMANCE" subtitle="TPS // SLOT TIME // BLOCK HEIGHT // EPOCH PROGRESS" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-xl overflow-hidden mt-8">
        <PerfCard icon={Zap} label="TPS" value={fmtNum(n.tps)} sub={`${n.slotsPerSecond.toFixed(1)} slots/s`} />
        <PerfCard icon={Gauge} label="SLOT TIME" value={`${n.avgSlotTimeSec.toFixed(3)}s`} sub={`health: ${n.health}`} />
        <PerfCard icon={Layers} label="BLOCK HEIGHT" value={fmtNum(n.blockHeight)} sub={`slot: ${fmtNum(n.slot)}`} />
        <PerfCard icon={Activity} label="EPOCH" value={String(n.epoch)} sub={`${epochPct.toFixed(1)}% progress`} />
      </div>
      <div className="mt-4 bg-card border border-border rounded-xl px-6 py-5">
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">EPOCH {n.epoch} PROGRESS</span>
          <span className="font-mono text-[10px] text-primary tabular-nums">{epochPct.toFixed(1)}%</span>
        </div>
        <div className="font-mono text-sm text-primary">
          {"["}{"#".repeat(filled)}{".".repeat(Math.max(0, 30 - filled))}{"]"}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground/60">
          <span>SLOT_INDEX: {fmtNum(n.slotIndex)}</span>
          <span>SLOTS_IN_EPOCH: {fmtNum(n.slotsInEpoch)}</span>
          <span>TX_COUNT: {fmtNum(n.transactionCount)}</span>
        </div>
      </div>
    </section>
  );
}

function PerfCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card px-5 py-6 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Icon className="text-primary" size={14} />
        <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">{label}</span>
      </div>
      <span className="text-primary font-mono text-2xl font-bold tabular-nums leading-none">{value}</span>
      {sub && <span className="font-mono text-[10px] text-muted-foreground mt-1">{sub}</span>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   4. VALIDATOR STATUS — active vs delinquent, stake distribution, top validators, commission
   ════════════════════════════════════════════════════════════════════════════ */

function ValidatorSection({ pulse }: { pulse?: PulseReport | null }) {
  const v = pulse?.snapshot?.validators;
  if (!v) return null;
  const delinqPct = v.total > 0 ? (v.delinquent / v.total) * 100 : 0;
  const activePct = v.total > 0 ? (v.active / v.total) * 100 : 0;
  const maxStake = v.topValidators[0]?.stakeSol || 1;

  return (
    <section className="border-t border-border max-w-7xl mx-auto w-full px-8 py-16">
      <SectionHeader icon={Layers} title="VALIDATOR STATUS" subtitle="ACTIVE // DELINQUENT // STAKE DISTRIBUTION // COMMISSION" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border rounded-xl overflow-hidden mt-8">
        <div className="bg-card px-5 py-6 flex flex-col gap-1">
          <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">ACTIVE VALIDATORS</span>
          <span className="text-primary font-mono text-3xl font-bold tabular-nums leading-none">{fmtNum(v.active)}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{activePct.toFixed(1)}% of total</span>
        </div>
        <div className="bg-card px-5 py-6 flex flex-col gap-1">
          <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">DELINQUENT</span>
          <span className="font-mono text-3xl font-bold tabular-nums leading-none text-red-400">{fmtNum(v.delinquent)}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{delinqPct.toFixed(2)}% delinquency rate</span>
        </div>
        <div className="bg-card px-5 py-6 flex flex-col gap-1">
          <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">TOTAL STAKE</span>
          <span className="text-primary font-mono text-3xl font-bold tabular-nums leading-none">{fmtNum(v.totalStakeSol)}</span>
          <span className="font-mono text-[10px] text-muted-foreground">SOL staked</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-4 uppercase">TOP VALIDATORS BY STAKE</h4>
          <div className="space-y-3">
            {v.topValidators.slice(0, 6).map((val, i) => {
              const pct = (val.stakeSol / maxStake) * 100;
              const barFilled = Math.round((pct / 100) * 24);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground/60 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[10px] text-slate-300 truncate">{val.votePubkey.slice(0, 8)}...{val.votePubkey.slice(-4)}</span>
                      <span className="font-mono text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">{(val.stakeSol / 1e6).toFixed(1)}M SOL</span>
                    </div>
                    <div className="font-mono text-[9px] text-primary mt-0.5">{"#".repeat(barFilled)}{".".repeat(Math.max(0, 24 - barFilled))}</div>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">{val.commission}% comm</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-4 uppercase">COMMISSION TRACKING</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between font-mono text-[10px] text-muted-foreground mb-1"><span>AVG COMMISSION</span><span className="text-primary">{(v.avgCommission * 100).toFixed(1)}%</span></div>
              <div className="font-mono text-sm text-primary">{"#".repeat(Math.round(v.avgCommission * 100 * 0.3))}{".".repeat(Math.max(0, 30 - Math.round(v.avgCommission * 100 * 0.3)))}</div>
            </div>
            <div>
              <div className="flex justify-between font-mono text-[10px] text-muted-foreground mb-1"><span>ACTIVE RATE</span><span className="text-primary">{activePct.toFixed(1)}%</span></div>
              <div className="font-mono text-sm text-primary">{"#".repeat(Math.round(activePct * 0.3))}{".".repeat(Math.max(0, 30 - Math.round(activePct * 0.3)))}</div>
            </div>
            <div>
              <div className="flex justify-between font-mono text-[10px] text-muted-foreground mb-1"><span>DELINQUENCY RATE</span><span className={delinqPct > 5 ? "text-red-400" : "text-primary"}>{delinqPct.toFixed(2)}%</span></div>
              <div className="font-mono text-sm text-red-400">{"#".repeat(Math.max(1, Math.round(delinqPct * 0.3)))}{".".repeat(Math.max(0, 30 - Math.max(1, Math.round(delinqPct * 0.3))))}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


/* ══════════════════════════════════════════════════════════════════════════════
   SOL PRICE CHART — Standalone, prominent, Blockworks Sonar style
   ════════════════════════════════════════════════════════════════════════════ */

function SolPriceChartSection({ pulse }: { pulse?: PulseReport | null }) {
  const e = pulse?.snapshot?.economics;
  if (!e) return null;

  const priceHistory =
    e.priceHistory7d?.map((p, i) => ({
      name: `T-${e.priceHistory7d!.length - i}`,
      price: p.price,
    })) || [];

  const isUp = e.sol.change24h >= 0;

  return (
    <section className="border-t border-border max-w-7xl mx-auto w-full px-8 py-16">
      <SectionHeader
        icon={TrendingUp}
        title="SOL // USD"
        subtitle="LIVE PRICE // 7D HISTORY // MARKET METRICS"
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-px bg-border border border-border rounded-xl overflow-hidden">
        {/* Price big display */}
        <div className="lg:col-span-4 bg-card px-6 py-8 flex flex-col justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">CURRENT PRICE</span>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-mono text-5xl font-bold text-primary tabular-nums leading-none">
                ${e.sol.price.toFixed(2)}
              </span>
              <span
                className={`flex items-center gap-1 font-mono text-sm font-bold ${
                  isUp ? "text-primary" : "text-red-400"
                }`}
              >
                {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {isUp ? "+" : ""}
                {e.sol.change24h.toFixed(1)}%
              </span>
            </div>
            <span className="block mt-1 font-mono text-[10px] text-muted-foreground">24H CHANGE</span>
          </div>

          <div className="grid grid-cols-2 gap-px bg-border border border-border rounded-lg overflow-hidden">
            <div className="bg-card/50 px-3 py-3">
              <span className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase">MARKET CAP</span>
              <span className="block mt-1 font-mono text-sm text-slate-200 tabular-nums">{fmtUsd(e.sol.marketCap)}</span>
            </div>
            <div className="bg-card/50 px-3 py-3">
              <span className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase">CIRC. SUPPLY</span>
              <span className="block mt-1 font-mono text-sm text-slate-200 tabular-nums">
                {e.circulatingSupply ? fmtNum(e.circulatingSupply) : "---"}
              </span>
            </div>
            <div className="bg-card/50 px-3 py-3">
              <span className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase">TOTAL SUPPLY</span>
              <span className="block mt-1 font-mono text-sm text-slate-200 tabular-nums">
                {e.totalSupply ? fmtNum(e.totalSupply) : "---"}
              </span>
            </div>
            <div className="bg-card/50 px-3 py-3">
              <span className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase">STABLECOINS</span>
              <span className="block mt-1 font-mono text-sm text-slate-200 tabular-nums">
                {e.stablecoinSupply ? fmtUsd(e.stablecoinSupply) : "---"}
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-8 bg-card px-6 py-8">
          {priceHistory.length > 0 ? (
            <>
              <div className="flex items-baseline justify-between mb-4">
                <h4 className="font-mono text-xs text-muted-foreground tracking-wider uppercase">
                  SOL PRICE // 7D HISTORY ({priceHistory.length} POINTS)
                </h4>
                <span className="font-mono text-[10px] text-primary">LIVE</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={priceHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="solPriceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00F5D4" stopOpacity={0.3} />
                      <stop offset="60%" stopColor="#00F5D4" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#00F5D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748B"
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                    dy={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748B"
                    tick={{ fontSize: 10, fontFamily: "monospace" }}
                    tickLine={false}
                    axisLine={false}
                    domain={["dataMin - 2", "dataMax + 2"]}
                    tickFormatter={(v: number) => `$${v.toFixed(1)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0E1626",
                      borderColor: "#1C2A3F",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#64748B", fontFamily: "monospace" }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "SOL"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#00F5D4"
                    strokeWidth={2}
                    fill="url(#solPriceGradient)"
                    dot={false}
                    activeDot={{ r: 5, stroke: "#060B14", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="flex items-center justify-center h-[280px]">
              <div className="text-center">
                <Activity className="text-primary mx-auto mb-3 animate-pulse" size={32} />
                <p className="font-mono text-xs text-muted-foreground tracking-wider uppercase">
                  PRICE HISTORY UNAVAILABLE // AWAITING DATA
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   5. ECONOMIC INDICATORS — stablecoins, DEX vol, REV, median fees
   ════════════════════════════════════════════════════════════════════════════ */

function EconomicIndicatorsSection({ pulse }: { pulse?: PulseReport | null }) {
  const e = pulse?.snapshot?.economics;
  if (!e) return null;

  return (
    <section className="border-t border-border max-w-7xl mx-auto w-full px-8 py-16">
      <SectionHeader icon={DollarSign} title="ECONOMIC INDICATORS" subtitle="STABLECOINS // DEX VOLUME // REV // MEDIAN FEES // MARKET CAP" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-border border border-border rounded-xl overflow-hidden mt-8">
        <EconCard label="MARKET CAP" value={fmtUsd(e.sol.marketCap)} sub="SOL" />
        <EconCard label="STABLECOINS" value={e.stablecoinSupply ? fmtUsd(e.stablecoinSupply) : "---"} sub="circulating" />
        <EconCard label="DEX VOL 24H" value={e.dexVolume ? fmtUsd(e.dexVolume) : "---"} sub="aggregate" />
        <EconCard label="REV 24H" value={e.rev ? fmtUsd(e.rev) : "---"} sub="real econ value" positive={true} />
        <EconCard label="MEDIAN FEE" value={`${e.medianFeeLamports.toLocaleString()}`} sub={`${e.medianFeeSol.toFixed(7)} SOL`} />
      </div>
    </section>
  );
}

function EconCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-card px-5 py-5 flex flex-col gap-1">
      <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">{label}</span>
      <span className={`font-mono text-xl font-bold tabular-nums leading-none ${positive === true ? "text-primary" : positive === false ? "text-red-400" : "text-slate-200"}`}>{value}</span>
      {sub && <span className="font-mono text-[10px] text-muted-foreground mt-0.5">{sub}</span>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   6. ECOSYSTEM GROWTH - tokenized assets, DAU, sector breakdown, narratives
   ══════════════════════════════════════════════════════════════════════════════ */

function EcosystemGrowthSection({ pulse }: { pulse?: PulseReport | null }) {
  const e = pulse?.snapshot?.economics;
  const sectors = pulse?.snapshot?.sectorBreakdown ?? [];
  const tokenized = pulse?.snapshot?.tokenizedStocks ?? [];
  const narratives = pulse?.narratives ?? [];
  if (!e) return null;

  return (
    <section className="border-t border-border max-w-7xl mx-auto w-full px-8 py-16">
      <SectionHeader icon={Rocket} title="ECOSYSTEM GROWTH" subtitle="TOKENIZED ASSETS // DAU // SECTOR BREAKDOWN // NARRATIVES" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-xl overflow-hidden mt-8">
        <EconCard label="TOKENIZED ASSETS" value={e.tokenizedAssets ? fmtUsd(e.tokenizedAssets) : "---"} sub="RWA / equities" positive={true} />
        <EconCard label="DAILY ACTIVE WALLETS" value={e.dailyActiveWallets ? fmtNum(e.dailyActiveWallets) : "---"} sub="24h" />
        <EconCard label="DAILY TRANSACTIONS" value={e.dailyTransactions ? fmtNum(e.dailyTransactions) : "---"} sub="24h" />
        <EconCard label="CIRCULATING SUPPLY" value={e.circulatingSupply ? fmtNum(e.circulatingSupply) : "---"} sub="SOL" />
      </div>

      {sectors.length > 0 && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-4 uppercase">SECTOR BREAKDOWN // TVL DISTRIBUTION</h4>
            <div className="space-y-2.5">
              {sectors.slice(0, 6).map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground/60 w-4">{i + 1}</span>
                  <span className="font-mono text-[10px] text-slate-300 w-32 truncate">{s.category}</span>
                  <div className="flex-1">
                    <div className="font-mono text-[9px] text-primary">{"#".repeat(Math.max(1, Math.round(s.pct * 0.3)))}{".".repeat(Math.max(0, 30 - Math.max(1, Math.round(s.pct * 0.3))))}</div>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">{s.pct.toFixed(1)}%</span>
                  <span className="font-mono text-[10px] text-slate-400 tabular-nums whitespace-nowrap">{fmtUsd(s.tvl)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-4 uppercase">NARRATIVES // TREND DIRECTION</h4>
            <div className="space-y-3">
              {narratives.slice(0, 5).map((nar, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground/60 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {nar.trend === "up" ? <TrendingUp size={12} className="text-primary" /> : nar.trend === "down" ? <TrendingDown size={12} className="text-red-400" /> : <Minus size={12} className="text-muted-foreground" />}
                      <span className="font-mono text-[10px] text-slate-200 uppercase tracking-wide">{nar.title}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{nar.summary}</p>
                    {nar.representativeProjects.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {nar.representativeProjects.map((p, j) => (
                          <span key={j} className="font-mono text-[9px] text-primary/70 border border-border px-1.5 py-0.5 rounded">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tokenized.length > 0 && (
        <div className="mt-4 bg-card border border-border rounded-xl p-6">
          <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-4 uppercase">TOKENIZED ASSETS // RWA BREAKDOWN</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tokenized.slice(0, 6).map((t, i) => (
              <div key={i} className="border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{t.name}</p>
                  <p className="font-mono text-[9px] text-muted-foreground uppercase">{t.category} // {t.chain}</p>
                </div>
                <span className="font-mono text-xs text-primary tabular-nums whitespace-nowrap ml-3">{fmtUsd(t.tvl)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
/* Anomaly Detection */

function AnomalySection({ pulse }: { pulse?: PulseReport | null }) {
  const anomalies = pulse?.anomalies ?? [];
  const net = pulse?.snapshot?.network;
  const validators = pulse?.snapshot?.validators;
  const econ = pulse?.snapshot?.economics;

  // Derived anomaly checks
  const derivedAnomalies: { metric: string; severity: string; title: string; detail: string }[] = [];
  if (net && net.tps < 1000) {
    derivedAnomalies.push({ metric: "tps", severity: "critical", title: "TPS drop detected", detail: `TPS at ${fmtNum(net.tps)} — below 1000 threshold` });
  }
  if (net && net.avgSlotTimeSec > 0.6) {
    derivedAnomalies.push({ metric: "slot_time", severity: "warning", title: "Slow slot time", detail: `Slot time ${net.avgSlotTimeSec.toFixed(3)}s — above 0.6s threshold` });
  }
  if (validators && validators.delinquent / validators.total > 0.05) {
    derivedAnomalies.push({ metric: "delinquency", severity: "warning", title: "High validator delinquency", detail: `${validators.delinquent} delinquent of ${validators.total} total (${((validators.delinquent / validators.total) * 100).toFixed(1)}%)` });
  }
  if (econ && Math.abs(econ.sol.change24h) > 10) {
    derivedAnomalies.push({ metric: "sol_price", severity: "warning", title: "Large SOL price move", detail: `${econ.sol.change24h >= 0 ? "+" : ""}${econ.sol.change24h.toFixed(1)}% in 24h` });
  }
  if (econ && econ.tvlChange24h != null && Math.abs(econ.tvlChange24h) > 10) {
    derivedAnomalies.push({ metric: "tvl", severity: "info", title: "Significant TVL change", detail: `${econ.tvlChange24h >= 0 ? "+" : ""}${econ.tvlChange24h.toFixed(1)}% in 24h` });
  }

  const allAnomalies = [...anomalies.map(a => ({ metric: a.metric, severity: a.severity, title: a.title, detail: a.detail })), ...derivedAnomalies];

  return (
    <section className="border-t border-border max-w-7xl mx-auto w-full px-8 py-16">
      <SectionHeader icon={AlertTriangle} title="ANOMALY DETECTION" subtitle="TPS // SLOT TIME // DELINQUENCY // TVL // SOL PRICE" />
      {allAnomalies.length === 0 ? (
        <div className="mt-8 bg-card border border-border rounded-xl p-8 text-center">
          <AlertTriangle className="text-primary mx-auto mb-3" size={32} />
          <p className="font-mono text-sm text-primary tracking-wider uppercase">ALL CLEAR // NO ANOMALIES DETECTED</p>
          <p className="font-mono text-[10px] text-muted-foreground mt-2">All metrics within normal range. Monitoring active.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {allAnomalies.map((a, i) => {
            const color = a.severity === "critical" ? "text-red-400 border-red-500/30 bg-red-500/5" : a.severity === "warning" ? "text-amber-400 border-amber-500/30 bg-amber-500/5" : "text-primary border-primary/30 bg-primary/5";
            return (
              <div key={i} className={`border rounded-xl p-5 ${color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} />
                  <span className="font-mono text-[10px] uppercase tracking-widest font-bold">[{a.severity}] {a.metric}</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-100">{a.title}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   8. UPCOMING UPGRADES — Alpenglow, SIMD-525, Firedancer
   ════════════════════════════════════════════════════════════════════════════ */

function UpgradesSection({ pulse }: { pulse?: PulseReport | null }) {
  const upgrades = pulse?.snapshot?.upgrades ?? [];
  if (upgrades.length === 0) return null;

  return (
    <section className="border-t border-border max-w-7xl mx-auto w-full px-8 py-16">
      <SectionHeader icon={Rocket} title="UPCOMING UPGRADES" subtitle="ALPENGLOW // SIMD-525 // FIREDANCER // DEVELOPMENT PIPELINE" />
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {upgrades.map((u, i) => {
          const statusColor = u.status === "Live" || u.status === "Mainnet" ? "text-primary border-primary/40" : u.status === "Testnet" || u.status === "In development" ? "text-amber-400 border-amber-500/40" : "text-muted-foreground border-border";
          return (
            <div key={i} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h4 className="text-sm font-bold text-slate-100">{u.name}</h4>
                <span className={`font-mono text-[9px] uppercase tracking-wider border px-2 py-1 rounded whitespace-nowrap ${statusColor}`}>{u.status}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{u.note}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}


/* ════════════════════════════════════════════════════════════════════════════
   SHARED — SectionHeader
   ════════════════════════════════════════════════════════════════════════════ */

function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border pb-4">
      <div className="flex items-center gap-3">
        <Icon className="text-primary" size={20} />
        <h3 className="font-sans font-black text-2xl md:text-3xl text-slate-100 tracking-tight uppercase">{title}</h3>
      </div>
      <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase hidden md:block">{subtitle}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   9. MAIN GRID — Archive Feed + Twitter Sidebar (original spec)
   ════════════════════════════════════════════════════════════════════════════ */

function MainGrid({ newsData }: { newsData?: LiveNewsData | null }) {
  const liveNews = newsData?.news ?? [];
  const reports: Report[] = liveNews.slice(0, 6).map((n, i) => ({
    id: n.id,
    vol: `VOL. ${String(i + 4).padStart(2, "0")} // 26`,
    timestamp: String(n.publishedAt ?? Date.now()).slice(-6),
    headline: n.title.toUpperCase(),
    summary: n.summary,
    imageUrl: n.imageUrl || MOCK_REPORTS[i % MOCK_REPORTS.length].imageUrl,
  }));
  const displayReports = reports.length > 0 ? reports : MOCK_REPORTS;

  const liveTweets = newsData?.tweets ?? [];
  const tweets: MockTweet[] = liveTweets.slice(0, 3).map((t) => ({
    id: t.id,
    author: t.author,
    handle: t.handle,
    time: t.time || "\u2014",
    avatarUrl: t.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
    content: t.content,
  }));
  const displayTweets = tweets.length > 0 ? tweets : MOCK_TWEETS;

  return (
    <div className="border-t border-border">
      <div className="max-w-7xl mx-auto w-full px-8 py-16">
        <SectionHeader icon={MessageSquare} title="ARCHIVE FEED" subtitle="NEWS // REPORTS // ECOSYSTEM UPDATES" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-7xl mx-auto px-8 pb-32 w-full">
        <div className="lg:col-span-8">
          {displayReports.map((report) => (
            <article key={report.id} className="block border-b border-border py-12 group transition-all duration-300 hover:bg-card/20 px-4 first:border-t first:border-border">
              <div className="flex justify-between items-center font-mono text-xs text-muted-foreground mb-4 uppercase">
                <span>{report.vol}</span>
                <span>NETWORK_TS: {report.timestamp}</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-100 group-hover:text-primary transition-colors duration-300 leading-tight mb-4 tracking-tight uppercase">{report.headline}</h3>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-6 font-sans max-w-2xl">{report.summary}</p>
              <img src={report.imageUrl} alt={report.headline} className="w-full h-56 md:h-64 object-cover rounded-xl border border-border grayscale brightness-75 contrast-125 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700 ease-out" />
            </article>
          ))}
        </div>
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-12 self-start flex flex-col gap-12 lg:border-l lg:border-border lg:pl-10 w-full">
            <AnonymityChart />
            <TwitterSidebar tweets={displayTweets} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CHART WIDGET
   ════════════════════════════════════════════════════════════════════════════ */

function AnonymityChart() {
  return (
    <div>
      <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-4 uppercase">ANONYMITY_INDEX_HISTORY // SHIELD_LEVELS</h4>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={CHART_DATA} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00F5D4" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#00F5D4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" opacity={0.2} />
          <XAxis dataKey="name" stroke="#64748B" tick={{ fontSize: 10, fontFamily: "monospace" }} dy={10} tickLine={false} />
          <YAxis stroke="#64748B" tick={{ fontSize: 10, fontFamily: "monospace" }} domain={[90, 100]} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ backgroundColor: "#0E1626", borderColor: "#1C2A3F", borderRadius: "8px" }} labelStyle={{ color: "#64748B", fontFamily: "monospace" }} />
          <Area type="monotone" dataKey="value" stroke="#00F5D4" strokeWidth={2} fill="url(#chartGradient)" dot={false} activeDot={{ r: 4, stroke: "#060B14", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   TWITTER/X SIDEBAR
   ════════════════════════════════════════════════════════════════════════════ */

function TwitterSidebar({ tweets }: { tweets: MockTweet[] }) {
  return (
    <div>
      <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-6 flex items-center gap-2 uppercase">
        <MessageSquare className="text-primary" size={14} />
        AGGREGATED_ECOSYSTEM_NEWS // LOGS
      </h4>
      <div className="flex flex-col gap-4">
        {tweets.map((tweet) => (
          <div key={tweet.id} className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-3 transition-all duration-300 hover:border-primary/40 hover:-translate-y-1">
            <div className="flex items-center">
              <img src={tweet.avatarUrl} alt={tweet.author} className="w-9 h-9 rounded-full object-cover border border-border mr-3" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">{tweet.author}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{tweet.handle}</span>
              </div>
              <span className="ml-auto text-[10px] text-muted-foreground font-mono">{tweet.time}</span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 font-sans leading-relaxed">{tweet.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

