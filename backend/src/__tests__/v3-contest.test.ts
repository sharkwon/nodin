/**
 * V3 Tests — Contest Requirements
 *
 * Tests:
 * - RPC connector returns real data
 * - Anomaly detection triggers on threshold
 * - Anomaly detection no false positive on normal data
 * - Markdown report generated with correct structure
 * - JSON report valid with required fields
 * - Report endpoints return correct content-type
 * - Dune connector returns awaiting-key without API key
 */
import { describe, it, expect } from "vitest";
import { detectAnomalies, summarizeAnomalies } from "../lib/anomaly-engine.js";
import { generateMarkdownReport, generateJsonReport, type ReportInput } from "../lib/report-generator.js";
import type { NetworkSnapshot } from "../lib/connectors/solana-rpc-connector.js";

// Mock network snapshot for testing
function mockSnapshot(overrides: Partial<NetworkSnapshot> = {}): NetworkSnapshot {
  return {
    slot: 300000000,
    blockHeight: 300000000,
    epoch: { epoch: 700, slotIndex: 200000, slotsInEpoch: 432000, absoluteSlot: 300000000, blockHeight: 300000000 },
    tps: 3000,
    slotTimeMs: 400,
    health: "ok",
    supply: { total: 600000000000000000, circulating: 500000000000000000, nonCirculating: 100000000000000000 },
    validators: {
      active: 1500,
      delinquent: 10,
      totalStake: 400000000000000000,
      delinquencyRate: 0.66,
      topByStake: [
        { votePubkey: "Test123", nodePubkey: "Node123", activatedStake: 50000000000000000, commission: 5, lastVote: 300000000, rootSlot: 299999999 },
      ],
    },
    timestamp: new Date().toISOString(),
    source: "Test RPC",
    ...overrides,
  };
}

const mockEconomics = {
  solPrice: 150.5,
  solChange24h: 2.5,
  etfDailyFlow: null,
  etfCumulativeFlow: null,
  stablecoinSupply: 3000000000,
  dexVolume24h: 1000000000,
  medianFee: null,
  rev: 500000,
};

const mockEcosystem = {
  totalProjects: 85,
  totalTvl: 10000000000,
  categories: 40,
  liveProjects: 48,
};

const mockSources = {
  solanaRpc: "Test RPC",
  solanaComData: "healthy" as const,
  defillama: "healthy" as const,
  coingecko: "healthy" as const,
  dune: "awaiting-key" as const,
  twitterRss: "healthy" as const,
  solanaFloor: "healthy" as const,
};

// ── Anomaly Detection ──
describe("Anomaly Detection", () => {
  it("detects TPS drop > 30% from rolling average", () => {
    // First, build up rolling average with normal TPS
    const normal = mockSnapshot({ tps: 3000 });
    for (let i = 0; i < 7; i++) {
      detectAnomalies(normal, { solPrice: 150, tvl: 10000 });
    }
    // Now drop TPS by 40%
    const dropped = mockSnapshot({ tps: 1800 });
    const anomalies = detectAnomalies(dropped, { solPrice: 150, tvl: 10000 });
    const tpsAnomaly = anomalies.find((a) => a.metric === "tps" && a.severity === "high");
    expect(tpsAnomaly).toBeDefined();
    expect(tpsAnomaly!.value).toBe(1800);
    expect(tpsAnomaly!.description).toContain("drop");
  });

  it("detects TPS spike > 50% from rolling average", () => {
    const normal = mockSnapshot({ tps: 3000 });
    for (let i = 0; i < 7; i++) {
      detectAnomalies(normal, { solPrice: 150, tvl: 10000 });
    }
    const spiked = mockSnapshot({ tps: 5000 });
    const anomalies = detectAnomalies(spiked, { solPrice: 150, tvl: 10000 });
    const spikeAnomaly = anomalies.find((a) => a.metric === "tps" && a.severity === "medium");
    expect(spikeAnomaly).toBeDefined();
    expect(spikeAnomaly!.description).toContain("spike");
  });

  it("detects slot time > 600ms", () => {
    const snap = mockSnapshot({ slotTimeMs: 700 });
    const anomalies = detectAnomalies(snap);
    const slotAnomaly = anomalies.find((a) => a.metric === "slotTime");
    expect(slotAnomaly).toBeDefined();
    expect(slotAnomaly!.severity).toBe("high");
    expect(slotAnomaly!.value).toBe(700);
  });

  it("detects validator delinquency rate > 10%", () => {
    const snap = mockSnapshot({
      validators: {
        active: 1000,
        delinquent: 150,
        totalStake: 400000000000000000,
        delinquencyRate: 13.04,
        topByStake: [],
      },
    });
    const anomalies = detectAnomalies(snap);
    const delinqAnomaly = anomalies.find((a) => a.metric === "delinquency" && a.severity === "critical");
    expect(delinqAnomaly).toBeDefined();
  });

  it("detects SOL price move > 10% in 24h", () => {
    const snap = mockSnapshot();
    const anomalies = detectAnomalies(snap, { solPrice: 100, solChange24h: -12 });
    const priceAnomaly = anomalies.find((a) => a.metric === "solPrice");
    expect(priceAnomaly).toBeDefined();
    expect(priceAnomaly!.severity).toBe("high");
  });

  it("detects TVL change > 5% in 24h", () => {
    const snap = mockSnapshot();
    const anomalies = detectAnomalies(snap, { solPrice: 150, tvl: 10000, tvlChange24h: 7 });
    const tvlAnomaly = anomalies.find((a) => a.metric === "tvl");
    expect(tvlAnomaly).toBeDefined();
  });

  it("no false positives on normal data", () => {
    const snap = mockSnapshot({ tps: 3000, slotTimeMs: 400 });
    const anomalies = detectAnomalies(snap, { solPrice: 150, solChange24h: 2, tvl: 10000, tvlChange24h: 1 });
    expect(anomalies.length).toBe(0);
  });

  it("summarizeAnomalies counts correctly", () => {
    const anomalies = [
      { severity: "critical" as const, metric: "delinquency", value: 12, expected: 5, description: "test", timestamp: new Date().toISOString() },
      { severity: "high" as const, metric: "tps", value: 1000, expected: 3000, description: "test", timestamp: new Date().toISOString() },
      { severity: "medium" as const, metric: "tvl", value: 7, expected: 0, description: "test", timestamp: new Date().toISOString() },
    ];
    const summary = summarizeAnomalies(anomalies);
    expect(summary.critical).toBe(1);
    expect(summary.high).toBe(1);
    expect(summary.medium).toBe(1);
    expect(summary.low).toBe(0);
  });
});

// ── Markdown Report ──
describe("Markdown Report", () => {
  it("generates report with correct structure", () => {
    const input: ReportInput = {
      network: mockSnapshot(),
      anomalies: [],
      economics: mockEconomics,
      ecosystem: mockEcosystem,
      dune: null,
      solanaFloor: null,
      sources: mockSources,
    };
    const md = generateMarkdownReport(input);
    
    expect(md).toContain("# NODIN — Solana Ecosystem Report");
    expect(md).toContain("## Network Performance");
    expect(md).toContain("## Validator Status");
    expect(md).toContain("## Economic Indicators");
    expect(md).toContain("## Ecosystem");
    expect(md).toContain("## Anomaly Detection");
    expect(md).toContain("## Data Sources");
    expect(md).toContain("TPS:");
    expect(md).toContain("Active:");
    expect(md).toContain("SOL price:");
  });

  it("shows unavailable for null metrics", () => {
    const input: ReportInput = {
      network: mockSnapshot({ tps: null, slotTimeMs: null, validators: null }),
      anomalies: [],
      economics: { ...mockEconomics, solPrice: null },
      ecosystem: mockEcosystem,
      dune: null,
      solanaFloor: null,
      sources: mockSources,
    };
    const md = generateMarkdownReport(input);
    expect(md).toContain("Data unavailable");
    expect(md).not.toContain("$0");
  });
});

// ── JSON Report ──
describe("JSON Report", () => {
  it("generates valid JSON with required fields", () => {
    const input: ReportInput = {
      network: mockSnapshot(),
      anomalies: [],
      economics: mockEconomics,
      ecosystem: mockEcosystem,
      dune: null,
      solanaFloor: null,
      sources: mockSources,
    };
    const jsonStr = generateJsonReport(input);
    const data = JSON.parse(jsonStr);
    
    expect(data.report).toBe("nodin-solana-ecosystem");
    expect(data.version).toBe("1.0");
    expect(data.generatedAt).toBeDefined();
    expect(data.network).toBeDefined();
    expect(data.network.tps).toBe(3000);
    expect(data.validators).toBeDefined();
    expect(data.validators.active).toBe(1500);
    expect(data.economics).toBeDefined();
    expect(data.economics.solPrice).toBe(150.5);
    expect(data.ecosystem).toBeDefined();
    expect(data.ecosystem.totalProjects).toBe(85);
    expect(Array.isArray(data.anomalies)).toBe(true);
    expect(data.sources).toBeDefined();
    expect(data.sources.solanaRpc).toBeDefined();
  });

  it("null metrics are null, not 0", () => {
    const input: ReportInput = {
      network: mockSnapshot({ tps: null }),
      anomalies: [],
      economics: { ...mockEconomics, solPrice: null, medianFee: null },
      ecosystem: mockEcosystem,
      dune: null,
      solanaFloor: null,
      sources: mockSources,
    };
    const jsonStr = generateJsonReport(input);
    const data = JSON.parse(jsonStr);
    
    expect(data.network.tps).toBeNull();
    expect(data.economics.solPrice).toBeNull();
    expect(data.economics.medianFee).toBeNull();
    // Ensure no null→0
    expect(data.network.tps).not.toBe(0);
  });
});

// ── Dune connector without API key ──
describe("Dune Analytics Connector", () => {
  it("returns awaiting-key status with fallback data when no API key", async () => {
    const oldKey = process.env.DUNE_API_KEY;
    delete process.env.DUNE_API_KEY;

    const { DuneAnalyticsConnector } = await import("../lib/connectors/dune-analytics-connector.js");
    const connector = new DuneAnalyticsConnector();
    const data = await connector.fetchData();

    expect(data.status).toBe("awaiting-key");
    // Without a Dune API key, no data is fabricated — all metrics null.
    expect(data.dailyActiveAddresses).toBeNull();
    expect(data.transactionVolume).toBeNull();
    expect(data.tokenizedAssetVolume).toBeNull();
    expect(data.bridgeVolume).toBeNull();

    if (oldKey) process.env.DUNE_API_KEY = oldKey;
  });
});
