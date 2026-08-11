/**
 * Built-in fallback dataset for Solana protocols and macro metrics.
 * Used ONLY when live public sources (DeFiLlama / CoinGecko) are unreachable,
 * so the dashboard always renders. Items sourced here are clearly flagged as
 * synthetic demo data in the generated report.
 */
export interface StaticProtocol {
  name: string;
  slug: string;
  category: string;
  tvl: number;
  change7d: number;
  change1d: number;
  mcap?: number;
}

export const STATIC_PROTOCOLS: StaticProtocol[] = [
  { name: "Jito", slug: "jito", category: "Liquid Staking", tvl: 2_450_000_000, change7d: 2.1, change1d: 0.4, mcap: 2_900_000_000 },
  { name: "Jupiter", slug: "jupiter", category: "DEX", tvl: 2_800_000_000, change7d: -1.8, change1d: 0.2, mcap: 1_400_000_000 },
  { name: "Kamino", slug: "kamino", category: "Lending", tvl: 1_850_000_000, change7d: 0.9, change1d: -0.1 },
  { name: "Marinade", slug: "marinade", category: "Liquid Staking", tvl: 1_200_000_000, change7d: 1.2, change1d: 0.3 },
  { name: "Raydium", slug: "raydium", category: "DEX", tvl: 1_600_000_000, change7d: 3.4, change1d: 0.6, mcap: 600_000_000 },
  { name: "Drift", slug: "drift", category: "Perpetuals", tvl: 650_000_000, change7d: -2.3, change1d: -0.4 },
  { name: "Solend", slug: "solend", category: "Lending", tvl: 280_000_000, change7d: -0.7, change1d: 0.1 },
  { name: "Marginfi", slug: "marginfi", category: "Lending", tvl: 320_000_000, change7d: 1.5, change1d: 0.2 },
  { name: "Meteora", slug: "meteora", category: "DEX", tvl: 520_000_000, change7d: 4.1, change1d: 0.8 },
  { name: "Helius / HSol", slug: "heon", category: "Liquid Staking", tvl: 410_000_000, change7d: 2.7, change1d: 0.3 },
];

export const STATIC_MACRO = {
  solanaTvl: 9_200_000_000,
  dexVolume: 3_100_000_000,
  tvlChange24h: 0.6,
  stablecoinSupply: 4_800_000_000,
  dailyActiveWallets: 1_200_000,
  tokenizedAssets: 3_730_000_000,
};