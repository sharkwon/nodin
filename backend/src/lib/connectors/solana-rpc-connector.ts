/**
 * Solana RPC Connector — network infrastructure data
 *
 * Capabilities: rpc, slot, epoch, tps, validators, supply, performance, health
 *
 * Uses Helius RPC (with API key) as primary, falls back to public RPC.
 * Provides: slot, block height, epoch info, performance samples,
 * vote accounts (validator status), supply, health.
 *
 * Source IDs: solana-rpc → solana-rpc
 * Also resolves quicknode-rpc and triton-rpc if those connectors are not
 * separately registered.
 */
import { BaseConnector } from "../source-registry.js";
import type { SourceHealthCheck } from "../ecosystem-types.js";

// Helius RPC endpoint (with API key from env)
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "";
const HELIUS_RPC = HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : "";

// Public Solana RPC fallback
const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

// Active endpoint (try Helius first, fall back to public)
const RPC_ENDPOINT = HELIUS_RPC || PUBLIC_RPC;
const RPC_PROVIDER = HELIUS_RPC ? "Helius RPC" : "Solana Public RPC";

interface RpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

interface VoteAccount {
  activatedStake: number;
  commission: number;
  votePubkey: string;
  nodePubkey: string;
  epochVoteAccount: boolean;
  lastVote: number;
  rootSlot: number;
}

interface GetVoteAccountsResult {
  current: VoteAccount[];
  delinquent: VoteAccount[];
}

interface PerformanceSample {
  slot: number;
  numSlots: number;
  samplePeriodSecs: number;
  numTransactions: number;
}

interface EpochInfo {
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  absoluteSlot: number;
  blockHeight: number;
  transactionCount?: number;
}

interface SupplyInfo {
  total: number;
  circulating: number;
  nonCirculating: number;
}

export interface NetworkSnapshot {
  slot: number | null;
  blockHeight: number | null;
  epoch: EpochInfo | null;
  tps: number | null;
  slotTimeMs: number | null;
  health: "ok" | "degraded" | "down";
  supply: SupplyInfo | null;
  validators: {
    active: number;
    delinquent: number;
    totalStake: number;
    delinquencyRate: number;
    topByStake: Array<{
      votePubkey: string;
      nodePubkey: string;
      activatedStake: number;
      commission: number;
      lastVote: number;
      rootSlot: number;
    }>;
  } | null;
  timestamp: string;
  source: string;
}

export class SolanaRpcConnector extends BaseConnector {
  readonly sourceId = "solana-rpc";
  readonly provider = RPC_PROVIDER;
  readonly type = "rpc" as const;
  readonly capabilities = [
    "rpc",
    "slot",
    "epoch",
    "tps",
    "validators",
    "supply",
    "performance",
    "health",
  ];
  readonly endpoint = RPC_ENDPOINT;
  readonly auth = HELIUS_API_KEY ? ("api_key" as const) : ("none" as const);
  protected timeoutMs = 15000;

  /**
   * Fetch a full network snapshot — all RPC data in parallel
   */
  async fetchNetworkSnapshot(): Promise<NetworkSnapshot> {
    const timestamp = new Date().toISOString();

    const [health, slot, epochInfo, perfSamples, voteAccounts, supply] =
      await Promise.all([
        this.rpcCall<string>("getHealth"),
        this.rpcCall<number>("getSlot"),
        this.rpcCall<EpochInfo>("getEpochInfo"),
        this.rpcCall<PerformanceSample[]>("getRecentPerformanceSamples", [20]),
        this.rpcCall<GetVoteAccountsResult>("getVoteAccounts"),
        this.rpcCall<{ context: { slot: number }; value: SupplyInfo }>(
          "getSupply",
          [{ excludeNonCirculatingAccountsList: true }],
        ),
      ]);

    // Calculate TPS from performance samples
    let tps: number | null = null;
    let slotTimeMs: number | null = null;

    if (perfSamples && perfSamples.length > 0) {
      // Average TPS across samples (excluding first which may be incomplete)
      const validSamples = perfSamples.filter(
        (s) => s.numSlots > 0 && s.samplePeriodSecs > 0,
      );
      if (validSamples.length > 0) {
        const avgTps =
          validSamples.reduce(
            (sum, s) => sum + s.numTransactions / s.samplePeriodSecs,
            0,
          ) / validSamples.length;
        tps = Math.round(avgTps);

        // Slot time = samplePeriodSecs / numSlots * 1000 (ms)
        const avgSlotTime =
          validSamples.reduce(
            (sum, s) => sum + s.samplePeriodSecs / s.numSlots,
            0,
          ) / validSamples.length;
        slotTimeMs = Math.round(avgSlotTime * 1000);
      }
    }

    // Parse validator data
    let validators: NetworkSnapshot["validators"] = null;
    if (voteAccounts) {
      const active = voteAccounts.current || [];
      const delinquent = voteAccounts.delinquent || [];
      const totalActive = active.length;
      const totalDelinquent = delinquent.length;
      const totalStake = active.reduce(
        (sum, v) => sum + v.activatedStake,
        0,
      );
      const delinquencyRate =
        totalActive + totalDelinquent > 0
          ? (totalDelinquent / (totalActive + totalDelinquent)) * 100
          : 0;

      // Top 10 validators by stake
      const topByStake = [...active]
        .sort((a, b) => b.activatedStake - a.activatedStake)
        .slice(0, 10)
        .map((v) => ({
          votePubkey: v.votePubkey,
          nodePubkey: v.nodePubkey,
          activatedStake: v.activatedStake,
          commission: v.commission,
          lastVote: v.lastVote,
          rootSlot: v.rootSlot,
        }));

      validators = {
        active: totalActive,
        delinquent: totalDelinquent,
        totalStake,
        delinquencyRate,
        topByStake,
      };
    }

    const healthStatus: NetworkSnapshot["health"] =
      health === "ok" ? "ok" : health === "behind" ? "degraded" : "down";

    return {
      slot: slot ?? null,
      blockHeight: epochInfo?.blockHeight ?? null,
      epoch: epochInfo ?? null,
      tps,
      slotTimeMs,
      health: healthStatus,
      supply: supply?.value ?? null,
      validators,
      timestamp,
      source: RPC_PROVIDER,
    };
  }

  protected async fetchCapability(capability: string): Promise<unknown> {
    switch (capability) {
      case "slot":
        return this.rpcCall<number>("getSlot");
      case "epoch":
        return this.rpcCall<EpochInfo>("getEpochInfo");
      case "tps": {
        const samples = await this.rpcCall<PerformanceSample[]>(
          "getRecentPerformanceSamples",
          [10],
        );
        if (!samples || samples.length === 0) return null;
        const valid = samples.filter(
          (s) => s.numSlots > 0 && s.samplePeriodSecs > 0,
        );
        if (valid.length === 0) return null;
        return Math.round(
          valid.reduce(
            (sum, s) => sum + s.numTransactions / s.samplePeriodSecs,
            0,
          ) / valid.length,
        );
      }
      case "validators": {
        const result = await this.rpcCall<GetVoteAccountsResult>(
          "getVoteAccounts",
        );
        if (!result) return null;
        return {
          active: result.current.length,
          delinquent: result.delinquent.length,
        };
      }
      case "supply":
        return this.rpcCall<{ context: { slot: number }; value: SupplyInfo }>(
          "getSupply",
        ).then((r) => r?.value ?? null);
      case "performance":
        return this.rpcCall<PerformanceSample[]>(
          "getRecentPerformanceSamples",
          [20],
        );
      case "health":
        return this.rpcCall<string>("getHealth");
      case "rpc":
        return this.rpcCall<number>("getSlot");
      default:
        return null;
    }
  }

  private async rpcCall<T>(
    method: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    const body = { jsonrpc: "2.0", id: 1, method, params };
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
      const res = await fetch(RPC_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) return null;
      const data = (await res.json()) as RpcResponse<T>;
      if (data.error) return null;
      return data.result ?? null;
    } catch {
      return null;
    }
  }

  async checkHealth(): Promise<SourceHealthCheck> {
    const start = Date.now();
    try {
      const slot = await this.rpcCall<number>("getSlot");
      if (slot !== null && slot > 0) {
        return {
          sourceId: this.sourceId,
          status: "healthy",
          checkedAt: new Date().toISOString(),
          responseTimeMs: Date.now() - start,
        };
      }
      return {
        sourceId: this.sourceId,
        status: "unavailable",
        checkedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
        error: "getSlot returned null",
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
