/**
 * ════════════════════════════════════════════════════════════════════════════
 * CATEGORY DATA CONTRACTS — Expected capabilities per category
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Defines what data dimensions we EXPECT to have for each category.
 * This drives capability-based completeness scoring.
 *
 * CRITICAL RULES:
 * - Expected capabilities must be verifiable from real data sources
 * - Not all projects are expected to have the same capabilities
 * - Multi-category projects use the union of expected capabilities
 * - Unsupported capability = "not_applicable" (not counted as missing)
 * - A capability is "available" if ANY registered source provides it
 * - A capability is "missing" if no registered source provides it
 * - A capability is "not_applicable" if the project's categories don't expect it
 *
 * This is NOT a UI label — it's a domain contract that drives completeness.
 * ════════════════════════════════════════════════════════════════════════════
 */
import type { EcosystemCategory } from "./ecosystem-types.js";

// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITY STATE — per capability, per project
// ─────────────────────────────────────────────────────────────────────────────

/**
 * State of a single capability for a single project.
 *
 * - "available": at least one registered source provides this capability
 * - "missing": expected for this category but no source provides it
 * - "not_applicable": not expected for this project's categories
 */
export type CapabilityState = "available" | "missing" | "not_applicable";

// ─────────────────────────────────────────────────────────────────────────────
// EXPECTED CAPABILITIES PER CATEGORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Expected capabilities per category.
 *
 * Only capabilities that can be verified from real data sources are listed.
 * Each category has a different set — a lending protocol is NOT expected
 * to have NFT floor price data.
 *
 * Capabilities are derived from what the existing connectors actually provide.
 */
export const CATEGORY_EXPECTED_CAPABILITIES: Record<EcosystemCategory, string[]> = {
  // ── DeFi ──
  dex: ["tvl", "volume", "fees", "historical"],
  dex_aggregator: ["volume", "routing", "price"],
  lending: ["tvl", "historical"],
  derivatives: ["tvl", "volume", "fees", "historical"],
  perpetuals: ["tvl", "volume", "fees", "historical"],
  options: ["tvl", "volume", "historical"],
  stablecoins: ["tvl", "market_cap", "historical"],
  yield: ["tvl", "volume", "historical"],
  liquid_staking: ["tvl", "historical"],
  restaking: ["tvl", "historical"],
  defi: ["tvl", "volume", "historical"],

  // ── NFT ──
  nft: ["collections", "sales", "floor_price"],
  nft_marketplace: ["collections", "listings", "sales", "floor_price"],
  nft_aggregator: ["collections", "listings", "floor_price"],
  nft_infrastructure: [],

  // ── Oracle ──
  oracle: ["price_feeds", "historical"],

  // ── RWA ──
  rwa: ["tvl", "historical"],

  // ── Payments ──
  payments: [],

  // ── Wallets ──
  wallet: [],

  // ── Bridges ──
  bridge: ["tvl", "volume", "historical"],

  // ── Infrastructure ──
  infrastructure: [],
  rpc: [],
  indexer: [],
  data_provider: ["price", "volume", "trending"],
  validator: ["tvl", "historical"],

  // ── Developer Tools ──
  developer_tools: [],

  // ── Security ──
  security: [],

  // ── Launchpads ──
  launchpad: ["volume", "historical"],

  // ── Gaming ──
  gaming: ["tvl", "historical"],

  // ── DePIN ──
  depin: ["tvl", "historical"],

  // ── AI ──
  ai: ["tvl", "historical"],

  // ── Social ──
  social: ["tvl", "historical"],

  // ── Governance ──
  governance: [],
  dao: [],

  // ── Meme ──
  meme: ["price", "volume", "market_cap"],

  // ── Privacy ──
  privacy: ["tvl", "historical"],

  // ── Identity ──
  identity: [],
  names: [],

  // ── Cross-cutting ──
  insurance: ["tvl", "historical"],
  prediction_market: ["volume", "historical"],
  fund: ["tvl", "historical"],
  other: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Get expected capabilities for a project (union of all its categories)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the union of expected capabilities across all of a project's categories.
 * Multi-category projects (e.g. dex + defi) get the union of both sets.
 */
export function expectedCapabilitiesForProject(categories: EcosystemCategory[]): string[] {
  const caps = new Set<string>();
  for (const cat of categories) {
    const expected = CATEGORY_EXPECTED_CAPABILITIES[cat] ?? [];
    for (const c of expected) caps.add(c);
  }
  return Array.from(caps);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Capability state map for a project
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a capability state map for a project.
 *
 * For each expected capability (from the project's categories):
 * - "available" if any registered source provides it
 * - "missing" if no registered source provides it
 *
 * Capabilities not in the expected set are "not_applicable".
 *
 * @param projectCategories - the project's category array
 * @param projectSourceCapabilities - capabilities from all the project's registered data sources
 * @returns map of capability → state
 */
export function buildCapabilityMap(
  projectCategories: EcosystemCategory[],
  projectSourceCapabilities: string[],
): Map<string, CapabilityState> {
  const expected = expectedCapabilitiesForProject(projectCategories);
  const available = new Set(projectSourceCapabilities);
  const map = new Map<string, CapabilityState>();

  for (const cap of expected) {
    map.set(cap, available.has(cap) ? "available" : "missing");
  }

  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Category-aware completeness score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate capability-based completeness for a project.
 *
 * Completeness = available expected capabilities / total expected capabilities.
 * NOT counting not_applicable capabilities as missing.
 *
 * Returns 0 if the project has no expected capabilities (e.g. developer_tools).
 * Returns 0-1 for projects with expected capabilities.
 */
export function capabilityCompleteness(
  projectCategories: EcosystemCategory[],
  projectSourceCapabilities: string[],
): number {
  const expected = expectedCapabilitiesForProject(projectCategories);
  if (expected.length === 0) return 0; // no expected caps = completeness not measurable

  const available = new Set(projectSourceCapabilities);
  const matched = expected.filter((c) => available.has(c)).length;
  return matched / expected.length;
}

/**
 * Get per-category capability breakdown for coverage reporting.
 */
export interface CategoryCapabilityBreakdown {
  category: EcosystemCategory;
  expectedCapabilities: string[];
  availableCapabilities: string[];
  missingCapabilities: string[];
  completeness: number; // available / expected, 0 if no expected
}

/**
 * Build capability breakdown for a single category.
 *
 * @param category - the category
 * @param allProjectSourceCapabilities - map of projectId → capabilities from registered sources
 */
export function categoryCapabilityBreakdown(
  category: EcosystemCategory,
  projectsInCategory: string[],
  sourceCapabilitiesByProject: Map<string, string[]>,
): CategoryCapabilityBreakdown {
  const expected = CATEGORY_EXPECTED_CAPABILITIES[category] ?? [];
  if (expected.length === 0) {
    return {
      category,
      expectedCapabilities: [],
      availableCapabilities: [],
      missingCapabilities: [],
      completeness: 0,
    };
  }

  const available = new Set<string>();
  for (const pid of projectsInCategory) {
    const caps = sourceCapabilitiesByProject.get(pid) ?? [];
    for (const c of caps) available.add(c);
  }

  const missing = expected.filter((c) => !available.has(c));

  return {
    category,
    expectedCapabilities: expected,
    availableCapabilities: Array.from(available).filter((c) => expected.includes(c)),
    missingCapabilities: missing,
    completeness: (expected.length - missing.length) / expected.length,
  };
}
