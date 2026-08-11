import { useState, useEffect } from "react";
import type { StablecoinItem } from "../lib/nodin";

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function StablecoinBreakdown() {
  const [data, setData] = useState<StablecoinItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insight/stablecoins")
      .then((r) => r.json())
      .then((d: StablecoinItem[]) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="border-b border-border px-6 lg:px-10 py-10">
        <h3 className="text-lg font-bold text-foreground mb-1">Stablecoins on Solana</h3>
        <p className="text-xs text-muted-foreground mb-6">Circulating supply per token</p>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-card/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="border-b border-border px-6 lg:px-10 py-10">
        <h3 className="text-lg font-bold text-foreground mb-1">Stablecoins on Solana</h3>
        <p className="text-xs text-muted-foreground">No stablecoin data available</p>
      </div>
    );
  }

  const top = data.slice(0, 12);
  const total = data.reduce((s, d) => s + d.circulating, 0);
  const maxCirc = top[0]?.circulating || 1;

  return (
    <div className="border-b border-border px-6 lg:px-10 py-10">
      <h3 className="text-lg font-bold text-foreground mb-1">Stablecoins on Solana</h3>
      <p className="text-xs text-muted-foreground mb-6">
        {data.length} tokens · Total: {fmtUsd(total)} · Top {top.length} shown
      </p>
      <div className="space-y-1">
        {top.map((sc, i) => (
          <div
            key={sc.symbol + i}
            className="flex items-center gap-3 px-4 py-2.5 rounded border border-border/20 hover:border-primary/20 transition-colors"
          >
            <span className="text-[9px] font-mono text-muted-foreground w-6 text-right">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground">
                {sc.symbol}
              </span>
              <span className="ml-2 text-[10px] text-muted-foreground truncate">
                {sc.name}
              </span>
              <span className="ml-2 text-[8px] font-mono uppercase text-muted-foreground/50">
                {sc.pegType}
              </span>
            </div>
            <div className="hidden sm:block w-24 lg:w-32">
              <div className="h-1.5 bg-muted/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/30 rounded-full"
                  style={{ width: `${(sc.circulating / maxCirc) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-mono tabular-nums text-foreground w-24 text-right">
              {fmtUsd(sc.circulating)}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground w-12 text-right">
              {((sc.circulating / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
