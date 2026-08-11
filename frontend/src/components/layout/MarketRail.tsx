/**
 * MarketRail — compact market context module
 *
 * Shows SOL price, market cap, TVL, DEX volume in a compact horizontal strip.
 * Uses null-safe rendering — never shows $0 for unavailable data.
 */
import { cn } from "@/lib/utils";
import { type DataStateValue, DataState } from "@/components/design-system";
import { fmtUsd } from "@/lib/format";

interface MarketData {
  solPrice: number | null;
  solChange24h: number | null;
  marketCap: number | null;
  tvl: number | null;
  dexVolume: number | null;
}

interface MarketRailProps {
  data: MarketData | null;
  loading?: boolean;
  className?: string;
}

export function MarketRail({ data, loading, className }: MarketRailProps) {
  const items: { label: string; value: React.ReactNode; state: DataStateValue; change?: number | null }[] = [
    {
      label: "SOL",
      value: data?.solPrice != null ? `$${data.solPrice.toFixed(2)}` : null,
      state: data?.solPrice != null ? "available" : loading ? "loading" : "unavailable",
      change: data?.solChange24h ?? undefined,
    },
    {
      label: "Market Cap",
      value: data?.marketCap != null ? fmtUsd(data.marketCap) : null,
      state: data?.marketCap != null ? "available" : loading ? "loading" : "unavailable",
    },
    {
      label: "TVL",
      value: data?.tvl != null ? fmtUsd(data.tvl) : null,
      state: data?.tvl != null ? "available" : loading ? "loading" : "unavailable",
    },
    {
      label: "DEX Volume",
      value: data?.dexVolume != null ? fmtUsd(data.dexVolume) : null,
      state: data?.dexVolume != null ? "available" : loading ? "loading" : "unavailable",
    },
  ];

  return (
    <div className={cn("border-y border-border bg-surface", className)}>
      <div className="container-editorial">
        <div className="flex items-center gap-6 py-3 overflow-x-auto nodin-scroll">
          {items.map((item, i) => (
            <div key={item.label} className="flex items-center gap-2 flex-shrink-0">
              {i > 0 && <div className="h-4 w-px bg-border flex-shrink-0" />}
              <div className="flex flex-col">
                <span className="text-label text-muted-foreground">{item.label}</span>
                <div className="flex items-baseline gap-2">
                  <DataState
                    state={item.state}
                    value={item.value}
                    size="sm"
                  />
                  {item.change != null && (
                    <span
                      className={cn(
                        "text-ticker tabular-nums",
                        item.change >= 0 ? "data-text-available" : "data-text-unavailable",
                      )}
                    >
                      {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
