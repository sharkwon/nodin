/**
 * ════════════════════════════════════════════════════════════════════════════
 * COVERAGE REPORTING & MISSING DATA DETECTION ENGINE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Computes coverage reports per category and overall, detects missing data,
 * and tracks data completeness per project.
 *
 * CRITICAL PRINCIPLE:
 * - "10 API integrations" ≠ "100% coverage"
 * - Coverage = how much of the real ecosystem we can observe + validate
 * - The system must explicitly know WHAT IT DOESN'T KNOW
 * ════════════════════════════════════════════════════════════════════════════
 */
import type {
  EcosystemProject,
  EcosystemCategory,
  CoverageReport,
  EcosystemCoverageSummary,
  DataCompleteness,
  DataSource,
  SourceStatus,
} from "./ecosystem-types.js";
import {
  CATEGORY_METADATA,
  categoryLabel,
  calculateCoverageScore,
  calculateOverallCompleteness,
  healthConfidence,
} from "./ecosystem-types.js";
import { expectedCapabilitiesForProject, categoryCapabilityBreakdown, CATEGORY_EXPECTED_CAPABILITIES, type CategoryCapabilityBreakdown } from "./category-contracts.js";
import { CANONICAL_PROJECTS } from "./ecosystem-registry.js";
import { entityResolver } from "./entity-resolver.js";
import { sourceRegistry, sourceMapper } from "./source-registry.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. KNOWN PROJECTS PER CATEGORY — the "what we expect to have" baseline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Known major projects per category that we EXPECT to find in our registry.
 * If these are missing, coverage is incomplete. This is the "discovered"
 * baseline — the denominator for coverage calculations.
 *
 * This list is NOT the registry — it's the expectation benchmark.
 * It includes projects we know exist even if we don't have data sources for them.
 */
export const KNOWN_PROJECTS_PER_CATEGORY: Record<EcosystemCategory, string[]> = {
  dex: ["Raydium", "Orca", "Meteora", "Phoenix", "Cropper", "Lifinity", "Saber", "Cykura", "Saros", "Jupiter"],
  dex_aggregator: ["Jupiter"],
  lending: ["Kamino", "marginfi", "Solend", "Frakt", "Banx", "Sharky"],
  derivatives: ["Drift", "Zeta Markets", "Parity", "Gulf Stream"],
  perpetuals: ["Drift", "Zeta Markets", "Parity", "Gulf Stream"],
  options: ["PsyOptions"],
  stablecoins: ["USDC", "USDT", "PYUSD"],
  yield: ["Tulip", "Francium", "Kamino Vaults", "Meteora"],
  liquid_staking: ["Jito", "Marinade", "BlazeStake", "Sanctum", "CFMS"],
  restaking: ["Renza"],
  oracle: ["Pyth Network", "Switchboard", "Chainlink", "DIA"],
  nft: ["Magic Eden", "Tensor", "Hyperspace", "Solanart", "Metaplex"],
  nft_marketplace: ["Magic Eden", "Tensor", "Hyperspace", "Solanart"],
  nft_infrastructure: ["Metaplex", "Compressed NFTs"],
  nft_aggregator: ["Hyperspace"],
  rwa: ["Superstate"],
  payments: ["Solana Pay"],
  wallet: ["Phantom", "Solflare", "Backpack", "Glow"],
  bridge: ["Wormhole", "deBridge", "Mayan"],
  infrastructure: ["Helius", "Triton", "QuickNode"],
  rpc: ["Helius", "Triton", "QuickNode"],
  indexer: ["Helius"],
  data_provider: ["DEXScreener", "Birdeye"],
  validator: ["Jito"],
  developer_tools: ["Anchor", "Solana CLI", "Metaplex Sugar"],
  security: ["Sec3", "OtterSec", "Neodyme", "Zellic", "SIG"],
  launchpad: ["pump.fun", "BONK.fun", "LaunchLabs"],
  gaming: ["Star Atlas", "Aurory"],
  depin: ["Render Network", "Helium", "io.net", "Kyve"],
  ai: ["Grass", "Render Network", "io.net"],
  social: ["Drift Social"],
  governance: ["Squads", "Realms"],
  dao: ["Squads", "Realms"],
  meme: ["Bonk", "dogwifhat", "Popcat", "pump.fun"],
  privacy: ["Elusiv"],
  identity: ["Solana Name Service", "Bonfida"],
  names: ["Solana Name Service", "Bonfida"],
  insurance: ["InsurAce"],
  prediction_market: ["Streeth"],
  fund: [],
  defi: ["Raydium", "Orca", "Meteora", "Jupiter", "Kamino", "marginfi", "Solend", "Drift", "Zeta", "Jito", "Marinade"],
  other: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. COVERAGE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The CoverageEngine computes coverage reports by comparing what we HAVE
 * (canonical registry) against what we EXPECT (known projects per category).
 *
 * It also tracks data completeness per project and detects missing data sources.
 */
export class CoverageEngine {
  private projects: EcosystemProject[];

  constructor(projects: EcosystemProject[] = CANONICAL_PROJECTS) {
    this.projects = projects;
  }

  /**
   * Generate a coverage report for a single category.
   *
   * Metrics:
   * - discoveredProjects: how many we know exist (from KNOWN_PROJECTS_PER_CATEGORY)
   * - registeredProjects: how many are in our canonical registry
   * - projectsWithDataSource: how many have at least one data source
   * - projectsWithVerifiedIdentity: how many passed verification
   * - projectsWithLiveData: how many have a healthy data source
   * - coverageScore: weighted score 0-1
   * - missingProjects: known projects NOT in our registry
   * - missingDataSources: projects in registry but with no data sources
   */
  reportForCategory(category: EcosystemCategory): CoverageReport {
    const known = KNOWN_PROJECTS_PER_CATEGORY[category] ?? [];
    const registered = this.projects.filter((p) => p.categories.includes(category));

    // Find missing projects (known but not registered)
    const registeredNames = new Set(registered.map((p) => p.name.toLowerCase()));
    const missingProjects = known.filter((k) => !registeredNames.has(k.toLowerCase()));

    // Find projects without data sources
    const withDataSource = registered.filter((p) => p.dataSources.length > 0);
    const withoutSources = registered.filter((p) => p.dataSources.length === 0);

    // Find verified projects
    const verified = registered.filter(
      (p) => p.verificationStage === "verified" || p.verificationStage === "available",
    );

    // Find projects with live (healthy) data — uses sourceMapper to resolve project source IDs
    const withLiveData = registered.filter((p) =>
      p.dataSources.some((ds) => sourceMapper.hasLiveSource(ds.id)),
    );

    // For projects with a registered connector (any health status, even unknown)
    const withAnySourceStatus = registered.filter((p) =>
      p.dataSources.some((ds) => sourceMapper.hasRegisteredSource(ds.id)),
    );

    const score = calculateCoverageScore({
      discovered: Math.max(known.length, registered.length),
      registered: registered.length,
      verifiedIdentity: verified.length,
      withDataSource: withDataSource.length,
      withLiveData: withLiveData.length > 0 ? withLiveData.length : withAnySourceStatus.length,
    });

    return {
      category,
      categoryLabel: categoryLabel(category),
      discoveredProjects: Math.max(known.length, registered.length),
      registeredProjects: registered.length,
      projectsWithDataSource: withDataSource.length,
      projectsWithVerifiedIdentity: verified.length,
      projectsWithLiveData: withLiveData.length > 0 ? withLiveData.length : withAnySourceStatus.length,
      coverageScore: score,
      missingProjects,
      missingDataSources: withoutSources.map((p) => p.name),
      projectsWithoutSources: withoutSources.map((p) => p.name),
    };
  }

  /**
   * Generate coverage reports for all categories.
   */
  reportAll(): EcosystemCoverageSummary {
    const perCategory = CATEGORY_METADATA
      .filter((c) => c.id !== "other")
      .map((c) => this.reportForCategory(c.id));

    // Only include categories that have at least 1 known or registered project
    const active = perCategory.filter(
      (r) => r.discoveredProjects > 0 || r.registeredProjects > 0,
    );

    const totalDiscovered = active.reduce((s, r) => s + r.discoveredProjects, 0);
    const totalRegistered = active.reduce((s, r) => s + r.registeredProjects, 0);
    const totalVerified = active.reduce((s, r) => s + r.projectsWithVerifiedIdentity, 0);
    const totalWithLiveData = active.reduce((s, r) => s + r.projectsWithLiveData, 0);

    // Overall score: weighted average of category scores
    const overallScore = active.length > 0
      ? active.reduce((s, r) => s + r.coverageScore * r.discoveredProjects, 0) / Math.max(1, totalDiscovered)
      : 0;

    return {
      totalCategories: active.length,
      totalDiscovered,
      totalRegistered,
      totalVerified,
      totalWithLiveData,
      overallCoverageScore: Math.max(0, Math.min(1, overallScore)),
      perCategory: active.sort((a, b) => b.coverageScore - a.coverageScore),
      generatedAt: new Date().toISOString(),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. DATA COMPLETENESS — per project
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Calculate data completeness for a single project.
   * Uses category-aware capability scoring + traditional dimension scoring.
   *
   * Capability completeness: % of expected capabilities (per project's categories)
   * that are available from registered sources.
   *
   * Dimension scoring remains for metadata, on-chain, social, news, historical.
   */
  completenessForProject(project: EcosystemProject): DataCompleteness {
    // Metadata: name, description, website, logo, docs
    let metadataScore = 0;
    if (project.description) metadataScore += 0.3;
    if (project.website) metadataScore += 0.25;
    if (project.docs) metadataScore += 0.2;
    if (project.github) metadataScore += 0.15;
    if (project.logo) metadataScore += 0.1;
    metadataScore = Math.min(1, metadataScore);

    // Market data: category-aware capability scoring
    const expectedCaps = expectedCapabilitiesForProject(project.categories);
    const projectCaps = new Set<string>();
    for (const ds of project.dataSources) {
      if (!sourceMapper.hasRegisteredSource(ds.id)) continue;
      for (const cap of ds.capabilities) projectCaps.add(cap);
    }

    // Market data: TVL, volume, price, fees from expected capabilities
    const marketCaps = ["tvl", "volume", "price", "fees", "revenue", "market_cap", "floor_price"];
    const expectedMarketCaps = expectedCaps.filter((c) => marketCaps.includes(c));
    const availableMarketCaps = expectedMarketCaps.filter((c) => projectCaps.has(c));
    const marketDataScore = expectedMarketCaps.length > 0
      ? availableMarketCaps.length / expectedMarketCaps.length
      : 0;

    // On-chain data: program addresses, on-chain state
    let onChainScore = 0;
    if (project.contracts && project.contracts.length > 0) onChainScore += 0.5;
    if (project.token?.mintAddress) onChainScore += 0.3;
    const onChainCapabilities = ["onchain", "program", "rpc", "das"];
    const expectedOnChainCaps = expectedCaps.filter((c) => onChainCapabilities.includes(c));
    const availableOnChainCaps = expectedOnChainCaps.filter((c) => projectCaps.has(c));
    if (expectedOnChainCaps.length > 0) {
      onChainScore += (availableOnChainCaps.length / expectedOnChainCaps.length) * 0.2;
    }
    onChainScore = Math.min(1, onChainScore);

    // Social data: twitter, discord, community
    let socialScore = 0;
    if (project.twitter) socialScore += 0.4;
    if (project.discord) socialScore += 0.3;
    if (project.aliases && project.aliases.length > 0) socialScore += 0.1;
    socialScore = Math.min(1, socialScore);

    // News data: linked news articles (TODO: integrate with news linking)
    const newsScore = 0;

    // Historical data: charts, time series
    const historicalCapabilities = ["historical", "ohlcv", "price_history", "tvl_history"];
    const expectedHistoricalCaps = expectedCaps.filter((c) => historicalCapabilities.includes(c));
    const availableHistoricalCaps = expectedHistoricalCaps.filter((c) => projectCaps.has(c));
    const historicalScore = expectedHistoricalCaps.length > 0
      ? availableHistoricalCaps.length / expectedHistoricalCaps.length
      : 0;

    const dims = {
      metadata: metadataScore,
      marketData: marketDataScore,
      onChainData: onChainScore,
      socialData: socialScore,
      newsData: newsScore,
      historicalData: historicalScore,
    };

    return {
      ...dims,
      overall: calculateOverallCompleteness(dims),
    };
  }

  /**
   * Score how many of the given capabilities are covered by registered data sources.
   * Uses sourceMapper to resolve project source IDs to connectors.
   * Only counts capabilities from sources that have a registered connector (not necessarily healthy).
   */
  private capabilityScore(project: EcosystemProject, capabilities: string[]): number {
    if (capabilities.length === 0) return 0;
    const projectCaps = new Set<string>();
    for (const ds of project.dataSources) {
      // Only count capabilities from sources that resolve to a registered connector
      if (!sourceMapper.hasRegisteredSource(ds.id)) continue;
      for (const cap of ds.capabilities) {
        projectCaps.add(cap);
      }
    }
    const matched = capabilities.filter((c) => projectCaps.has(c)).length;
    return matched / capabilities.length;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4b. SEPARATED COVERAGE METRICS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Calculate separated coverage metrics that distinguish:
   * - Registry coverage: % of known projects registered
   * - Source coverage: % of registered projects with a registered connector
   * - Live data coverage: % of registered projects with a healthy connector
   * - Data completeness: average completeness across registered projects
   * - Freshness: % of sources checked recently
   */
  separatedCoverage(): {
    registryCoverage: number;
    sourceCoverage: number;
    liveDataCoverage: number;
    completeness: number;
    freshness: number;
    totalProjects: number;
    projectsWithRegisteredSource: number;
    projectsWithLiveData: number;
    projectsMetadataOnly: number;
    projectsNoSource: number;
  } {
    const total = this.projects.length;
    if (total === 0) {
      return {
        registryCoverage: 0, sourceCoverage: 0, liveDataCoverage: 0,
        completeness: 0, freshness: 0,
        totalProjects: 0, projectsWithRegisteredSource: 0,
        projectsWithLiveData: 0, projectsMetadataOnly: 0, projectsNoSource: 0,
      };
    }

    const projectsWithRegisteredSource = this.projects.filter((p) =>
      p.dataSources.some((ds) => sourceMapper.hasRegisteredSource(ds.id)),
    ).length;

    const projectsWithLiveData = this.projects.filter((p) =>
      p.dataSources.some((ds) => sourceMapper.hasLiveSource(ds.id)),
    ).length;

    const projectsNoSource = this.projects.filter((p) => p.dataSources.length === 0).length;
    const projectsMetadataOnly = total - projectsWithRegisteredSource - projectsNoSource;

    // Completeness: average across all projects
    const completenessScores = this.projects.map((p) => this.completenessForProject(p).overall);
    const avgCompleteness = completenessScores.reduce((s, v) => s + v, 0) / total;

    // Freshness: % of registered connectors checked within last 5 minutes
    const allHealth = sourceRegistry.getAllHealth();
    const now = Date.now();
    const freshSources = allHealth.filter((h) => {
      if (!h.lastCheckedAt) return false;
      const age = now - new Date(h.lastCheckedAt).getTime();
      return age < 300_000; // 5 minutes
    }).length;
    const freshness = allHealth.length > 0 ? freshSources / allHealth.length : 0;

    return {
      registryCoverage: 1.0, // All registered projects are in the registry by definition
      sourceCoverage: projectsWithRegisteredSource / total,
      liveDataCoverage: projectsWithLiveData / total,
      completeness: avgCompleteness,
      freshness,
      totalProjects: total,
      projectsWithRegisteredSource,
      projectsWithLiveData,
      projectsMetadataOnly,
      projectsNoSource,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. MISSING DATA DETECTION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Detect missing data for a category.
   * Returns a structured report of what's missing.
   */
  missingDataForCategory(category: EcosystemCategory): {
    missingProjects: string[];
    projectsWithoutSources: string[];
    missingCapabilities: string[];
    staleSources: string[];
    unavailableSources: string[];
  } {
    const report = this.reportForCategory(category);
    const projects = this.projects.filter((p) => p.categories.includes(category));

    // Collect all capabilities we'd expect for this category
    const expectedCapabilities = this.expectedCapabilitiesForCategory(category);
    const haveCapabilities = new Set<string>();
    for (const p of projects) {
      for (const ds of p.dataSources) {
        for (const cap of ds.capabilities) {
          haveCapabilities.add(cap);
        }
      }
    }
    const missingCapabilities = expectedCapabilities.filter((c) => !haveCapabilities.has(c));

    // Stale sources (lastChecked > 2 hours ago but not unavailable)
    const staleSources: string[] = [];
    const unavailableSources: string[] = [];
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    for (const p of projects) {
      for (const ds of p.dataSources) {
        // Resolve via sourceMapper to get actual connector health
        const resolved = sourceMapper.resolve(ds.id);
        if (!resolved) continue;
        const health = sourceRegistry.getHealthSummary(resolved.connector.sourceId);
        if (health) {
          if (health.currentStatus === "unavailable") {
            unavailableSources.push(`${p.name}/${ds.provider}`);
          } else if (
            health.currentStatus === "stale" ||
            (health.lastCheckedAt && new Date(health.lastCheckedAt).getTime() < twoHoursAgo)
          ) {
            staleSources.push(`${p.name}/${ds.provider}`);
          }
        }
      }
    }

    return {
      missingProjects: report.missingProjects,
      projectsWithoutSources: report.projectsWithoutSources,
      missingCapabilities,
      staleSources,
      unavailableSources,
    };
  }

  /**
   * Expected capabilities per category — delegates to category-contracts.ts.
   * @deprecated Use CATEGORY_EXPECTED_CAPABILITIES from category-contracts.ts directly.
   */
  private expectedCapabilitiesForCategory(category: EcosystemCategory): string[] {
    return CATEGORY_EXPECTED_CAPABILITIES[category] ?? [];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. SOURCE HEALTH SUMMARY
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get source health summary for all sources across all projects.
   */
  sourceHealthSummary(): {
    total: number;
    healthy: number;
    degraded: number;
    rate_limited: number;
    unavailable: number;
    stale: number;
    unknown: number;
    sources: {
      sourceId: string;
      provider: string;
      status: SourceStatus;
      confidence: number;
      lastCheckedAt: string;
      projectsUsing: string[];
      projectIds: string[];
    }[];
  } {
    const allHealth = sourceRegistry.getAllHealth();
    const counts = { healthy: 0, degraded: 0, rate_limited: 0, unavailable: 0, stale: 0, unknown: 0 };

    // Build reverse index: connector source ID → projects using it (via sourceMapper resolution)
    const connectorToProjects = new Map<string, { names: string[]; ids: string[] }>();
    for (const p of this.projects) {
      for (const ds of p.dataSources) {
        const resolved = sourceMapper.resolve(ds.id);
        if (resolved) {
          const entry = connectorToProjects.get(resolved.connector.sourceId) ?? { names: [], ids: [] };
          if (!entry.names.includes(p.name)) entry.names.push(p.name);
          if (!entry.ids.includes(p.id)) entry.ids.push(p.id);
          connectorToProjects.set(resolved.connector.sourceId, entry);
        }
      }
    }

    const sources = allHealth.map((h) => {
      const connector = sourceRegistry.get(h.sourceId);
      counts[h.currentStatus as keyof typeof counts] = (counts[h.currentStatus as keyof typeof counts] ?? 0) + 1;
      const entry = connectorToProjects.get(h.sourceId) ?? { names: [], ids: [] };
      return {
        sourceId: h.sourceId,
        provider: connector?.provider ?? h.sourceId,
        status: h.currentStatus,
        confidence: h.confidence,
        lastCheckedAt: h.lastCheckedAt,
        projectsUsing: entry.names,
        projectIds: entry.ids,
      };
    });

    return {
      total: allHealth.length,
      ...counts,
      sources: sources.sort((a, b) => healthConfidence(b.status) - healthConfidence(a.status)),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. CATEGORY CAPABILITY BREAKDOWN
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get capability breakdown for all categories.
   * For each category: expected capabilities, available capabilities, missing capabilities, completeness.
   */
  categoryCapabilityBreakdowns(): CategoryCapabilityBreakdown[] {
    const sourceCapsByProject = new Map<string, string[]>();
    for (const p of this.projects) {
      const caps = new Set<string>();
      for (const ds of p.dataSources) {
        if (!sourceMapper.hasRegisteredSource(ds.id)) continue;
        for (const cap of ds.capabilities) caps.add(cap);
      }
      sourceCapsByProject.set(p.id, Array.from(caps));
    }

    const results: CategoryCapabilityBreakdown[] = [];
    for (const cat of CATEGORY_METADATA) {
      const projectIds = this.projects
        .filter((p) => p.categories.includes(cat.id))
        .map((p) => p.id);
      if (projectIds.length === 0) continue;
      results.push(
        categoryCapabilityBreakdown(cat.id, projectIds, sourceCapsByProject),
      );
    }
    return results;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. GLOBAL COVERAGE ENGINE INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

export const coverageEngine = new CoverageEngine(CANONICAL_PROJECTS);
