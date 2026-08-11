/**
 * Anomaly detection for key Solana metrics. Threshold-based heuristics.
 */
import type { Snapshot } from "./types.js";

export interface Anomaly {
  id: string;
  metric: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  observed: number;
  threshold: number;
}

export function detectAnomalies(s: Snapshot): Anomaly[] {
  const out: Anomaly[] = [];

  const tps = s.network.tps;
  if (tps > 0 && tps < 1000) {
    out.push({
      id: "tps_low",
      metric: "tps",
      severity: "warning",
      title: "Low network throughput",
      detail: `Current TPS (${tps.toFixed(0)}) is well below Solana's typical ~2000-3000 sustained. Possible congestion.`,
      observed: tps,
      threshold: 1000,
    });
  }
  if (tps > 6000) {
    out.push({
      id: "tps_high",
      metric: "tps",
      severity: "info",
      title: "Unusual throughput spike",
      detail: `TPS (${tps.toFixed(0)}) is exceptionally high — possible stress test or burst activity.`,
      observed: tps,
      threshold: 6000,
    });
  }

  if (s.network.avgSlotTimeSec > 0.6) {
    out.push({
      id: "slot_slow",
      metric: "slot_time",
      severity: "warning",
      title: "Slow slot production",
      detail: `Average slot time ${s.network.avgSlotTimeSec.toFixed(3)}s exceeds the 0.4s target.`,
      observed: s.network.avgSlotTimeSec,
      threshold: 0.6,
    });
  }

  const delRatio =
    s.validators.total > 0 ? s.validators.delinquent / s.validators.total : 0;
  if (delRatio > 0.05) {
    out.push({
      id: "delinquency",
      metric: "delinquency",
      severity: delRatio > 0.1 ? "critical" : "warning",
      title: "Elevated validator delinquency",
      detail: `${s.validators.delinquent} of ${s.validators.total} validators (${(
        delRatio * 100
      ).toFixed(1)}%) are delinquent.`,
      observed: delRatio,
      threshold: 0.05,
    });
  }

  const solChange = s.economics.sol.change24h;
  if (Math.abs(solChange) >= 8) {
    out.push({
      id: "sol_move",
      metric: "sol_price",
      severity: Math.abs(solChange) >= 15 ? "critical" : "warning",
      title: `SOL ${solChange >= 0 ? "surge" : "drop"}`,
      detail: `SOL moved ${solChange >= 0 ? "+" : ""}${solChange.toFixed(1)}% in 24h.`,
      observed: solChange,
      threshold: 8,
    });
  }

  const tvlChange = s.economics.tvlChange24h;
  if (tvlChange !== null && Math.abs(tvlChange) >= 10) {
    out.push({
      id: "tvl_move",
      metric: "tvl",
      severity: Math.abs(tvlChange) >= 20 ? "critical" : "warning",
      title: `Solana TVL ${tvlChange >= 0 ? "inflow" : "outflow"}`,
      detail: `TVL changed ${tvlChange >= 0 ? "+" : ""}${tvlChange.toFixed(1)}% in 24h.`,
      observed: tvlChange,
      threshold: 10,
    });
  }

  // Median fee spike — high priority fee demand suggests congestion or MEV activity
  if (s.economics.medianFeeLamports > 10_000) {
    out.push({
      id: "fee_spike",
      metric: "median_fee",
      severity: s.economics.medianFeeLamports > 50_000 ? "warning" : "info",
      title: "Elevated transaction fees",
      detail: `Median per-tx fee is ${(s.economics.medianFeeLamports / 1e6).toFixed(3)} µSOL — above the ~5,000 lamport base. ` +
        `Also suggests high priority-fee demand.`,
      observed: s.economics.medianFeeLamports,
      threshold: 10_000,
    });
  }

  // Stablecoin supply is tracked in the report; no threshold baseline stored.

  // REV watch — extreme revenue implies heavy usage (informational)
  const revM = s.economics.rev;
  if (revM !== null && revM > 0 && revM > 10_000_000) {
    out.push({
      id: "rev_high",
      metric: "rev",
      severity: "info",
      title: "High 24h REV",
      detail: `Estimated Real Economic Value is $${(revM / 1e6).toFixed(1)}M — unusually strong network usage.`,
      observed: revM,
      threshold: 10_000_000,
    });
  }

  // DAU anomaly
  const dau = s.economics.dailyActiveWallets;
  if (dau !== null && dau > 0 && dau > 5_000_000) {
    out.push({
      id: "dau_spike",
      metric: "dau",
      severity: "info",
      title: "Daily active wallets elevated",
      detail: `Estimated DAU at ${dau.toLocaleString()} — significantly above the ~1-1.5M typical baseline.`,
      observed: dau,
      threshold: 5_000_000,
    });
  }

  return out;
}