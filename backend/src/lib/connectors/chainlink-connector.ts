/**
 * Chainlink Connector — Chainlink price feeds on Solana
 *
 * Capabilities: price_feeds
 *
 * Chainlink on Solana uses a Feed Registry pattern. The actual price feed
 * data is accessed via on-chain program reads, not a REST API.
 *
 * Without an RPC endpoint and program address, this connector reports
 * "unavailable" and returns null — we do not fabricate oracle data.
 *
 * Source IDs: chainlink-solana → chainlink
 */
import { BaseConnector } from "../source-registry.js";
import type { SourceHealthCheck } from "../ecosystem-types.js";

// Chainlink Price Feeds program on Solana
const CHAINLINK_PROGRAM_ID = "CLvTyMJR3w7uJYodNfsyzSJNyfL1E8u7vymxHn6TjKp";

export class ChainlinkConnector extends BaseConnector {
  readonly sourceId = "chainlink";
  readonly provider = "Chainlink";
  readonly type = "oracle" as const;
  readonly capabilities = ["price_feeds"];
  readonly endpoint = undefined;
  readonly auth = "unknown" as const;
  protected timeoutMs = 10000;

  protected async fetchCapability(capability: string): Promise<unknown> {
    // Chainlink on Solana does not have a public REST API for price feeds.
    // Price feed data is only available via on-chain program reads.
    // Without a Solana RPC connection configured for this purpose,
    // we cannot fetch real data. Return null — do not fabricate.
    if (capability === "price_feeds") return null;
    return null;
  }

  async checkHealth(): Promise<SourceHealthCheck> {
    const start = Date.now();
    // Chainlink on Solana doesn't have a public REST endpoint to ping.
    // The program exists at CHAINLINK_PROGRAM_ID but we can't verify
    // it without an RPC call. Mark as "unknown" — not "unavailable" —
    // because the source exists but we can't verify it via REST.
    return {
      sourceId: this.sourceId,
      status: "unknown",
      checkedAt: new Date().toISOString(),
      responseTimeMs: Date.now() - start,
      error: "no REST API available — on-chain program only",
    };
  }
}
