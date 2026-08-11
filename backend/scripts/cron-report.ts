#!/usr/bin/env node
/**
 * NODIN Cron Report Generator
 *
 * Runs on configurable interval (default 5 min).
 * Fetches all data sources, generates MD + JSON reports.
 *
 * Usage: node scripts/cron-report.js [interval_minutes]
 */
import { generateMarkdownReport, generateJsonReport, saveReport, type ReportInput } from "../src/lib/report-generator.ts";
import { SolanaRpcConnector } from "../src/lib/connectors/solana-rpc-connector.ts";
import { SolanaComDataConnector } from "../src/lib/connectors/solana-com-data-connector.ts";
import { SolanaFloorConnector } from "../src/lib/connectors/solanafloor-connector.ts";
import { TwitterRssConnector } from "../src/lib/connectors/twitter-rss-connector.ts";
import { DuneAnalyticsConnector } from "../src/lib/connectors/dune-analytics-connector.ts";
import { detectAnomalies } from "../src/lib/anomaly-engine.ts";
import { solanaMarketData, defiLlama, coinGecko } from "../src/lib/publicData.ts";
import { coverageEngine } from "../src/lib/coverage-engine.ts";

const intervalMin = parseInt(process.argv[2] || "5", 10);
const REPORTS_DIR = "./reports";

async function runOnce() {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] NODIN cron: generating report...`);

  try {
    const rpc = new SolanaRpcConnector();
    const solanaCom = new SolanaComDataConnector();
    const floor = new SolanaFloorConnector();
    const twitter = new TwitterRssConnector();
    const dune = new DuneAnalyticsConnector();

    const [network, solanaComData, floorData, duneData, coverage, economics] = await Promise.all([
      rpc.fetchNetworkSnapshot(),
      solanaCom.fetchData(),
      floor.fetchData(),
      dune.fetchData(),
      coverageEngine.reportAll(),
      (async () => {
        let solPrice = null, solChange24h = null, stablecoinSupply = null,
            dexVolume24h = null, totalTvl = null, rev = null;
        try { const p = await coinGecko.solPrice(); solPrice = p.price; solChange24h = p.change24h; } catch {}
        try { totalTvl = await defiLlama.solanaTvl(); } catch {}
        try { const s = await solanaMarketData.stablecoinBreakdown(); stablecoinSupply = s.reduce((sum, x) => sum + (x.circulating * x.price || 0), 0); } catch {}
        try { const d = await solanaMarketData.dexVolumeLeaderboard(); dexVolume24h = d.reduce((sum, x) => sum + (x.volume24h || 0), 0); } catch {}
        try { const f = await solanaMarketData.feeRevenueLeaderboard(); rev = f.reduce((sum, x) => sum + (x.revenue24h || 0), 0); } catch {}
        return { solPrice, solChange24h, stablecoinSupply, dexVolume24h, totalTvl, rev };
      })(),
    ]);

    const anomalies = detectAnomalies(network, {
      solPrice: economics.solPrice ?? undefined,
      solChange24h: economics.solChange24h ?? undefined,
      tvl: economics.totalTvl ?? undefined,
    });

    const input: ReportInput = {
      network,
      anomalies,
      economics: {
        solPrice: economics.solPrice,
        solChange24h: economics.solChange24h,
        etfDailyFlow: floorData?.etf?.dailyFlow ?? null,
        etfCumulativeFlow: floorData?.etf?.cumulativeFlow ?? null,
        stablecoinSupply: economics.stablecoinSupply,
        dexVolume24h: economics.dexVolume24h,
        medianFee: solanaComData.medianFee ?? null,
        rev: economics.rev,
      },
      ecosystem: {
        totalProjects: coverage.totalRegistered,
        totalTvl: economics.totalTvl ?? 0,
        categories: coverage.perCategory.length,
        liveProjects: coverage.totalWithLiveData,
      },
      dune: duneData,
      solanaFloor: floorData,
      sources: {
        solanaRpc: network.source,
        solanaComData: solanaComData.medianFee !== undefined ? "healthy" : "unavailable",
        defillama: economics.totalTvl !== null ? "healthy" : "unavailable",
        coingecko: economics.solPrice !== null ? "healthy" : "unavailable",
        dune: duneData.status,
        twitterRss: "healthy",
        solanaFloor: floorData?.news?.length || floorData?.etf ? "healthy" : "unavailable",
      },
    };

    const md = generateMarkdownReport(input);
    const json = generateJsonReport(input);
    const { mdPath, jsonPath } = saveReport(md, json, REPORTS_DIR);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[${new Date().toISOString()}] NODIN cron: done in ${elapsed}s`);
    console.log(`  MD:   ${mdPath}`);
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  Anomalies: ${anomalies.length}`);
    console.log(`  TPS: ${network.tps}, Validators: ${network.validators?.active ?? 'N/A'}/${network.validators?.delinquent ?? 'N/A'}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] NODIN cron: ERROR`, err);
  }
}

async function main() {
  // Run immediately
  await runOnce();

  // Schedule interval
  const intervalMs = intervalMin * 60 * 1000;
  console.log(`\nNODIN cron: scheduling every ${intervalMin} min`);
  setInterval(runOnce, intervalMs);
}

main();
