/**
 * SourceAttribution — editorial data provenance display
 *
 * Format: [Data type] powered by [Source]
 * Source name is clickable to official source/API page when URL is available.
 * Never fabricates attribution — only renders when source is provided.
 */
import { cn } from "@/lib/utils";

interface SourceAttributionProps {
  /** Human-readable data type, e.g. "TVL data", "Price data" */
  dataType: string;
  /** Source provider name, e.g. "DeFiLlama", "Pyth Network" */
  source: string;
  /** Optional URL to official source/API page */
  sourceUrl?: string;
  className?: string;
}

export function SourceAttribution({ dataType, source, sourceUrl, className }: SourceAttributionProps) {
  return (
    <span className={cn("text-metadata text-muted-foreground", className)}>
      {dataType} powered by{" "}
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-secondary hover:text-foreground transition-colors underline decoration-dotted underline-offset-2"
        >
          {source}
        </a>
      ) : (
        <span className="text-secondary">{source}</span>
      )}
    </span>
  );
}

/**
 * Maps raw capability strings from API to human-readable data type labels.
 * Falls back to capitalized raw value for unknown capabilities.
 */
export function capabilityLabel(capability: string): string {
  const KNOWN: Record<string, string> = {
    tvl: "TVL data",
    volume: "Volume data",
    dexVolume: "DEX volume data",
    fees: "Fee data",
    revenue: "Revenue data",
    price: "Price data",
    marketCap: "Market cap data",
    stablecoinSupply: "Stablecoin supply data",
    circulatingSupply: "Circulating supply data",
    totalSupply: "Total supply data",
    nft_floor: "NFT floor price data",
    nft_floor_price: "NFT floor price data",
    nft_volume: "NFT volume data",
    nft_sales: "NFT sales data",
    oracle_price: "Oracle price data",
    price_feed: "Price feed data",
    historical: "Historical data",
    protocol: "Protocol data",
    tokens: "Token data",
    pools: "Pool data",
    swaps: "Swap data",
    liquidity: "Liquidity data",
    stake: "Stake data",
    validators: "Validator data",
    network: "Network data",
    social: "Social data",
    news: "News data",
  };
  return KNOWN[capability] ?? capability.charAt(0).toUpperCase() + capability.slice(1).replace(/_/g, " ") + " data";
}
