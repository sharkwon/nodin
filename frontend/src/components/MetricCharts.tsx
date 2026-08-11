import { useState, useEffect } from "react";
import { cn } from "../lib/utils";

type ChartPoint = { date: number; tvl: number };
type PricePoint = { t: number; price: number };

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPrice(n: number): string {
  if (n >= 100) return `$${n.toFixed(2)}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

export function MetricCharts({ priceHistory7d }: { priceHistory7d?: PricePoint[] }) {
  const [tvlData, setTvlData] = useState<ChartPoint[]>([]);
  const [tvlLoading, setTvlLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insight/tvl-history?days=90")
      .then((r) => r.json())
      .then((d: { points: ChartPoint[] }) => {
        setTvlData(d.points || []);
        setTvlLoading(false);
      })
      .catch(() => setTvlLoading(false));
  }, []);

  return (
    <div className="border-b border-border px-6 lg:px-10 py-10">
      <h3 className="text-lg font-bold text-foreground mb-1">Metric Charts</h3>
      <p className="text-xs text-muted-foreground mb-6">90-day trends — Solana network metrics</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SOL Price 7d */}
        <div className="border border-border/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
              SOL Price — 7d
            </span>
            {priceHistory7d && priceHistory7d.length > 1 && (
              <span
                className={cn(
                  "text-[9px] font-mono",
                  priceHistory7d[priceHistory7d.length - 1].price >= priceHistory7d[0].price
                    ? "text-primary"
                    : "text-destructive"
                )}
              >
                {((priceHistory7d[priceHistory7d.length - 1].price - priceHistory7d[0].price) /
                  priceHistory7d[0].price *
                  100).toFixed(1)}
                %
              </span>
            )}
          </div>
          {priceHistory7d && priceHistory7d.length > 1 ? (
            <AreaChart data={priceHistory7d.map((p) => ({ date: p.t, value: p.price }))} fmtVal={fmtPrice} />
          ) : (
            <div className="h-32 bg-muted/10 rounded animate-pulse" />
          )}
        </div>

        {/* Solana Network TVL 90d */}
        <div className="border border-border/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
              Network TVL — 90d
            </span>
            {tvlData.length > 1 && (
              <span
                className={cn(
                  "text-[9px] font-mono",
                  tvlData[tvlData.length - 1].tvl >= tvlData[0].tvl ? "text-primary" : "text-destructive"
                )}
              >
                {((tvlData[tvlData.length - 1].tvl - tvlData[0].tvl) / tvlData[0].tvl * 100).toFixed(1)}%
              </span>
            )}
          </div>
          {!tvlLoading && tvlData.length > 1 ? (
            <AreaChart data={tvlData.map((p) => ({ date: p.date, value: p.tvl }))} fmtVal={fmtUsd} />
          ) : (
            <div className="h-32 bg-muted/10 rounded animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

function AreaChart({
  data,
  fmtVal,
}: {
  data: { date: number; value: number }[];
  fmtVal: (n: number) => string;
}) {
  const W = 400;
  const H = 120;
  const PAD = 6;

  const vals = data.map((d) => d.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const minDate = data[0].date;

  const points = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - 2 * PAD);
    const y = H - PAD - ((d.value - minV) / range) * (H - 2 * PAD);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const isUp = data[data.length - 1].value >= data[0].value;
  const stroke = isUp ? "#00F5D4" : "#ef4444";
  const fill = isUp ? "rgba(0,245,212,0.08)" : "rgba(239,68,68,0.08)";
  const areaPath = `M ${points[0]} L ${points.join(" L ")} L ${(W - PAD).toFixed(1)},${(H - PAD).toFixed(1)} L ${PAD.toFixed(1)},${(H - PAD).toFixed(1)} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
        <path d={areaPath} fill={fill} />
        <polyline points={points.join(" ")} fill="none" stroke={stroke} strokeWidth="1.5" />
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-mono text-muted-foreground">
          {fmtVal(minV)}
        </span>
        <span className="text-[9px] font-mono text-muted-foreground">
          {new Date(minDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
        <span className={cn("text-[9px] font-mono", isUp ? "text-primary" : "text-destructive")}>
          {fmtVal(maxV)}
        </span>
      </div>
    </div>
  );
}
