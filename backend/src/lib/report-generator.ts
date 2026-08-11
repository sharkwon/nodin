/**
 * Report Generator — Markdown + JSON output
 *
 * Generates contest-required Markdown and JSON reports from the same
 * data that powers the HTML dashboard.
 *
 * Endpoints: GET /api/report/markdown, GET /api/report/json
 * Files: reports/nodin-report-[timestamp].md, .json
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { NetworkSnapshot } from "./connectors/solana-rpc-connector.js";
import type { Anomaly, AnomalySeverity } from "./anomaly-engine.js";
import type { SolanaFloorData } from "./connectors/solanafloor-connector.js";
import type { DuneData } from "./connectors/dune-analytics-connector.js";

export interface ReportInput {
  network: NetworkSnapshot;
  anomalies: Anomaly[];
  economics: {
    solPrice: number | null;
    solChange24h: number | null;
    etfDailyFlow: number | null;
    etfCumulativeFlow: number | null;
    stablecoinSupply: number | null;
    dexVolume24h: number | null;
    medianFee: number | null;
    rev: number | null;
  };
  ecosystem: {
    totalProjects: number;
    totalTvl: number;
    categories: number;
    liveProjects: number;
  };
  dune: DuneData | null;
  solanaFloor: SolanaFloorData | null;
  sources: {
    solanaRpc: string;
    solanaComData: "healthy" | "unavailable";
    defillama: "healthy" | "unavailable";
    coingecko: "healthy" | "unavailable";
    dune: "healthy" | "awaiting-key" | "unavailable";
    twitterRss: "healthy" | "unavailable";
    solanaFloor: "healthy" | "unavailable";
  };
}

/**
 * Generate Markdown report
 */
export function generateMarkdownReport(input: ReportInput): string {
  const n = input.network;
  const e = input.economics;
  const ec = input.ecosystem;
  const s = input.sources;
  const ts = new Date().toISOString();

  const lines: string[] = [];
  lines.push(`# NODIN — Solana Ecosystem Report`);
  lines.push(`Generated: ${ts}`);
  lines.push(``);
  lines.push(`## Network Performance`);
  lines.push(
    `- TPS: ${n.tps ?? "Data unavailable"}`,
  );
  lines.push(
    `- Slot time: ${n.slotTimeMs !== null ? `${n.slotTimeMs}ms` : "Data unavailable"}`,
  );
  lines.push(
    `- Block height: ${n.blockHeight ?? "Data unavailable"}`,
  );
  if (n.epoch) {
    const progress =
      n.epoch.slotsInEpoch > 0
        ? ((n.epoch.slotIndex / n.epoch.slotsInEpoch) * 100).toFixed(1)
        : "0";
    lines.push(
      `- Epoch: ${n.epoch.epoch} (${progress}% complete)`,
    );
  } else {
    lines.push(`- Epoch: Data unavailable`);
  }
  lines.push(`- Network health: ${n.health}`);

  lines.push(``);
  lines.push(`## Validator Status`);
  if (n.validators) {
    const v = n.validators;
    lines.push(`- Active: ${v.active}`);
    lines.push(`- Delinquent: ${v.delinquent}`);
    lines.push(
      `- Delinquency rate: ${v.delinquencyRate.toFixed(2)}%`,
    );
    lines.push(
      `- Total stake: ${formatLamports(v.totalStake)}`,
    );
    lines.push(``);
    lines.push(`### Top Validators by Stake`);
    v.topByStake.forEach((val, i) => {
      lines.push(
        `${i + 1}. \`${val.votePubkey.slice(0, 12)}…\` — ${formatLamports(val.activatedStake)} (${val.commission}% commission)`,
      );
    });
  } else {
    lines.push(`- Data unavailable`);
  }

  lines.push(``);
  lines.push(`## Economic Indicators`);
  lines.push(
    `- SOL price: ${e.solPrice !== null ? `$${e.solPrice.toFixed(2)}` : "Data unavailable"}${e.solChange24h !== null ? ` (${e.solChange24h > 0 ? "+" : ""}${e.solChange24h.toFixed(1)}%)` : ""}`,
  );
  if (e.etfDailyFlow !== null || e.etfCumulativeFlow !== null) {
    lines.push(
      `- SOL ETF flow: ${e.etfDailyFlow !== null ? formatUsd(e.etfDailyFlow) : "N/A"} (cumulative: ${e.etfCumulativeFlow !== null ? formatUsd(e.etfCumulativeFlow) : "N/A"})`,
    );
  }
  lines.push(
    `- Stablecoin supply: ${e.stablecoinSupply !== null ? formatUsd(e.stablecoinSupply) : "Data unavailable"}`,
  );
  lines.push(
    `- DEX volume 24h: ${e.dexVolume24h !== null ? formatUsd(e.dexVolume24h) : "Data unavailable"}`,
  );
  lines.push(
    `- Median fee: ${e.medianFee !== null ? `$${e.medianFee.toFixed(6)}` : "Data unavailable"}`,
  );
  lines.push(
    `- REV: ${e.rev !== null ? formatUsd(e.rev) : "Data unavailable"}`,
  );

  lines.push(``);
  lines.push(`## Ecosystem`);
  lines.push(`- Total projects tracked: ${ec.totalProjects}`);
  lines.push(`- Total TVL: ${formatUsd(ec.totalTvl)}`);
  lines.push(`- Categories: ${ec.categories}`);
  lines.push(`- Live projects: ${ec.liveProjects}`);

  if (input.dune && input.dune.status !== "awaiting-key") {
    lines.push(``);
    lines.push(`## Ecosystem Growth (Dune Analytics)`);
    lines.push(
      `- Daily active addresses: ${input.dune.dailyActiveAddresses ?? "Data unavailable"}`,
    );
    lines.push(
      `- Transaction volume: ${input.dune.transactionVolume ?? "Data unavailable"}`,
    );
    lines.push(
      `- Tokenized asset volume: ${input.dune.tokenizedAssetVolume ?? "Data unavailable"}`,
    );
  }

  lines.push(``);
  lines.push(`## Anomaly Detection`);
  if (input.anomalies.length === 0) {
    lines.push(`- No anomalies detected in current sampling.`);
  } else {
    for (const a of input.anomalies) {
      lines.push(
        `- [${a.severity.toUpperCase()}] ${a.metric}: ${a.value} (expected: ${a.expected}) — ${a.description}`,
      );
    }
  }

  lines.push(``);
  lines.push(`## Upcoming Upgrades`);
  lines.push(`- Alpenglow: In development`);
  lines.push(`- SIMD-525: Proposed`);

  lines.push(``);
  lines.push(`## Data Sources`);
  lines.push(`- Solana RPC: ${s.solanaRpc}`);
  lines.push(`- solana.com/data: ${s.solanaComData}`);
  lines.push(`- SolanaFloor: ${s.solanaFloor}`);
  lines.push(`- DeFiLlama: ${s.defillama}`);
  lines.push(`- CoinGecko: ${s.coingecko}`);
  lines.push(`- Dune Analytics: ${s.dune}`);
  lines.push(`- Twitter RSS: ${s.twitterRss}`);

  return lines.join("\n");
}

/**
 * Generate JSON report
 */
export function generateJsonReport(input: ReportInput): string {
  const n = input.network;
  const e = input.economics;
  const ec = input.ecosystem;
  const s = input.sources;
  const ts = new Date().toISOString();

  const report = {
    report: "nodin-solana-ecosystem",
    version: "1.0",
    generatedAt: ts,
    network: {
      tps: n.tps,
      slotTime: n.slotTimeMs,
      blockHeight: n.blockHeight,
      epoch: n.epoch
        ? {
            current: n.epoch.epoch,
            slotInEpoch: n.epoch.slotIndex,
            slotsInEpoch: n.epoch.slotsInEpoch,
            progress:
              n.epoch.slotsInEpoch > 0
                ? (n.epoch.slotIndex / n.epoch.slotsInEpoch) * 100
                : null,
          }
        : null,
      health: n.health,
    },
    validators: n.validators
      ? {
          active: n.validators.active,
          delinquent: n.validators.delinquent,
          delinquencyRate: n.validators.delinquencyRate,
          totalStake: n.validators.totalStake,
          topByStake: n.validators.topByStake.map((v) => ({
            voteAccount: v.votePubkey,
            stake: v.activatedStake,
            commission: v.commission,
          })),
        }
      : null,
    economics: {
      solPrice: e.solPrice,
      solChange24h: e.solChange24h,
      etfFlow: {
        daily: e.etfDailyFlow,
        cumulative: e.etfCumulativeFlow,
        source: "SolanaFloor",
      },
      stablecoinSupply: e.stablecoinSupply,
      dexVolume24h: e.dexVolume24h,
      medianFee: e.medianFee,
      rev: e.rev,
    },
    ecosystem: {
      totalProjects: ec.totalProjects,
      totalTvl: ec.totalTvl,
      categories: ec.categories,
      liveProjects: ec.liveProjects,
    },
    ecosystemGrowth: input.dune
      ? {
          dailyActiveAddresses: input.dune.dailyActiveAddresses,
          transactionVolume: input.dune.transactionVolume,
          tokenizedAssetVolume: input.dune.tokenizedAssetVolume,
          bridgeVolume: input.dune.bridgeVolume,
        }
      : null,
    anomalies: input.anomalies.map((a) => ({
      severity: a.severity,
      metric: a.metric,
      value: a.value,
      expected: a.expected,
      description: a.description,
      timestamp: a.timestamp,
    })),
    upcomingUpgrades: [
      { name: "Alpenglow", status: "In development" },
      { name: "SIMD-525", status: "Proposed" },
    ],
    sources: {
      solanaRpc: { endpoint: s.solanaRpc, status: n.health === "ok" ? "healthy" : "degraded" },
      solanaComData: { status: s.solanaComData },
      solanaFloor: { status: s.solanaFloor },
      defillama: { status: s.defillama },
      coingecko: { status: s.coingecko },
      dune: { status: s.dune },
      twitterRss: { status: s.twitterRss },
    },
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Save report to file
 */
export function saveReport(
  markdown: string,
  json: string,
  reportsDir: string,
): { mdPath: string; jsonPath: string } {
  mkdirSync(reportsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const mdPath = join(reportsDir, `nodin-report-${ts}.md`);
  const jsonPath = join(reportsDir, `nodin-report-${ts}.json`);
  writeFileSync(mdPath, markdown, "utf-8");
  writeFileSync(jsonPath, json, "utf-8");
  return { mdPath, jsonPath };
}

function formatLamports(lamports: number): string {
  const sol = lamports / 1e9;
  if (sol >= 1e9) return `${(sol / 1e9).toFixed(2)}B SOL`;
  if (sol >= 1e6) return `${(sol / 1e6).toFixed(1)}M SOL`;
  if (sol >= 1e3) return `${(sol / 1e3).toFixed(1)}K SOL`;
  return `${sol.toFixed(0)} SOL`;
}

function formatUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
