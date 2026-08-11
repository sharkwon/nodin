/**
 * Analysis page — unified dashboard
 *
 * Layout: Hero strip → ProtocolToolbox → Leaderboards → Stablecoins → Coverage
 */
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Activity, DollarSign, Zap, Coins } from "lucide-react";
import { insightApi } from "@/lib/nodin";
import { ProtocolToolbox } from "@/components/ProtocolToolbox";

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function ResearchPage() {
  const { data: pulseData } = useQuery({
    queryKey: ["pulse"],
    queryFn: insightApi.pulse,
    refetchInterval: 60_000,
  });

  const [dexVolume, setDexVolume] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [stablecoins, setStablecoins] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/insight/dex-volume").then((r) => r.json()).then(setDexVolume).catch(() => {});
    fetch("/api/insight/fees").then((r) => r.json()).then(setFees).catch(() => {});
    fetch("/api/insight/stablecoins").then((r) => r.json()).then(setStablecoins).catch(() => {});
  }, []);

  const econ = pulseData?.snapshot?.economics;
  const totalStable = stablecoins.reduce((s, c) => s + (c.circulating || 0), 0);
  const totalDexVol = dexVolume.reduce((s, d) => s + (d.volume24h || 0), 0);
  const totalFees = fees.reduce((s, f) => s + (f.revenue24h || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* HERO STRIP */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto w-full px-8 pt-12 pb-8">
          <h1 className="font-sans font-black text-4xl text-slate-100 tracking-tight uppercase mb-2">Analysis</h1>
          <p className="text-muted-foreground text-sm font-mono tracking-wide max-w-2xl">
            On-chain data, market metrics, protocol coverage, and ecosystem intelligence.
          </p>

          {/* 6 metric strip */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-border border border-border rounded-xl overflow-hidden">
            <HeroMetric icon={Activity} label="TOTAL TVL" value={econ?.tvl ? fmtUsd(econ.tvl) : "---"} sub={econ?.tvlChange24h != null ? `${econ.tvlChange24h >= 0 ? "+" : ""}${econ.tvlChange24h.toFixed(1)}% 24h` : undefined} positive={econ?.tvlChange24h != null ? econ.tvlChange24h >= 0 : undefined} />
            <HeroMetric icon={DollarSign} label="SOL PRICE" value={econ?.sol ? `$${econ.sol.price.toFixed(2)}` : "---"} sub={econ?.sol ? `${econ.sol.change24h >= 0 ? "+" : ""}${econ.sol.change24h.toFixed(1)}% 24h` : undefined} positive={econ?.sol ? econ.sol.change24h >= 0 : undefined} />
            <HeroMetric icon={Zap} label="DEX VOLUME" value={totalDexVol > 0 ? fmtUsd(totalDexVol) : "---"} sub="24h aggregate" />
            <HeroMetric icon={DollarSign} label="FEES 24H" value={totalFees > 0 ? fmtUsd(totalFees) : "---"} sub="revenue" positive={true} />
            <HeroMetric icon={Coins} label="STABLECOINS" value={totalStable > 0 ? fmtUsd(totalStable) : "---"} sub="circulating" />
            <HeroMetric icon={Activity} label="REV 24H" value={econ?.rev ? fmtUsd(econ.rev) : "---"} sub="real econ value" positive={true} />
          </div>
        </div>
      </section>

      {/* PROTOCOL TOOLBOX — full width */}
      <section className="w-full px-6 lg:px-10 py-12">
        <SectionHeader title="PROTOCOL EXPLORER" subtitle="326 PROTOCOLS // 15 CATEGORIES // TVL + 90D CHART" />
        <div className="mt-8">
          <ProtocolToolbox />
        </div>
      </section>

      {/* LEADERBOARDS — full width */}
      <section className="w-full px-6 lg:px-10 pb-12">
        <SectionHeader title="LEADERBOARDS" subtitle="DEX VOLUME // FEE REVENUE // 24H RANKING" />
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Leaderboard title="DEX VOLUME — 24H" items={dexVolume.slice(0, 10).map((d) => ({ name: d.name, value: d.volume24h, change: d.change_1d }))} fmtVal={fmtUsd} />
          <Leaderboard title="FEE / REVENUE — 24H" items={fees.slice(0, 10).map((f) => ({ name: f.name, value: f.revenue24h, change: f.change_1d }))} fmtVal={fmtUsd} />
        </div>
      </section>

      {/* STABLECOIN LEADERBOARD — full width */}
      {stablecoins.length > 0 && (
        <section className="w-full px-6 lg:px-10 pb-20">
          <SectionHeader title="STABLECOIN SUPPLY" subtitle={`${stablecoins.length} ASSETS // TOTAL: ${fmtUsd(totalStable)} // CIRCULATING RANKED`} />

          {/* Top 6 quick strip */}
          <p className="mt-6 mb-3 font-mono text-[10px] text-muted-foreground tracking-wider uppercase">Top 6 by circulating supply</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-border border border-border rounded-xl overflow-hidden">
            {stablecoins.slice(0, 6).map((s, i) => (
              <div key={i} className="bg-card px-4 py-4 flex flex-col gap-1">
                <span className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase">{s.symbol}</span>
                <span className="font-mono text-lg font-bold text-primary tabular-nums leading-none">{fmtUsd(s.circulating || 0)}</span>
                <span className="font-mono text-[9px] text-muted-foreground truncate">{s.name}</span>
              </div>
            ))}
          </div>

          {/* Ranked leaderboard */}
          <p className="mt-8 mb-3 font-mono text-[10px] text-muted-foreground tracking-wider uppercase">Full ranking</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StablecoinLeaderboard
              title="STABLECOINS — RANK 1-13"
              items={stablecoins.slice(0, 13)}
              total={totalStable}
              startIndex={0}
              fmtVal={fmtUsd}
            />
            <StablecoinLeaderboard
              title="STABLECOINS — RANK 14-26"
              items={stablecoins.slice(13, 26)}
              total={totalStable}
              startIndex={13}
              maxVal={stablecoins[0]?.circulating}
              fmtVal={fmtUsd}
            />
          </div>
        </section>
      )}

      {/* END */}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border pb-4">
      <h2 className="font-sans font-black text-2xl text-slate-100 tracking-tight uppercase">{title}</h2>
      <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase hidden md:block">{subtitle}</span>
    </div>
  );
}

function HeroMetric({ icon: Icon, label, value, sub, positive }: { icon: any; label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-card px-5 py-5 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Icon className="text-primary" size={14} />
        <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">{label}</span>
      </div>
      <span className={`font-mono text-xl font-bold tabular-nums leading-none ${positive === true ? "text-primary" : positive === false ? "text-red-400" : "text-slate-200"}`}>{value}</span>
      {sub && <span className={`font-mono text-[10px] mt-0.5 ${positive === false ? "text-red-400/60" : "text-muted-foreground"}`}>{sub}</span>}
    </div>
  );
}

function Leaderboard({ title, items, fmtVal }: { title: string; items: { name: string; value: number; change?: number }[]; fmtVal: (n: number) => string }) {
  const maxVal = items[0]?.value || 1;
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-4 uppercase">{title}</h4>
      <div className="space-y-2">
        {items.map((item, i) => {
          const pct = (item.value / maxVal) * 100;
          const barWidth = Math.max(2, pct);
          const isUp = (item.change ?? 0) >= 0;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-muted-foreground/60 w-5">{i + 1}</span>
              <span className="font-mono text-xs text-slate-200 w-32 truncate">{item.name}</span>
              <div className="flex-1 h-5 bg-background rounded relative overflow-hidden border border-border/30">
                <div className="h-full bg-primary/20 rounded" style={{ width: `${barWidth}%` }} />
              </div>
              <span className="font-mono text-xs text-primary tabular-nums w-16 text-right">{fmtVal(item.value)}</span>
              {item.change != null && (
                <span className={`flex items-center gap-0.5 font-mono text-[9px] tabular-nums w-12 ${isUp ? "text-primary" : "text-red-400"}`}>
                  {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {isUp ? "+" : ""}{item.change.toFixed(1)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StablecoinLeaderboard({
  title,
  items,
  total,
  startIndex,
  maxVal,
  fmtVal,
}: {
  title: string;
  items: { symbol: string; name: string; circulating: number; pegType?: string }[];
  total: number;
  startIndex: number;
  maxVal?: number;
  fmtVal: (n: number) => string;
}) {
  const barMax = maxVal ?? items[0]?.circulating ?? 1;
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-4 uppercase">{title}</h4>
      <div className="space-y-2">
        {items.map((item, i) => {
          const pct = (item.circulating / barMax) * 100;
          const barWidth = Math.max(2, pct);
          const share = total > 0 ? (item.circulating / total) * 100 : 0;
          return (
            <div key={item.symbol + i} className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-muted-foreground/60 w-5">{startIndex + i + 1}</span>
              <div className="w-28 min-w-0">
                <span className="font-mono text-xs text-slate-200">{item.symbol}</span>
                <span className="block font-mono text-[9px] text-muted-foreground truncate">{item.name}</span>
              </div>
              <div className="flex-1 h-5 bg-background rounded relative overflow-hidden border border-border/30">
                <div className="h-full bg-primary/20 rounded" style={{ width: `${barWidth}%` }} />
              </div>
              <span className="font-mono text-xs text-primary tabular-nums w-16 text-right">{fmtVal(item.circulating)}</span>
              <span className="font-mono text-[9px] text-muted-foreground tabular-nums w-11 text-right">{share.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
