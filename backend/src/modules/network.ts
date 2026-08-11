/**
 * Network & Report API Router
 *
 * V3 endpoints:
 * GET /api/network/snapshot   — live RPC network data
 * GET /api/network/anomalies  — anomaly detection results
 * GET /api/report/markdown    — Markdown report
 * GET /api/report/json        — JSON report
 * GET /api/news/feed           — combined news (SolanaFloor + Twitter RSS)
 * GET /api/etf/flow            — ETF flow data
 */
import { Router, type Request, type Response } from "express";
import { SolanaRpcConnector } from "../lib/connectors/solana-rpc-connector.js";
import { SolanaComDataConnector } from "../lib/connectors/solana-com-data-connector.js";
import { SolanaFloorConnector } from "../lib/connectors/solanafloor-connector.js";
import { TwitterRssConnector } from "../lib/connectors/twitter-rss-connector.js";
import { DuneAnalyticsConnector } from "../lib/connectors/dune-analytics-connector.js";
import { detectAnomalies, summarizeAnomalies } from "../lib/anomaly-engine.js";
import {
  generateMarkdownReport,
  generateJsonReport,
  type ReportInput,
} from "../lib/report-generator.js";
import {
  solanaMarketData,
  defiLlama,
  coinGecko,
} from "../lib/publicData.js";
import { coverageEngine } from "../lib/coverage-engine.js";
import { CANONICAL_PROJECTS } from "../lib/ecosystem-registry.js";

export const networkRouter = Router();

// Singleton connectors
const rpcConnector = new SolanaRpcConnector();
const solanaComConnector = new SolanaComDataConnector();
const solanaFloorConnector = new SolanaFloorConnector();
const twitterRssConnector = new TwitterRssConnector();
const duneConnector = new DuneAnalyticsConnector();

// Cache network snapshot (30s TTL)
let cachedSnapshot: {
  data: any;
  anomalies: any[];
  timestamp: string;
} | null = null;
const SNAPSHOT_TTL = 30_000;

/**
 * Fetch market/economics data from existing APIs
 */
async function fetchEconomics() {
  let solPrice: number | null = null;
  let solChange24h: number | null = null;
  let stablecoinSupply: number | null = null;
  let dexVolume24h: number | null = null;
  let totalTvl: number | null = null;
  let tvlChange24h: number | null = null;
  let rev: number | null = null;

  // CoinGecko with retry (rate-limited frequently)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const priceData = await coinGecko.solPrice();
      if (priceData.price > 0) {
        solPrice = priceData.price;
        solChange24h = priceData.change24h;
        break;
      }
    } catch {}
    if (attempt < 2) await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }

  try {
    totalTvl = await defiLlama.solanaTvl();
  } catch {}

  try {
    const stablecoins = await solanaMarketData.stablecoinBreakdown();
    stablecoinSupply = stablecoins.reduce((sum, s) => sum + (s.circulating * s.price || 0), 0);
  } catch {}

  try {
    const dexVol = await solanaMarketData.dexVolumeLeaderboard();
    dexVolume24h = dexVol.reduce((sum, d) => sum + (d.volume24h || 0), 0);
  } catch {}

  try {
    const fees = await solanaMarketData.feeRevenueLeaderboard();
    rev = fees.reduce((sum, f) => sum + (f.revenue24h || 0), 0);
  } catch {}

  return { solPrice, solChange24h, stablecoinSupply, dexVolume24h, totalTvl, tvlChange24h, rev };
}

/**
 * Collect all data for reports
 */
async function collectReportData(): Promise<ReportInput> {
  const [network, solanaComData, solanaFloorData, duneData, coverage, economics] =
    await Promise.all([
      rpcConnector.fetchNetworkSnapshot(),
      solanaComConnector.fetchData(),
      solanaFloorConnector.fetchData(),
      duneConnector.fetchData(),
      coverageEngine.reportAll(),
      fetchEconomics(),
    ]);

  // Market data for anomaly detection
  const marketData = {
    solPrice: economics.solPrice ?? undefined,
    solChange24h: economics.solChange24h ?? undefined,
    tvl: economics.totalTvl ?? undefined,
    tvlChange24h: economics.tvlChange24h ?? undefined,
  };

  const anomalies = detectAnomalies(network, marketData);

  const etfDailyFlow = solanaFloorData?.etf?.dailyFlow ?? null;
  const etfCumulativeFlow = solanaFloorData?.etf?.cumulativeFlow ?? null;

  // Use median fee from solana.com/data if available
  const medianFee = solanaComData.medianFee ?? null;

  const sources = {
    solanaRpc: network.source,
    solanaComData:
      solanaComData.medianFee !== undefined || solanaComData.tvl !== undefined
        ? ("healthy" as const)
        : ("unavailable" as const),
    defillama: economics.totalTvl !== null ? ("healthy" as const) : ("unavailable" as const),
    coingecko: economics.solPrice !== null ? ("healthy" as const) : ("unavailable" as const),
    dune: duneData.status,
    twitterRss:
      (twitterRssConnector ? "healthy" : "unavailable") as "healthy" | "unavailable",
    solanaFloor:
      solanaFloorData?.news?.length || solanaFloorData?.etf
        ? ("healthy" as const)
        : ("unavailable" as const),
  };

  return {
    network,
    anomalies,
    economics: {
      solPrice: economics.solPrice,
      solChange24h: economics.solChange24h,
      etfDailyFlow,
      etfCumulativeFlow,
      stablecoinSupply: economics.stablecoinSupply,
      dexVolume24h: economics.dexVolume24h,
      medianFee,
      rev: economics.rev,
    },
    ecosystem: {
      totalProjects: coverage.totalRegistered,
      totalTvl: economics.totalTvl ?? 0,
      categories: coverage.perCategory.length,
      liveProjects: coverage.totalWithLiveData,
    },
    dune: duneData,
    solanaFloor: solanaFloorData,
    sources,
  };
}

// ── GET /network/snapshot ──
networkRouter.get("/snapshot", async (_req: Request, res: Response) => {
  try {
    if (cachedSnapshot && Date.now() - new Date(cachedSnapshot.timestamp).getTime() < SNAPSHOT_TTL) {
      return res.json(cachedSnapshot.data);
    }

    const network = await rpcConnector.fetchNetworkSnapshot();
    const economics = await fetchEconomics();
    const marketData = {
      solPrice: economics.solPrice ?? undefined,
      solChange24h: economics.solChange24h ?? undefined,
      tvl: economics.totalTvl ?? undefined,
      tvlChange24h: economics.tvlChange24h ?? undefined,
    };
    const anomalies = detectAnomalies(network, marketData);
    const summary = summarizeAnomalies(anomalies);

    const response = { ...network, anomalies, anomalySummary: summary };

    cachedSnapshot = {
      data: response,
      anomalies,
      timestamp: new Date().toISOString(),
    };

    return res.json(response);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch network snapshot" });
  }
});

// ── GET /network/anomalies ──
networkRouter.get("/anomalies", async (_req: Request, res: Response) => {
  try {
    const network = await rpcConnector.fetchNetworkSnapshot();
    const economics = await fetchEconomics();
    const marketData = {
      solPrice: economics.solPrice ?? undefined,
      solChange24h: economics.solChange24h ?? undefined,
      tvl: economics.totalTvl ?? undefined,
      tvlChange24h: economics.tvlChange24h ?? undefined,
    };
    const anomalies = detectAnomalies(network, marketData);
    const summary = summarizeAnomalies(anomalies);

    return res.json({ anomalies, summary, timestamp: new Date().toISOString() });
  } catch {
    return res.status(500).json({ error: "Failed to run anomaly detection" });
  }
});

// ── GET /markdown ──
networkRouter.get("/markdown", async (_req: Request, res: Response) => {
  try {
    const data = await collectReportData();
    const md = generateMarkdownReport(data);
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    return res.send(md);
  } catch {
    return res.status(500).json({ error: "Failed to generate Markdown report" });
  }
});

// ── GET /json ──
networkRouter.get("/json", async (_req: Request, res: Response) => {
  try {
    const data = await collectReportData();
    const json = generateJsonReport(data);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.json(JSON.parse(json));
  } catch {
    return res.status(500).json({ error: "Failed to generate JSON report" });
  }
});

// ── GET /news/feed ── (SolanaFloor + Twitter RSS)
networkRouter.get("/news/feed", async (_req: Request, res: Response) => {
  try {
    const [floorData, twitterData] = await Promise.all([
      solanaFloorConnector.fetchData(),
      twitterRssConnector.fetchData(),
    ]);

    const items = [
      ...floorData.news.map((n) => ({
        title: n.title,
        snippet: n.snippet,
        url: n.url,
        publishedAt: n.publishedAt,
        source: "SolanaFloor" as const,
      })),
      ...twitterData.items.map((t) => ({
        title: `${t.account}: ${t.content.slice(0, 80)}`,
        snippet: t.content,
        url: t.url,
        publishedAt: t.publishedAt,
        source: "Twitter" as const,
        author: t.handle,
      })),
    ].sort((a, b) => {
      if (!a.publishedAt) return 1;
      if (!b.publishedAt) return -1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    return res.json({
      items: items.slice(0, 50),
      totalSources: 2,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch news feed" });
  }
});

// ── GET /etf/flow ──
networkRouter.get("/etf/flow", async (_req: Request, res: Response) => {
  try {
    const floorData = await solanaFloorConnector.fetchData();
    return res.json({
      etf: floorData.etf,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch ETF data" });
  }
});

export default networkRouter;
