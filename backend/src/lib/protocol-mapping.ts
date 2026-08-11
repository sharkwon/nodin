/**
 * ════════════════════════════════════════════════════════════════════════════
 * PROTOCOL INTELLIGENCE BRIDGE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Deterministic, auditable mapping between DeFiLlama protocol slugs
 * and canonical ecosystem project IDs.
 *
 * Rules:
 * - Only verified, manually-curated mappings exist here.
 * - No fuzzy matching at runtime — if a mapping isn't in the table, it's unmapped.
 * - A project may map to multiple DeFiLlama slugs (e.g. Jupiter has multiple).
 * - Each mapping carries a confidence score and match method.
 * - Metrics are fetched live from DeFiLlama on demand, not stored statically.
 *
 * Data integrity:
 * - If a metric is not available from the API, value = null (never 0).
 * - Every metric carries provenance: source, fetchedAt, sourceUpdatedAt.
 * - Status follows DataState semantics: available | unavailable | stale.
 * ════════════════════════════════════════════════════════════════════════════
 */
import { solanaMarketData } from "./publicData.js";
import type { ProtocolDetail } from "./publicData.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. VERIFIED PROTOCOL → PROJECT MAPPING TABLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A verified mapping between a DeFiLlama protocol slug and an ecosystem project ID.
 * Each entry was manually verified to connect the correct entities.
 */
export interface ProtocolMapping {
  /** DeFiLlama protocol slug */
  defiLlamaSlug: string;
  /** Canonical ecosystem project ID from ecosystem-registry.ts */
  projectId: string;
  /** How this mapping was verified */
  matchMethod: "exact_slug" | "name_verified" | "manual_verified";
  /** Confidence score (1.0 = fully verified) */
  confidence: number;
  /** Whether this is the primary mapping for the project */
  isPrimary: boolean;
}

/**
 * The canonical, verified mapping table.
 *
 * This was built by:
 * 1. Fetching all DeFiLlama protocols that include Solana
 * 2. Cross-referencing names/slugs with ecosystem-registry project IDs
 * 3. Manually verifying each match against known protocol identities
 *
 * Projects NOT in this table have no DeFiLlama intelligence data.
 * This is intentional — not a bug. Some ecosystem projects (wallets,
 * RPC providers, security firms, etc.) don't have DeFiLlama TVL data.
 */
export const PROTOCOL_MAPPINGS: ProtocolMapping[] = [
  // DEX — spot & aggregator
  { defiLlamaSlug: "raydium-amm", projectId: "raydium", matchMethod: "name_verified", confidence: 0.98, isPrimary: true },
  { defiLlamaSlug: "orca-dex", projectId: "orca", matchMethod: "name_verified", confidence: 0.98, isPrimary: true },
  { defiLlamaSlug: "meteora-dlmm", projectId: "meteora", matchMethod: "name_verified", confidence: 0.98, isPrimary: true },
  { defiLlamaSlug: "phoenix-spot", projectId: "phoenix", matchMethod: "name_verified", confidence: 0.95, isPrimary: true },
  { defiLlamaSlug: "cropper-amm", projectId: "cropper", matchMethod: "name_verified", confidence: 0.95, isPrimary: true },
  { defiLlamaSlug: "lifinity-v1", projectId: "lifinity", matchMethod: "name_verified", confidence: 0.95, isPrimary: true },
  { defiLlamaSlug: "saber", projectId: "saber", matchMethod: "exact_slug", confidence: 1.0, isPrimary: true },
  { defiLlamaSlug: "cykura", projectId: "cykura", matchMethod: "exact_slug", confidence: 1.0, isPrimary: true },
  { defiLlamaSlug: "saros-dlmm", projectId: "saros", matchMethod: "name_verified", confidence: 0.95, isPrimary: true },
  // Jupiter — multiple DeFiLlama entries, primary is the lending/DEX
  { defiLlamaSlug: "jupiter-lend", projectId: "jupiter", matchMethod: "name_verified", confidence: 0.95, isPrimary: true },
  { defiLlamaSlug: "jupiter-perpetual-exchange", projectId: "jupiter", matchMethod: "name_verified", confidence: 0.95, isPrimary: false },
  { defiLlamaSlug: "jupiter-staked-sol", projectId: "jupiter", matchMethod: "name_verified", confidence: 0.90, isPrimary: false },

  // Lending
  { defiLlamaSlug: "kamino-lend", projectId: "kamino", matchMethod: "name_verified", confidence: 0.98, isPrimary: true },
  { defiLlamaSlug: "marginfi-lending", projectId: "marginfi", matchMethod: "name_verified", confidence: 0.98, isPrimary: true },
  // Solend was rebranded to Kamino — no separate DeFiLlama entry for old Solend
  // Frakt, Banx, Sharky — verified exact slug matches
  { defiLlamaSlug: "frakt", projectId: "frakt", matchMethod: "exact_slug", confidence: 1.0, isPrimary: true },
  { defiLlamaSlug: "banx", projectId: "banx", matchMethod: "exact_slug", confidence: 1.0, isPrimary: true },
  { defiLlamaSlug: "sharky", projectId: "sharky", matchMethod: "exact_slug", confidence: 1.0, isPrimary: true },

  // Perps / Derivatives / Options
  { defiLlamaSlug: "drift-trade", projectId: "drift", matchMethod: "name_verified", confidence: 0.95, isPrimary: true },
  { defiLlamaSlug: "drift-staked-sol", projectId: "drift", matchMethod: "name_verified", confidence: 0.90, isPrimary: false },
  { defiLlamaSlug: "zeta", projectId: "zeta", matchMethod: "exact_slug", confidence: 1.0, isPrimary: true },
  { defiLlamaSlug: "psyoptions", projectId: "psyoptions", matchMethod: "exact_slug", confidence: 1.0, isPrimary: true },

  // Yield / Vaults
  { defiLlamaSlug: "tulip-protocol", projectId: "tulip", matchMethod: "name_verified", confidence: 0.98, isPrimary: true },
  { defiLlamaSlug: "francium", projectId: "francium", matchMethod: "exact_slug", confidence: 1.0, isPrimary: true },

  // Liquid Staking
  { defiLlamaSlug: "jito-liquid-staking", projectId: "jito", matchMethod: "name_verified", confidence: 0.98, isPrimary: true },
  { defiLlamaSlug: "jito-restaking", projectId: "jito", matchMethod: "name_verified", confidence: 0.90, isPrimary: false },
  { defiLlamaSlug: "marinade-native", projectId: "marinade", matchMethod: "name_verified", confidence: 0.95, isPrimary: true },
  { defiLlamaSlug: "marinade-liquid-staking", projectId: "marinade", matchMethod: "name_verified", confidence: 0.90, isPrimary: false },
  { defiLlamaSlug: "blazestake", projectId: "blazestake", matchMethod: "exact_slug", confidence: 1.0, isPrimary: true },
  { defiLlamaSlug: "sanctum-validator-lsts", projectId: "sanctum", matchMethod: "name_verified", confidence: 0.95, isPrimary: true },
  { defiLlamaSlug: "sanctum-infinity", projectId: "sanctum", matchMethod: "name_verified", confidence: 0.90, isPrimary: false },

  // Oracle
  { defiLlamaSlug: "pyth-network", projectId: "pyth", matchMethod: "name_verified", confidence: 0.98, isPrimary: true },

  // NFT Marketplace
  { defiLlamaSlug: "magic-eden", projectId: "magic-eden", matchMethod: "exact_slug", confidence: 1.0, isPrimary: true },
  { defiLlamaSlug: "tensor", projectId: "tensor", matchMethod: "exact_slug", confidence: 1.0, isPrimary: true },

  // Bridges
  { defiLlamaSlug: "portal", projectId: "wormhole", matchMethod: "manual_verified", confidence: 0.95, isPrimary: true },

  // Launchpads
  { defiLlamaSlug: "pumpswap", projectId: "pump-fun", matchMethod: "manual_verified", confidence: 0.85, isPrimary: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOOKUP FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Reverse index: projectId → array of ProtocolMappings */
const _projectToMappings = new Map<string, ProtocolMapping[]>();
for (const m of PROTOCOL_MAPPINGS) {
  const list = _projectToMappings.get(m.projectId) ?? [];
  list.push(m);
  _projectToMappings.set(m.projectId, list);
}

/** Reverse index: defiLlamaSlug → ProtocolMapping */
const _slugToMapping = new Map<string, ProtocolMapping>();
for (const m of PROTOCOL_MAPPINGS) {
  if (!_slugToMapping.has(m.defiLlamaSlug)) {
    _slugToMapping.set(m.defiLlamaSlug, m);
  }
}

/**
 * Get all DeFiLlama slugs mapped to a project.
 * Returns empty array if the project has no verified mapping.
 */
export function slugsForProject(projectId: string): string[] {
  return (_projectToMappings.get(projectId) ?? [])
    .filter((m) => m.isPrimary)
    .map((m) => m.defiLlamaSlug);
}

/**
 * Get the primary DeFiLlama slug for a project.
 * Returns null if no mapping exists.
 */
export function primarySlugForProject(projectId: string): string | null {
  const mappings = _projectToMappings.get(projectId);
  if (!mappings || mappings.length === 0) return null;
  return (mappings.find((m) => m.isPrimary) ?? mappings[0]).defiLlamaSlug;
}

/**
 * Get the ecosystem project ID for a DeFiLlama slug.
 * Returns null if the slug is not mapped to any project.
 */
export function projectIdForSlug(defiLlamaSlug: string): string | null {
  return _slugToMapping.get(defiLlamaSlug)?.projectId ?? null;
}

/**
 * Get the mapping metadata for a project + slug pair.
 */
export function getMapping(projectId: string, defiLlamaSlug: string): ProtocolMapping | null {
  const mappings = _projectToMappings.get(projectId);
  if (!mappings) return null;
  return mappings.find((m) => m.defiLlamaSlug === defiLlamaSlug) ?? null;
}

/**
 * Get all mapped project IDs (for testing and verification).
 */
export function allMappedProjectIds(): string[] {
  return Array.from(_projectToMappings.keys());
}

/**
 * Get all mapped DeFiLlama slugs (for testing and verification).
 */
export function allMappedSlugs(): string[] {
  return Array.from(_slugToMapping.keys());
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. INTELLIGENCE METRICS — fetched live from DeFiLlama
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single intelligence metric with full provenance.
 * value is T | null — null means unavailable, NEVER inferred as 0.
 */
export interface IntelligenceMetric<T = number> {
  /** The metric value, or null if unavailable */
  value: T | null;
  /** Data state for frontend rendering */
  status: "available" | "unavailable" | "stale";
  /** Source label for attribution */
  source: string;
  /** Source URL */
  sourceUrl: string;
  /** When this was fetched (ISO) */
  fetchedAt: string;
  /** DeFiLlama protocol slug this came from */
  slug: string;
  /** Whether this is the primary protocol for the project */
  isPrimary: boolean;
}

/**
 * Aggregated intelligence for a project.
 * Each metric is independent — some may be available while others are not.
 */
export interface ProjectIntelligence {
  projectId: string;
  /** DeFiLlama slug used for this intelligence */
  defiLlamaSlug: string | null;
  /** Whether a verified mapping exists */
  isMapped: boolean;
  /** TVL on Solana (USD) */
  tvl: IntelligenceMetric<number>;
  /** Total TVL across all chains (USD) */
  totalTvl: IntelligenceMetric<number>;
  /** 24h TVL change (%) */
  change24h: IntelligenceMetric<number>;
  /** 7d TVL change (%) */
  change7d: IntelligenceMetric<number>;
  /** Market cap (USD), if available */
  marketCap: IntelligenceMetric<number>;
  /** Whether historical chart data is available */
  hasHistory: boolean;
  /** Historical TVL data points (90 days, Solana-specific) */
  history: { date: number; tvl: number }[] | null;
  /** Chains this protocol operates on */
  chains: string[] | null;
  /** Audit links if available from DeFiLlama */
  auditLinks: string[] | null;
  /** Protocol description from DeFiLlama */
  description: string | null;
  /** Mapping metadata */
  mapping: {
    matchMethod: string;
    confidence: number;
    isPrimary: boolean;
  } | null;
  /** When this intelligence was fetched */
  fetchedAt: string;
}

const DEFILLAMA_SOURCE = "DeFiLlama";
const DEFILLAMA_URL = "https://defillama.com";

/**
 * Fetch live intelligence for a project from DeFiLlama.
 *
 * Uses the existing publicData.ts solanaMarketData module which
 * already has caching, timeout, and fallback handling.
 *
 * If the project has no verified mapping, returns an unmapped result
 * with all metrics as null/unavailable — never fabricated.
 */
export async function fetchProjectIntelligence(
  projectId: string,
): Promise<ProjectIntelligence> {
  const slug = primarySlugForProject(projectId);
  const mapping = slug ? getMapping(projectId, slug) : null;
  const now = new Date().toISOString();

  // No mapping — return honest "unavailable" for everything
  if (!slug || !mapping) {
    const unmapped: IntelligenceMetric<number> = {
      value: null,
      status: "unavailable",
      source: DEFILLAMA_SOURCE,
      sourceUrl: DEFILLAMA_URL,
      fetchedAt: now,
      slug: "",
      isPrimary: false,
    };
    return {
      projectId,
      defiLlamaSlug: null,
      isMapped: false,
      tvl: unmapped,
      totalTvl: { ...unmapped },
      change24h: { ...unmapped },
      change7d: { ...unmapped },
      marketCap: { ...unmapped },
      hasHistory: false,
      history: null,
      chains: null,
      auditLinks: null,
      description: null,
      mapping: null,
      fetchedAt: now,
    };
  }

  // Fetch live protocol detail from DeFiLlama
  let detail: ProtocolDetail | null = null;
  let history: { date: number; tvl: number }[] | null = null;

  try {
    detail = await solanaMarketData.protocolDetail(slug);
  } catch {
    detail = null;
  }

  try {
    history = await solanaMarketData.protocolTvlChart(slug, 90);
  } catch {
    history = null;
  }

  // Build metrics from the fetched detail
  // Each metric is individually checked — some may be available while others are not
  const makeMetric = (
    value: number | undefined | null,
    slugVal: string = slug,
  ): IntelligenceMetric<number> => {
    // CRITICAL: null/undefined → unavailable. Never infer 0.
    if (value == null || value === undefined) {
      return {
        value: null,
        status: "unavailable",
        source: DEFILLAMA_SOURCE,
        sourceUrl: DEFILLAMA_URL,
        fetchedAt: now,
        slug: slugVal,
        isPrimary: mapping.isPrimary,
      };
    }
    return {
      value,
      status: "available",
      source: DEFILLAMA_SOURCE,
      sourceUrl: DEFILLAMA_URL,
      fetchedAt: now,
      slug: slugVal,
      isPrimary: mapping.isPrimary,
    };
  };

  // If detail fetch failed entirely, everything is unavailable
  if (!detail) {
    const failed: IntelligenceMetric<number> = {
      value: null,
      status: "unavailable",
      source: DEFILLAMA_SOURCE,
      sourceUrl: DEFILLAMA_URL,
      fetchedAt: now,
      slug,
      isPrimary: mapping.isPrimary,
    };
    return {
      projectId,
      defiLlamaSlug: slug,
      isMapped: true,
      tvl: failed,
      totalTvl: { ...failed },
      change24h: { ...failed },
      change7d: { ...failed },
      marketCap: { ...failed },
      hasHistory: history != null && history.length > 0,
      history,
      chains: null,
      auditLinks: null,
      description: null,
      mapping: {
        matchMethod: mapping.matchMethod,
        confidence: mapping.confidence,
        isPrimary: mapping.isPrimary,
      },
      fetchedAt: now,
    };
  }

  // Detail fetched successfully — extract metrics
  return {
    projectId,
    defiLlamaSlug: slug,
    isMapped: true,
    tvl: makeMetric(detail.solanaTvl > 0 ? detail.solanaTvl : (detail.totalTvl > 0 ? detail.solanaTvl : null)),
    totalTvl: makeMetric(detail.totalTvl > 0 ? detail.totalTvl : null),
    change24h: makeMetric(detail.change_1d),
    change7d: makeMetric(detail.change_7d),
    marketCap: makeMetric(detail.mcap),
    hasHistory: history != null && history.length > 1,
    history,
    chains: detail.chains?.length ? detail.chains : null,
    auditLinks: detail.audit_links?.length ? detail.audit_links : null,
    description: detail.description || null,
    mapping: {
      matchMethod: mapping.matchMethod,
      confidence: mapping.confidence,
      isPrimary: mapping.isPrimary,
    },
    fetchedAt: now,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. RELATED PROJECTS — deterministic, category-based
// ─────────────────────────────────────────────────────────────────────────────

import { CANONICAL_PROJECTS } from "./ecosystem-registry.js";
import type { EcosystemProject } from "./ecosystem-types.js";
import { childCategories } from "./ecosystem-types.js";

/**
 * Find related projects for a given project.
 *
 * Priority:
 * 1. Same leaf category (e.g. both "dex")
 * 2. Same parent category (e.g. both under "defi")
 * 3. Same broader ecosystem
 *
 * This is deterministic — no fuzzy matching, no invented relationships.
 * Results are sorted by data source count (more connected = more relevant).
 */
export function relatedProjects(
  projectId: string,
  limit = 6,
): EcosystemProject[] {
  const project = CANONICAL_PROJECTS.find((p) => p.id === projectId);
  if (!project) return [];

  const sameCategory: EcosystemProject[] = [];
  const sameParent: EcosystemProject[] = [];

  for (const p of CANONICAL_PROJECTS) {
    if (p.id === projectId) continue;
    if (p.status === "inactive" || p.status === "deprecated") continue;

    // Check for shared categories
    const sharedCats = p.categories.filter((c) => project.categories.includes(c));

    if (sharedCats.length > 0) {
      // Prefer matches on leaf categories (more specific)
      const hasLeafMatch = sharedCats.some(
        (c) => !childCategories(c as any).length,
      );
      if (hasLeafMatch) {
        sameCategory.push(p);
      } else {
        sameParent.push(p);
      }
    }
  }

  // Sort by data source count (more connected = more relevant)
  const sortByRelevance = (a: EcosystemProject, b: EcosystemProject) =>
    b.dataSources.length - a.dataSources.length;

  sameCategory.sort(sortByRelevance);
  sameParent.sort(sortByRelevance);

  // Combine: same category first, then same parent
  const result = [...sameCategory, ...sameParent].slice(0, limit);

  return result;
}
