/**
 * Direct Solana RPC client (no API key). Uses JSON-RPC over HTTPS.
 * Replace SOLANA_RPC_URL to use a dedicated provider for higher rate limits.
 */
import { env } from "../config/env.js";

const RPC_URL = env.SOLANA_RPC_URL;

let id = 0;
async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method} failed: ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
  return json.result as T;
}

export const solanaRpc = {
  getHealth: () => rpc<string>("getHealth"),
  getSlot: () => rpc<number>("getSlot"),
  getEpochInfo: () =>
    rpc<{
      epoch: number;
      slotIndex: number;
      slotsInEpoch: number;
      absoluteSlot: number;
      blockHeight: number;
      transactionCount: number;
    }>("getEpochInfo"),
  getRecentPerformanceSamples: (limit = 1) =>
    rpc<
      { slot: number; numTransactions: number; samplePeriodSecs: number; numNonVoteTransaction?: number }[]
    >("getRecentPerformanceSamples", [limit]),
  getRecentPrioritizationFees: (addresses: string[] = []) =>
    rpc<{ slot: number; prioritizationFee: number }[]>("getRecentPrioritizationFees", [
      addresses,
    ]),
  getVoteAccounts: () =>
    rpc<{
      current: { votePubkey: string; activatedStake: number; commission: number; rootSlot: number; nodePubkey: string }[];
      delinquent: { votePubkey: string; activatedStake: number; commission: number; rootSlot: number; nodePubkey: string }[];
    }>("getVoteAccounts"),
  getSupply: () =>
    rpc<{
      value: {
        total: number;
        circulating: number;
        nonCirculating: number;
        nonCirculatingAccounts: string[];
      };
    }>("getSupply").then((r) => r.value),
  getBalance: (pubkey: string) =>
    rpc<number>("getBalance", [pubkey]),
};