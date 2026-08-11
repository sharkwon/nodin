import { useState, useEffect } from "react";
import type { FeeRevenueItem } from "../lib/nodin";
import { cn } from "../lib/utils";

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function FeeRevenueLeaderboard() {
  const [data, setData] = useState<FeeRevenueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insight/fees")
      .then((r) => r.json())
      .then((d: FeeRevenueItem[]) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="border-b border-border px-6 lg:px-10 py-10">
        <h3 className="text-lg font-bold text-foreground mb-1">Revenue — 24h</h3>
        <p className="text-xs text-muted-foreground mb-6">Solana protocol revenue leaderboard</p>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-card/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="border-b border-border px-6 lg:px-10 py-10">
        <h3 className="text-lg font-bold text-foreground mb-1">Revenue — 24h</h3>
        <p className="text-xs text-muted-foreground">No revenue data available</p>
      </div>
    );
  }

  const maxRev = data[0]?.revenue24h || 1;

  return (
    <div className="border-b border-border px-6 lg:px-10 py-10">
      <h3 className="text-lg font-bold text-foreground mb-1">Revenue — 24h</h3>
      <p className="text-xs text-muted-foreground mb-6">
        Solana protocols by 24h revenue — top {data.length}
      </p>
      <div className="space-y-1">
        {data.map((item, i) => (
          <div
            key={item.slug || i}
            className="flex items-center gap-3 px-4 py-2.5 rounded border border-border/20 hover:border-primary/20 transition-colors"
          >
            <span className="text-[9px] font-mono text-muted-foreground w-6 text-right">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground truncate block">
                {item.name}
              </span>
            </div>
            <div className="hidden sm:block w-20 lg:w-28">
              <div className="h-1.5 bg-muted/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/30 rounded-full"
                  style={{ width: `${(item.revenue24h / maxRev) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-mono tabular-nums text-foreground w-20 text-right">
              {fmtUsd(item.revenue24h)}
            </span>
            <span
              className={cn(
                "text-[9px] font-mono w-12 text-right",
                item.change_1d >= 0 ? "text-primary" : "text-destructive"
              )}
            >
              {item.change_1d >= 0 ? "+" : ""}
              {item.change_1d.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
