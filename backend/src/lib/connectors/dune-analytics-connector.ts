/**
 * Dune Analytics Connector — pre-built query data
 *
 * Uses Dune API v1/v2 with API key to fetch pre-built Solana queries.
 * Before API key is set: returns null, status = "awaiting-key".
 *
 * Target metrics: DAA, transaction volume, tokenized asset volumes,
 * bridge volumes, program usage.
 *
 * Source ID: dune-analytics
 */
import { BaseConnector } from "../source-registry.js";
import type { SourceHealthCheck } from "../ecosystem-types.js";

const DUNE_API_BASE = "https://api.dune.com/api/v1";

export interface DuneQueryResult {
  queryId: number;
  name: string;
  data: Record<string, unknown>[];
  fetchedAt: string;
}

export interface DuneData {
  dailyActiveAddresses: number | null;
  transactionVolume: number | null;
  tokenizedAssetVolume: number | null;
  bridgeVolume: number | null;
  programUsage: Array<{ program: string; count: number }> | null;
  timestamp: string;
  status: "healthy" | "awaiting-key" | "unavailable";
}

// Pre-built query IDs (to be configured after API key provided)
const QUERY_IDS = {
  dailyActiveAddresses: 0, // Replace with actual query ID
  transactionVolume: 0,
  tokenizedAssetVolume: 0,
  bridgeVolume: 0,
  programUsage: 0,
};

export class DuneAnalyticsConnector extends BaseConnector {
  readonly sourceId = "dune-analytics";
  readonly provider = "Dune Analytics";
  readonly type = "api" as const;
  readonly capabilities = [
    "daa",
    "transaction_volume",
    "tokenized_assets",
    "bridge_volume",
    "program_usage",
  ];
  readonly endpoint = DUNE_API_BASE;
  readonly auth = "api_key" as const;
  protected timeoutMs = 30000;

  private apiKey: string | null;
  private cache: DuneData | null = null;
  private cacheTime = 0;
  private readonly cacheTtl = 10 * 60 * 1000; // 10 min (Dune queries are slow)

  constructor() {
    super();
    this.apiKey = process.env.DUNE_API_KEY || null;
  }

  async fetchData(): Promise<DuneData> {
    if (this.cache && Date.now() - this.cacheTime < this.cacheTtl) {
      return this.cache;
    }

    const timestamp = new Date().toISOString();

    // If no API key, return awaiting-key status with solana.com/data fallback
    if (!this.apiKey) {
      // No Dune API key: report unavailable rather than fabricate values.
      // (Previously returned hardcoded monthly figures mislabeled as daily —
      // removed to avoid misleading data in reports.)
      const fallbackData: DuneData = {
        dailyActiveAddresses: null,
        transactionVolume: null,
        tokenizedAssetVolume: null,
        bridgeVolume: null,
        programUsage: null,
        timestamp,
        status: "awaiting-key",
      };
      this.cache = fallbackData;
      this.cacheTime = Date.now();
      return fallbackData;
    }

    // With API key, execute queries
    const [daa, txVol, tokenized, bridge, programs] = await Promise.all([
      this.executeQuery(QUERY_IDS.dailyActiveAddresses),
      this.executeQuery(QUERY_IDS.transactionVolume),
      this.executeQuery(QUERY_IDS.tokenizedAssetVolume),
      this.executeQuery(QUERY_IDS.bridgeVolume),
      this.executeQuery(QUERY_IDS.programUsage),
    ]);

    const data: DuneData = {
      dailyActiveAddresses: this.extractNumber(daa),
      transactionVolume: this.extractNumber(txVol),
      tokenizedAssetVolume: this.extractNumber(tokenized),
      bridgeVolume: this.extractNumber(bridge),
      programUsage: this.extractProgramUsage(programs),
      timestamp,
      status: "healthy",
    };

    this.cache = data;
    this.cacheTime = Date.now();
    return data;
  }

  private async executeQuery(
    queryId: number,
  ): Promise<Record<string, unknown>[] | null> {
    if (!this.apiKey || queryId === 0) return null;

    try {
      // Step 1: Execute query
      const execRes = await fetch(
        `${DUNE_API_BASE}/query/${queryId}/execute`,
        {
          method: "POST",
          headers: {
            "x-dune-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
        },
      );
      if (!execRes.ok) return null;
      const exec = await execRes.json();
      const executionId = (exec as any).execution_id;
      if (!executionId) return null;

      // Step 2: Poll for results (with timeout)
      const maxPolls = 10;
      for (let i = 0; i < maxPolls; i++) {
        await this.sleep(3000);
        const statusRes = await fetch(
          `${DUNE_API_BASE}/execution/${executionId}/status`,
          {
            headers: { "x-dune-api-key": this.apiKey! },
          },
        );
        if (!statusRes.ok) continue;
        const status = await statusRes.json();
        if ((status as any).state === "QUERY_STATE_COMPLETED") {
          // Fetch results
          const resultRes = await fetch(
            `${DUNE_API_BASE}/execution/${executionId}/results`,
            {
              headers: { "x-dune-api-key": this.apiKey! },
            },
          );
          if (!resultRes.ok) return null;
          const result = await resultRes.json();
          return (result as any).result?.rows || [];
        }
      }
      return null; // Timeout
    } catch {
      return null;
    }
  }

  private extractNumber(
    rows: Record<string, unknown>[] | null,
  ): number | null {
    if (!rows || rows.length === 0) return null;
    const firstRow = rows[0];
    // Try common column names
    const valueKeys = [
      "value",
      "count",
      "daa",
      "addresses",
      "volume",
      "total",
    ];
    for (const key of valueKeys) {
      if (firstRow[key] !== undefined) {
        const val = parseFloat(String(firstRow[key]));
        return isNaN(val) ? null : val;
      }
    }
    // Fallback: first numeric value
    for (const val of Object.values(firstRow)) {
      const n = parseFloat(String(val));
      if (!isNaN(n)) return n;
    }
    return null;
  }

  private extractProgramUsage(
    rows: Record<string, unknown>[] | null,
  ): Array<{ program: string; count: number }> | null {
    if (!rows || rows.length === 0) return null;
    return rows.slice(0, 10).map((row) => {
      const program = String(row.program || row.name || row.address || "unknown");
      const count = parseFloat(String(row.count || row.tx_count || row.value || 0));
      return { program, count: isNaN(count) ? 0 : count };
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async fetchCapability(
    capability: string,
  ): Promise<unknown> {
    const data = await this.fetchData();
    switch (capability) {
      case "daa":
        return data.dailyActiveAddresses;
      case "transaction_volume":
        return data.transactionVolume;
      case "tokenized_assets":
        return data.tokenizedAssetVolume;
      case "bridge_volume":
        return data.bridgeVolume;
      case "program_usage":
        return data.programUsage;
      default:
        return null;
    }
  }

  async checkHealth(): Promise<SourceHealthCheck> {
    const start = Date.now();
    if (!this.apiKey) {
      return {
        sourceId: this.sourceId,
        status: "unavailable",
        checkedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
        error: "awaiting API key",
      };
    }
    try {
      // Simple health check: try to fetch account info
      const res = await fetch(`${DUNE_API_BASE}/me`, {
        headers: { "x-dune-api-key": this.apiKey },
      });
      return {
        sourceId: this.sourceId,
        status: res.ok ? "healthy" : "unavailable",
        checkedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
      };
    } catch {
      return {
        sourceId: this.sourceId,
        status: "unavailable",
        checkedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
        error: "health check failed",
      };
    }
  }
}
