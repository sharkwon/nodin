/**
 * Anomaly Detection Engine
 *
 * Monitors key Solana metrics and detects anomalies based on thresholds.
 * Uses rolling averages from performance samples + historical snapshots.
 *
 * Rules:
 * - TPS drop > 30% from rolling average
 * - TPS spike > 50% from rolling average
 * - Slot time > 600ms (expected ~400ms)
 * - Validator delinquency rate > 10%
 * - SOL price move > 10% in 24h
 * - TVL change > 5% in 24h
 */
import type { NetworkSnapshot } from "./connectors/solana-rpc-connector.js";

export type AnomalySeverity = "critical" | "high" | "medium" | "low";

export interface Anomaly {
  severity: AnomalySeverity;
  metric: string;
  value: number;
  expected: number;
  description: string;
  timestamp: string;
}

interface SnapshotHistory {
  tps: number[];
  slotTimeMs: number[];
  solPrice: number;
  solPricePrev: number;
  tvl: number;
  tvlPrev: number;
}

// In-memory history (cleared on restart)
const history: SnapshotHistory = {
  tps: [],
  slotTimeMs: [],
  solPrice: 0,
  solPricePrev: 0,
  tvl: 0,
  tvlPrev: 0,
};

const ROLLING_WINDOW = 7;

/**
 * Run anomaly detection on current network data
 */
export function detectAnomalies(
  snapshot: NetworkSnapshot,
  marketData?: {
    solPrice?: number;
    solChange24h?: number;
    tvl?: number;
    tvlChange24h?: number;
  },
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const now = new Date().toISOString();

  // Update history
  if (snapshot.tps !== null) {
    history.tps.push(snapshot.tps);
    if (history.tps.length > ROLLING_WINDOW * 2) {
      history.tps.shift();
    }
  }
  if (snapshot.slotTimeMs !== null) {
    history.slotTimeMs.push(snapshot.slotTimeMs);
    if (history.slotTimeMs.length > ROLLING_WINDOW * 2) {
      history.slotTimeMs.shift();
    }
  }
  if (marketData?.solPrice) {
    if (history.solPrice > 0) {
      history.solPricePrev = history.solPrice;
    }
    history.solPrice = marketData.solPrice;
  }
  if (marketData?.tvl) {
    if (history.tvl > 0) {
      history.tvlPrev = history.tvl;
    }
    history.tvl = marketData.tvl;
  }

  // Rule 1: TPS drop > 30% from rolling average
  if (snapshot.tps !== null && history.tps.length >= ROLLING_WINDOW) {
    const avg = average(history.tps.slice(0, ROLLING_WINDOW));
    if (avg > 0) {
      const change = (snapshot.tps - avg) / avg;
      if (change < -0.3) {
        anomalies.push({
          severity: "high",
          metric: "tps",
          value: snapshot.tps,
          expected: Math.round(avg),
          description: `TPS dropped ${Math.abs(Math.round(change * 100))}% below rolling average`,
          timestamp: now,
        });
      } else if (change > 0.5) {
        anomalies.push({
          severity: "medium",
          metric: "tps",
          value: snapshot.tps,
          expected: Math.round(avg),
          description: `TPS spiked ${Math.round(change * 100)}% above rolling average`,
          timestamp: now,
        });
      }
    }
  }

  // Rule 2: Slot time > 600ms
  if (snapshot.slotTimeMs !== null && snapshot.slotTimeMs > 600) {
    anomalies.push({
      severity: "high",
      metric: "slotTime",
      value: snapshot.slotTimeMs,
      expected: 400,
      description: `Slot time ${snapshot.slotTimeMs}ms exceeds 600ms threshold (expected ~400ms)`,
      timestamp: now,
    });
  }

  // Rule 3: Validator delinquency rate > 10%
  if (snapshot.validators) {
    if (snapshot.validators.delinquencyRate > 10) {
      anomalies.push({
        severity: "critical",
        metric: "delinquency",
        value: snapshot.validators.delinquencyRate,
        expected: 5,
        description: `Validator delinquency rate ${snapshot.validators.delinquencyRate.toFixed(1)}% exceeds 10% threshold`,
        timestamp: now,
      });
    } else if (snapshot.validators.delinquencyRate > 5) {
      anomalies.push({
        severity: "medium",
        metric: "delinquency",
        value: snapshot.validators.delinquencyRate,
        expected: 5,
        description: `Validator delinquency rate ${snapshot.validators.delinquencyRate.toFixed(1)}% above normal range`,
        timestamp: now,
      });
    }
  }

  // Rule 4: SOL price move > 10% in 24h
  if (marketData?.solChange24h !== undefined) {
    const change = Math.abs(marketData.solChange24h);
    if (change > 10) {
      anomalies.push({
        severity: "high",
        metric: "solPrice",
        value: marketData.solChange24h,
        expected: 0,
        description: `SOL price moved ${marketData.solChange24h > 0 ? "+" : ""}${marketData.solChange24h.toFixed(1)}% in 24h`,
        timestamp: now,
      });
    }
  }

  // Rule 5: TVL change > 5% in 24h
  if (marketData?.tvlChange24h !== undefined) {
    const change = Math.abs(marketData.tvlChange24h);
    if (change > 5) {
      anomalies.push({
        severity: "medium",
        metric: "tvl",
        value: marketData.tvlChange24h,
        expected: 0,
        description: `TVL changed ${marketData.tvlChange24h > 0 ? "+" : ""}${marketData.tvlChange24h.toFixed(1)}% in 24h`,
        timestamp: now,
      });
    }
  }

  return anomalies;
}

/**
 * Get severity counts for summary
 */
export function summarizeAnomalies(
  anomalies: Anomaly[],
): Record<AnomalySeverity, number> {
  return {
    critical: anomalies.filter((a) => a.severity === "critical").length,
    high: anomalies.filter((a) => a.severity === "high").length,
    medium: anomalies.filter((a) => a.severity === "medium").length,
    low: anomalies.filter((a) => a.severity === "low").length,
  };
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}
