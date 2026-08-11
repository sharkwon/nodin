/**
 * Helius Connector — Solana RPC, DAS indexer, enhanced transactions
 *
 * Capabilities: rpc, das, webhooks, parsed_transactions, names
 *
 * Note: Helius API requires an API key. Without a key, the connector
 * will report "unavailable" health status and return null for fetches.
 * This is intentional — we do not fabricate data.
 *
 * Source IDs that resolve to this connector:
 *   helius-api → helius
 *   helius-rpc → helius
 */
import { BaseConnector } from "../source-registry.js";
import type { SourceHealthCheck } from "../ecosystem-types.js";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY ?? "";
const HELIUS_RPC_URL = HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : "";
const HELIUS_API_URL = HELIUS_API_KEY
  ? `https://api.helius.dev/v0`
  : "";

export class HeliusConnector extends BaseConnector {
  readonly sourceId = "helius";
  readonly provider = "Helius";
  readonly type = "rpc" as const;
  readonly capabilities = ["rpc", "das", "webhooks", "parsed_transactions", "names"];
  readonly endpoint = HELIUS_RPC_URL || "https://mainnet.helius-rpc.com";
  readonly auth = "api_key" as const;
  protected timeoutMs = 10000;

  protected async fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown> {
    if (!HELIUS_API_KEY) return null;

    switch (capability) {
      case "rpc":
        return this.getHealth();
      case "das":
        if (params?.mintAddress) return this.getDASAsset(params.mintAddress);
        return null;
      case "parsed_transactions":
        if (params?.address) return this.getParsedTransactions(params.address);
        return null;
      case "names":
        if (params?.address) return this.resolveDomain(params.address);
        return null;
      default:
        return null;
    }
  }

  private async getHealth(): Promise<{ slot: number } | null> {
    if (!HELIUS_RPC_URL) return null;
    const body = { jsonrpc: "2.0", id: 1, method: "getSlot" };
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
      const res = await fetch(HELIUS_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) return null;
      const data = await res.json() as { result?: { context: { slot: number } } };
      return { slot: data.result?.context?.slot ?? 0 };
    } catch {
      return null;
    }
  }

  private async getDASAsset(mintAddress: string): Promise<unknown> {
    if (!HELIUS_RPC_URL) return null;
    const body = { jsonrpc: "2.0", id: 1, method: "getAsset", params: { id: mintAddress } };
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
      const res = await fetch(HELIUS_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) return null;
      const data = await res.json() as { result?: unknown };
      return data.result ?? null;
    } catch {
      return null;
    }
  }

  private async getParsedTransactions(address: string): Promise<unknown> {
    if (!HELIUS_API_URL) return null;
    const url = `${HELIUS_API_URL}/addresses/${address}/transactions`;
    return this.fetchJson<unknown[]>(url, []);
  }

  private async resolveDomain(address: string): Promise<string | null> {
    if (!HELIUS_API_URL) return null;
    const url = `${HELIUS_API_URL}/names/primary?address=${address}`;
    const data = await this.fetchJson<{ domains?: string[] }>(url, { domains: [] });
    return data.domains?.[0] ?? null;
  }

  async checkHealth(): Promise<SourceHealthCheck> {
    const start = Date.now();
    if (!HELIUS_API_KEY) {
      return {
        sourceId: this.sourceId,
        status: "unavailable",
        checkedAt: new Date().toISOString(),
        responseTimeMs: 0,
        error: "no API key configured",
      };
    }
    try {
      const result = await this.getHealth();
      if (result) {
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
        error: "RPC call failed",
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
