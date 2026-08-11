/**
 * ════════════════════════════════════════════════════════════════════════════
 * CANONICAL ECOSYSTEM TYPE SYSTEM
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This file defines the canonical type system for the Solana Ecosystem
 * Intelligence Platform. Every type here is a domain model — not a UI label.
 *
 * Core principles:
 * - Category is a canonical domain model, not a display string
 * - One project may have multiple categories
 * - Token mint address is the primary identifier when available (not ticker)
 * - 0 ≠ unknown — unavailable data is null, never 0
 * - Every metric carries provenance (source, fetchedAt, confidence)
 * - Discovery data is separate from canonical (verified) data
 * ════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. CATEGORY TAXONOMY — canonical domain model
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical ecosystem categories. One project may belong to multiple.
 * This is NOT a UI label — it is a domain classification that drives
 * source selection, coverage measurement, and entity relationships.
 */
export type EcosystemCategory =
  // DeFi
  | "defi"
  | "dex" // spot DEXs / AMMs
  | "dex_aggregator" // Jupiter, 1inch-style
  | "lending" // lending & borrowing
  | "derivatives" // perps, options, synthetics
  | "perpetuals" // perpetual DEXs
  | "options" // options protocols
  | "stablecoins" // stablecoin issuers
  | "yield" // yield aggregators, vaults
  | "liquid_staking" // LST protocols
  | "restaking" // restaking / liquid restaking
  // NFT
  | "nft" // generic NFT
  | "nft_marketplace" // marketplaces
  | "nft_infrastructure" // minting, metadata, standards
  | "nft_aggregator" // marketplace aggregators
  // Oracle
  | "oracle" // price feeds, data providers
  // RWA
  | "rwa" // real-world assets
  // Payments
  | "payments" // payment infrastructure
  // Wallets
  | "wallet" // wallet providers
  // Bridges
  | "bridge" // cross-chain bridges
  // Infrastructure
  | "infrastructure" // RPC, indexers, data providers
  | "rpc" // RPC providers
  | "indexer" // indexing services
  | "data_provider" // data aggregation/Analytics
  | "validator" // validator infrastructure
  // Developer Tooling
  | "developer_tools" // SDKs, frameworks, CLI
  // Security
  | "security" // auditors, monitoring, bug bounty
  // Launchpads
  | "launchpad" // token launch platforms
  // Gaming
  | "gaming" // on-chain games
  // DePIN
  | "depin" // decentralized physical infrastructure
  // AI
  | "ai" // AI/ML protocols
  // Social
  | "social" // social protocols
  // Governance
  | "governance" // DAO tooling, voting
  | "dao" // DAOs
  // Meme
  | "meme" // meme tokens & ecosystem
  // Privacy
  | "privacy" // privacy protocols
  // Identity
  | "identity" // identity & domain services
  | "names" // naming services (.sol etc.)
  // Cross-cutting
  | "insurance" // insurance protocols
  | "prediction_market" // prediction markets
  | "fund" // funds, indices
  | "other";

/** Metadata for each category — display name, icon hint, description */
export interface CategoryMeta {
  id: EcosystemCategory;
  label: string;
  description: string;
  /** Parent category for hierarchical display (e.g. dex → defi) */
  parent?: EcosystemCategory;
}

/** Canonical category metadata registry */
export const CATEGORY_METADATA: CategoryMeta[] = [
  // DeFi
  { id: "defi", label: "DeFi", description: "Decentralized finance protocols on Solana" },
  { id: "dex", label: "DEX", description: "Spot decentralized exchanges and AMMs", parent: "defi" },
  { id: "dex_aggregator", label: "DEX Aggregator", description: "Multi-route swap aggregators", parent: "defi" },
  { id: "lending", label: "Lending", description: "Lending and borrowing protocols", parent: "defi" },
  { id: "derivatives", label: "Derivatives", description: "Derivatives protocols", parent: "defi" },
  { id: "perpetuals", label: "Perpetuals", description: "Perpetual futures DEXs", parent: "defi" },
  { id: "options", label: "Options", description: "Options trading protocols", parent: "defi" },
  { id: "stablecoins", label: "Stablecoins", description: "Stablecoin issuers and protocols", parent: "defi" },
  { id: "yield", label: "Yield & Vaults", description: "Yield aggregators and vault strategies", parent: "defi" },
  { id: "liquid_staking", label: "Liquid Staking", description: "Liquid staking token protocols", parent: "defi" },
  { id: "restaking", label: "Restaking", description: "Restaking and liquid restaking", parent: "defi" },
  // NFT
  { id: "nft", label: "NFT", description: "Non-fungible tokens on Solana" },
  { id: "nft_marketplace", label: "NFT Marketplace", description: "NFT trading marketplaces", parent: "nft" },
  { id: "nft_infrastructure", label: "NFT Infrastructure", description: "Minting, metadata, standards", parent: "nft" },
  { id: "nft_aggregator", label: "NFT Aggregator", description: "Cross-marketplace aggregators", parent: "nft" },
  // Oracle
  { id: "oracle", label: "Oracle", description: "Price feed and data oracle providers" },
  // RWA
  { id: "rwa", label: "Real-World Assets", description: "Tokenized real-world assets" },
  // Payments
  { id: "payments", label: "Payments", description: "Payment infrastructure and Solana Pay" },
  // Wallets
  { id: "wallet", label: "Wallet", description: "Wallet providers and custody" },
  // Bridges
  { id: "bridge", label: "Bridge", description: "Cross-chain bridges" },
  // Infrastructure
  { id: "infrastructure", label: "Infrastructure", description: "RPC, indexing, data infrastructure" },
  { id: "rpc", label: "RPC", description: "RPC node providers", parent: "infrastructure" },
  { id: "indexer", label: "Indexer", description: "Blockchain indexing services", parent: "infrastructure" },
  { id: "data_provider", label: "Data Provider", description: "Data aggregation and analytics", parent: "infrastructure" },
  { id: "validator", label: "Validator", description: "Validator infrastructure and staking pools", parent: "infrastructure" },
  // Developer Tooling
  { id: "developer_tools", label: "Developer Tools", description: "SDKs, frameworks, CLI tools" },
  // Security
  { id: "security", label: "Security", description: "Auditors, monitoring, bug bounty" },
  // Launchpads
  { id: "launchpad", label: "Launchpad", description: "Token launch and fundraising platforms" },
  // Gaming
  { id: "gaming", label: "Gaming", description: "On-chain games and gaming infrastructure" },
  // DePIN
  { id: "depin", label: "DePIN", description: "Decentralized physical infrastructure networks" },
  // AI
  { id: "ai", label: "AI", description: "AI and ML protocols" },
  // Social
  { id: "social", label: "Social", description: "Social and community protocols" },
  // Governance
  { id: "governance", label: "Governance", description: "DAO tooling and governance" },
  { id: "dao", label: "DAO", description: "Decentralized autonomous organizations", parent: "governance" },
  // Meme
  { id: "meme", label: "Meme Ecosystem", description: "Meme tokens, launchpads, and culture" },
  // Privacy
  { id: "privacy", label: "Privacy", description: "Privacy-preserving protocols" },
  // Identity
  { id: "identity", label: "Identity", description: "Identity verification and management" },
  { id: "names", label: "Names & Domains", description: "Naming services like .sol", parent: "identity" },
  // Cross-cutting
  { id: "insurance", label: "Insurance", description: "Insurance and risk protocols" },
  { id: "prediction_market", label: "Prediction Markets", description: "Prediction market protocols" },
  { id: "fund", label: "Funds & Indices", description: "Tokenized funds and indices" },
  { id: "other", label: "Other", description: "Uncategorized projects" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. DATA SOURCE TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Type of data source / connector */
export type SourceType =
  | "api" // REST/JSON API
  | "rpc" // JSON-RPC (Solana RPC)
  | "indexer" // indexing service (Helius DAS, etc.)
  | "oracle" // oracle price feed
  | "marketplace" // NFT marketplace API
  | "onchain" // direct on-chain program read
  | "web" // web scraping / RSS
  | "github" // GitHub API
  | "subgraph" // GraphQL subgraph
  | "websocket"; // WebSocket stream

/** Authentication method required by the source */
export type AuthMethod = "none" | "api_key" | "oauth" | "wallet" | "unknown";

/** Health status of a data source */
export type SourceStatus =
  | "healthy" // responding normally
  | "degraded" // responding but slow / partial errors
  | "rate_limited" // hit rate limit, backing off
  | "unavailable" // not responding
  | "stale" // responding but data is outdated
  | "unknown"; // not yet checked

/** Lifecycle stage of a project in the verification pipeline */
export type VerificationStage =
  | "discovered" // candidate found by discovery engine
  | "normalized" // name/identity normalized
  | "identity_resolved" // canonical identity established
  | "verified" // website/docs/github cross-referenced
  | "registered" // added to canonical registry
  | "data_source_attached" // at least one data source connected
  | "health_checked" // data source health verified
  | "available"; // fully available to the platform

/**
 * A single data source / connector attached to a project.
 * One project may have multiple data sources (multi-source isolation).
 */
export interface DataSource {
  id: string; // e.g. "pyth-mainnet", "magic-eden-api"
  provider: string; // e.g. "Pyth Network", "Magic Eden"
  type: SourceType;
  /** What data this source can provide */
  capabilities: string[]; // e.g. ["price_feeds", "publishers", "update_frequency"]
  endpoint?: string; // base URL
  authentication: AuthMethod;
  status: SourceStatus;
  lastCheckedAt: string; // ISO timestamp
  lastSuccessAt?: string; // ISO timestamp of last successful fetch
  /** Error message if status is not healthy */
  lastError?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONTRACT / PROGRAM REFERENCES
// ─────────────────────────────────────────────────────────────────────────────

/** Type of on-chain reference */
export type ContractKind = "program" | "token_mint" | "vault" | "pool" | "multisig" | "other";

/**
 * On-chain contract / program / token reference.
 * Mint address is the primary identifier for tokens.
 */
export interface ContractReference {
  kind: ContractKind;
  address: string; // Solana base58 address
  label?: string; // human-readable label
  /** True if this is the canonical program ID for the project */
  isPrimary?: boolean;
  deprecated?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ENTITY ALIASES — for entity resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Alias for entity resolution. Same project may appear under different names.
 * e.g. Jupiter / Jupiter Exchange / JUP → one canonical entity.
 */
export interface EntityAlias {
  alias: string;
  type: "name" | "ticker" | "slug" | "domain" | "twitter" | "github";
  /** The canonical project ID this alias resolves to */
  canonicalId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ECOSYSTEM PROJECT — the canonical entity
// ─────────────────────────────────────────────────────────────────────────────

/** Project lifecycle status */
export type ProjectStatus = "active" | "inactive" | "deprecated" | "unknown";

/**
 * Canonical ecosystem project entity.
 *
 * This is NOT a UI model — it is the source-of-truth identity for a project
 * in the Solana ecosystem. It carries:
 * - canonical identity (id, name, slug)
 * - multi-category classification
 * - on-chain references (program IDs, token mints)
 * - data sources (multi-connector)
 * - verification stage
 * - lifecycle status
 * - metadata (website, docs, github, logo)
 */
export interface EcosystemProject {
  /** Canonical unique ID (slug-based, stable) */
  id: string;
  name: string;
  slug: string;

  categories: EcosystemCategory[];

  chain: "solana";

  description?: string;
  website?: string;
  docs?: string;
  github?: string;
  twitter?: string;
  discord?: string;
  logo?: string;

  status: ProjectStatus;
  verificationStage: VerificationStage;

  /** All data sources attached to this project */
  dataSources: DataSource[];

  /** On-chain contract/program/mint references */
  contracts?: ContractReference[];

  /** Token metadata (if project has a token) */
  token?: {
    symbol: string;
    name: string;
    mintAddress?: string; // PRIMARY identifier when available
    coingeckoId?: string;
  };

  /** Aliases for entity resolution */
  aliases?: string[];

  /** When this project was first discovered and last verified */
  discoveredAt: string;
  lastVerifiedAt: string;
  lastUpdated: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PROVENANCE — every metric knows where it came from
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A metric value with full provenance. This is the core building block
 * for the canonical data layer.
 *
 * CRITICAL: value is `T | null`, never a default. `null` means unavailable.
 * `0` means "the real value is zero". These are different.
 */
export interface ProvenanceMetric<T> {
  value: T | null;
  source: string; // data source ID
  sourceLabel: string; // human-readable source name
  fetchedAt: string; // when we fetched it (ISO)
  sourceUpdatedAt?: string | null; // when the source last updated this data
  transformation?: string; // e.g. "normalized", "aggregated", "raw"
  confidence: number; // 0-1, influenced by source health
  status: "available" | "unavailable" | "stale" | "transformed" | "fallback";
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. DATA COMPLETENESS — per-entity completeness scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Data completeness for a single project across data dimensions.
 * Each field is 0-1 (percentage/100).
 */
export interface DataCompleteness {
  metadata: number; // name, description, website, logo, docs
  marketData: number; // TVL, volume, price, APY
  onChainData: number; // program addresses, on-chain state
  socialData: number; // twitter, discord, community metrics
  newsData: number; // linked news articles
  historicalData: number; // historical charts, time series
  overall: number; // weighted average
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. COVERAGE REPORTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Coverage report for a single category.
 * Measures what we know AND what we don't know.
 */
export interface CoverageReport {
  category: EcosystemCategory;
  categoryLabel: string;
  discoveredProjects: number;
  registeredProjects: number;
  projectsWithDataSource: number;
  projectsWithVerifiedIdentity: number;
  projectsWithLiveData: number;
  coverageScore: number; // 0-1
  missingProjects: string[];
  missingDataSources: string[];
  /** Projects in this category that have no data source at all */
  projectsWithoutSources: string[];
}

/**
 * Overall ecosystem coverage summary.
 */
export interface EcosystemCoverageSummary {
  totalCategories: number;
  totalDiscovered: number;
  totalRegistered: number;
  totalVerified: number;
  totalWithLiveData: number;
  overallCoverageScore: number;
  perCategory: CoverageReport[];
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. SOURCE HEALTH
// ─────────────────────────────────────────────────────────────────────────────

/** Health check record for a data source */
export interface SourceHealthCheck {
  sourceId: string;
  status: SourceStatus;
  checkedAt: string;
  responseTimeMs?: number;
  error?: string;
}

/** Aggregated source health with history */
export interface SourceHealthSummary {
  sourceId: string;
  currentStatus: SourceStatus;
  lastCheckedAt: string;
  lastSuccessAt?: string;
  consecutiveFailures: number;
  history: SourceHealthCheck[];
  /** Derived confidence score 0-1 based on health */
  confidence: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. DATA CAPABILITY MATRIX
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-project data capability map.
 * Describes what data dimensions are available for this project.
 */
export interface DataCapability {
  projectId: string;
  /** Map of capability name → availability + source */
  capabilities: Record<
    string,
    {
      available: boolean;
      sourceId?: string;
      lastChecked?: string;
    }
  >;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. ECOSYSTEM GRAPH — relationship model
// ─────────────────────────────────────────────────────────────────────────────

/** Type of relationship between ecosystem entities */
export type RelationType =
  | "has_category"
  | "has_token"
  | "has_program"
  | "uses_oracle"
  | "listed_on" // NFT → marketplace
  | "parent_of" // protocol → sub-protocol
  | "related_to"
  | "competes_with"
  | "integrates_with"
  | "forked_from"
  | "governed_by"
  | "news_about";

/** A directed relationship in the ecosystem graph */
export interface EcosystemRelation {
  fromId: string; // project ID
  toId: string; // project ID or category name
  type: RelationType;
  metadata?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. NEWS ↔ ECOSYSTEM ENTITY LINKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Links a news article to canonical ecosystem entities.
 * Replaces simple `category: "defi"` with explicit entity references.
 */
export interface NewsEntityLink {
  articleId: string;
  projectId: string;
  projectName: string;
  categories: EcosystemCategory[];
  /** Confidence of the entity match (0-1) */
  matchConfidence: number;
  /** How the match was determined */
  matchMethod: "exact" | "alias" | "fuzzy" | "manual";
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. DISCOVERY CANDIDATE — pre-verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A candidate project discovered by the discovery engine.
 * NOT yet canonical — must pass through the verification pipeline.
 */
export interface DiscoveryCandidate {
  id: string; // temporary ID
  name: string;
  suggestedCategories: EcosystemCategory[];
  discoveredFrom: string; // which discovery source found this
  website?: string;
  github?: string;
  description?: string;
  tokenSymbol?: string;
  tokenMint?: string;
  defiLlamaSlug?: string;
  coingeckoId?: string;
  /** Confidence of discovery (0-1) */
  discoveryConfidence: number;
  discoveredAt: string;
  /** Whether this candidate was matched to an existing canonical project */
  resolvedToProjectId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. HELPER UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** Get category metadata by ID */
export function getCategoryMeta(id: EcosystemCategory): CategoryMeta | undefined {
  return CATEGORY_METADATA.find((c) => c.id === id);
}

/** Get label for a category */
export function categoryLabel(id: EcosystemCategory): string {
  return getCategoryMeta(id)?.label ?? id;
}

/** Get all category IDs */
export function allCategoryIds(): EcosystemCategory[] {
  return CATEGORY_METADATA.map((c) => c.id);
}

/** Get child categories of a parent */
export function childCategories(parent: EcosystemCategory): EcosystemCategory[] {
  return CATEGORY_METADATA.filter((c) => c.parent === parent).map((c) => c.id);
}

/** Check if a category is a leaf (has no children) */
export function isLeafCategory(id: EcosystemCategory): boolean {
  return !CATEGORY_METADATA.some((c) => c.parent === id);
}

/**
 * Normalize a project name for entity resolution.
 * Removes common suffixes, lowercases, strips punctuation.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(protocol|finance|exchange|swap|network|labs|dao|defi)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Calculate data completeness overall score from dimension scores.
 * Weights: marketData 30%, onChainData 25%, metadata 20%,
 * historicalData 10%, socialData 8%, newsData 7%
 */
export function calculateOverallCompleteness(d: Omit<DataCompleteness, "overall">): number {
  const w = {
    marketData: 0.3,
    onChainData: 0.25,
    metadata: 0.2,
    historicalData: 0.1,
    socialData: 0.08,
    newsData: 0.07,
  };
  return Math.max(0, Math.min(1,
    d.metadata * w.metadata +
    d.marketData * w.marketData +
    d.onChainData * w.onChainData +
    d.socialData * w.socialData +
    d.newsData * w.newsData +
    d.historicalData * w.historicalData
  ));
}

/**
 * Calculate coverage score for a category.
 * Weighted: discovered 15%, registered 25%, verifiedIdentity 20%,
 * withDataSource 20%, withLiveData 20%
 */
export function calculateCoverageScore(opts: {
  discovered: number;
  registered: number;
  verifiedIdentity: number;
  withDataSource: number;
  withLiveData: number;
}): number {
  if (opts.discovered === 0) return 0;
  const w = {
    discovered: 0.15,
    registered: 0.25,
    verifiedIdentity: 0.2,
    withDataSource: 0.2,
    withLiveData: 0.2,
  };
  const ratio = (n: number) => Math.max(0, Math.min(1, n / Math.max(1, opts.discovered)));
  return Math.max(0, Math.min(1,
    ratio(opts.discovered) * w.discovered +
    ratio(opts.registered) * w.registered +
    ratio(opts.verifiedIdentity) * w.verifiedIdentity +
    ratio(opts.withDataSource) * w.withDataSource +
    ratio(opts.withLiveData) * w.withLiveData
  ));
}

/**
 * Calculate source health confidence from status.
 * healthy → 1.0, degraded → 0.6, rate_limited → 0.4,
 * stale → 0.3, unavailable → 0.0, unknown → 0.1
 */
export function healthConfidence(status: SourceStatus): number {
  switch (status) {
    case "healthy": return 1.0;
    case "degraded": return 0.6;
    case "rate_limited": return 0.4;
    case "stale": return 0.3;
    case "unavailable": return 0.0;
    case "unknown": return 0.1;
    default: return 0.1;
  }
}
