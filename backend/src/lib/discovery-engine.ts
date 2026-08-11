/**
 * ════════════════════════════════════════════════════════════════════════════
 * DISCOVERY ENGINE & VERIFICATION PIPELINE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Discovers new Solana ecosystem projects from multiple sources and
 * runs them through a verification pipeline before adding to the canonical registry.
 *
 * Pipeline:
 * DISCOVERED → NORMALIZED → IDENTITY_RESOLVED → VERIFIED
 * → REGISTERED → DATA_SOURCE_ATTACHED → HEALTH_CHECKED → AVAILABLE
 *
 * Discovery sources:
 * - DeFiLlama protocol list (existing)
 * - Solana ecosystem directory (solana.com/ecosystem)
 * - GitHub organizations
 * - CoinGecko token categories
 *
 * IMPORTANT: Discovery produces CANDIDATES, not trusted projects.
 * Candidates must pass verification before becoming canonical.
 * ════════════════════════════════════════════════════════════════════════════
 */
import type {
  DiscoveryCandidate,
  EcosystemProject,
  EcosystemCategory,
  VerificationStage,
} from "./ecosystem-types.js";
import { CANONICAL_PROJECTS } from "./ecosystem-registry.js";
import { entityResolver } from "./entity-resolver.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DISCOVERY ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The DiscoveryEngine discovers candidate projects from multiple sources.
 * Each source contributes candidates with a discovery confidence score.
 */
export class DiscoveryEngine {
  private candidates: DiscoveryCandidate[] = [];

  /**
   * Discover candidates from DeFiLlama protocol list.
   * This is the most reliable source — any protocol with Solana chain is a candidate.
   */
  async discoverFromDefiLlama(): Promise<DiscoveryCandidate[]> {
    try {
      const data = await fetch("https://api.llama.fi/protocols", {
        headers: { Accept: "application/json", "User-Agent": "nodin-agent/1.0" },
      }).then((r) => r.json()) as Array<{
        name: string; slug?: string; category: string; chains?: string[];
        symbol?: string; description?: string; url?: string; twitter?: string;
        parentProtocol?: string; mcap?: number;
      }>;

      const solanaProtos = data.filter((p) => (p.chains || []).includes("Solana") && p.category !== "CEX");

      const candidates: DiscoveryCandidate[] = solanaProtos.map((p) => ({
        id: `candidate-defillama-${p.slug || p.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: p.name,
        suggestedCategories: this.mapDefiLlamaCategory(p.category),
        discoveredFrom: "defillama",
        website: p.url,
        description: p.description,
        tokenSymbol: p.symbol,
        defiLlamaSlug: p.slug,
        discoveryConfidence: 0.85,
        discoveredAt: new Date().toISOString(),
      }));

      return candidates;
    } catch {
      return [];
    }
  }

  /**
   * Discover candidates from CoinGecko Solana ecosystem category.
   */
  async discoverFromCoinGecko(): Promise<DiscoveryCandidate[]> {
    try {
      const data = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=100&page=1&sparkline=false",
        { headers: { Accept: "application/json", "User-Agent": "nodin-agent/1.0" } },
      ).then((r) => r.json()) as Array<{
        id: string; symbol: string; name: string;
        current_price: number; market_cap: number;
      }>;

      const candidates: DiscoveryCandidate[] = data.map((c) => ({
        id: `candidate-coingecko-${c.id}`,
        name: c.name,
        suggestedCategories: ["defi", "meme"] as EcosystemCategory[],
        discoveredFrom: "coingecko",
        tokenSymbol: c.symbol?.toUpperCase(),
        coingeckoId: c.id,
        discoveryConfidence: 0.6,
        discoveredAt: new Date().toISOString(),
      }));

      return candidates;
    } catch {
      return [];
    }
  }

  /**
   * Run all discovery sources and return merged candidates.
   */
  async discoverAll(): Promise<DiscoveryCandidate[]> {
    const [defillama, coingecko] = await Promise.all([
      this.discoverFromDefiLlama(),
      this.discoverFromCoinGecko(),
    ]);

    // Merge, deduplicating by name
    const seen = new Set<string>();
    const all: DiscoveryCandidate[] = [];
    for (const c of [...defillama, ...coingecko]) {
      const norm = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(norm)) continue;
      seen.add(norm);
      all.push(c);
    }

    this.candidates = all;
    return all;
  }

  /**
   * Map DeFiLlama category strings to our canonical EcosystemCategory.
   */
  private mapDefiLlamaCategory(dlCat: string): EcosystemCategory[] {
    const map: Record<string, EcosystemCategory[]> = {
      "Dexs": ["dex"], "AMM": ["dex"], "AMM&liquidity": ["dex"],
      "Lending": ["lending"], "CDP": ["lending", "stablecoins"],
      "Derivatives": ["derivatives"], "Perpetuals": ["perpetuals"],
      "Options": ["options"], "Yield Aggregator": ["yield"], "Yield": ["yield"],
      "Liquidity manager": ["yield"], "Bridge": ["bridge"], "Cross Chain": ["bridge"],
      "Oracle": ["oracle"], "RWA": ["rwa"], "RWA Lending": ["rwa", "lending"],
      "NFT Marketplace": ["nft_marketplace"], "Launchpad": ["launchpad"],
      "Liquid Staking": ["liquid_staking"], "Restaking": ["restaking"],
      "Stablecoins": ["stablecoins"], "Synthetics": ["derivatives"],
      "Insurance": ["insurance"], "Prediction Market": ["prediction_market"],
    };
    return map[dlCat] ?? ["defi"];
  }

  /** Get current candidates */
  getCandidates(): DiscoveryCandidate[] {
    return this.candidates;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VERIFICATION PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The VerificationPipeline takes discovery candidates and runs them through
 * the verification stages. Only fully verified candidates become canonical.
 *
 * DISCOVERED → NORMALIZED → IDENTITY_RESOLVED → VERIFIED
 * → REGISTERED → DATA_SOURCE_ATTACHED → HEALTH_CHECKED → AVAILABLE
 */
export class VerificationPipeline {
  private canonicalProjects: Map<string, EcosystemProject>;
  private resolver = entityResolver;

  constructor(projects: EcosystemProject[] = CANONICAL_PROJECTS) {
    this.canonicalProjects = new Map(projects.map((p) => [p.id, p]));
  }

  /**
   * Process a batch of candidates through the pipeline.
   * Returns:
   * - newProjects: candidates that became canonical
   * - duplicates: candidates that resolved to existing projects
   * - rejected: candidates that failed verification
   */
  async process(candidates: DiscoveryCandidate[]): Promise<{
    newProjects: EcosystemProject[];
    duplicates: { candidate: DiscoveryCandidate; existingProject: EcosystemProject }[];
    rejected: { candidate: DiscoveryCandidate; reason: string }[];
  }> {
    const newProjects: EcosystemProject[] = [];
    const duplicates: { candidate: DiscoveryCandidate; existingProject: EcosystemProject }[] = [];
    const rejected: { candidate: DiscoveryCandidate; reason: string }[] = [];

    for (const candidate of candidates) {
      const result = this.processSingle(candidate);
      if (result.type === "new") {
        newProjects.push(result.project);
      } else if (result.type === "duplicate") {
        duplicates.push({ candidate, existingProject: result.existingProject });
      } else {
        rejected.push({ candidate, reason: result.reason });
      }
    }

    return { newProjects, duplicates, rejected };
  }

  /**
   * Process a single candidate through the pipeline.
   */
  private processSingle(candidate: DiscoveryCandidate):
    | { type: "new"; project: EcosystemProject }
    | { type: "duplicate"; existingProject: EcosystemProject }
    | { type: "rejected"; reason: string } {

    // Stage 1: NORMALIZED — name and identity normalized
    const normalizedName = candidate.name.trim();
    if (!normalizedName || normalizedName.length < 2) {
      return { type: "rejected", reason: "name too short" };
    }

    // Stage 2: IDENTITY_RESOLVED — check if this is a duplicate
    const existing = this.resolver.detectDuplicate({
      name: normalizedName,
      website: candidate.website,
      tokenMint: candidate.tokenMint,
      tokenSymbol: candidate.tokenSymbol,
    });
    if (existing) {
      // Mark candidate as resolved to existing project
      candidate.resolvedToProjectId = existing.id;
      return { type: "duplicate", existingProject: existing };
    }

    // Stage 3: VERIFIED — basic verification
    // For now, candidates from DeFiLlama with confidence >= 0.8 are auto-verified
    // In production, this would cross-reference website, docs, GitHub
    if (candidate.discoveryConfidence < 0.5) {
      return { type: "rejected", reason: "discovery confidence too low" };
    }

    // Stage 4: REGISTERED — create canonical project
    const id = candidate.defiLlamaSlug || normalizedName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const now = new Date().toISOString();

    const project: EcosystemProject = {
      id,
      name: normalizedName,
      slug: id,
      categories: candidate.suggestedCategories,
      chain: "solana",
      description: candidate.description,
      website: candidate.website,
      status: "active",
      verificationStage: "verified" as VerificationStage,
      dataSources: [],
      token: candidate.tokenSymbol ? {
        symbol: candidate.tokenSymbol,
        name: normalizedName,
        mintAddress: candidate.tokenMint,
        coingeckoId: candidate.coingeckoId,
      } : undefined,
      discoveredAt: candidate.discoveredAt,
      lastVerifiedAt: now,
      lastUpdated: now,
    };

    return { type: "new", project };
  }

  /** Get all canonical projects (existing + newly verified) */
  getAllCanonical(): EcosystemProject[] {
    return Array.from(this.canonicalProjects.values());
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. NEWS ↔ ECOSYSTEM ENTITY LINKING
// ─────────────────────────────────────────────────────────────────────────────

import type { NewsEntityLink } from "./ecosystem-types.js";

/**
 * Links news articles to canonical ecosystem entities.
 * Replaces simple `category: "defi"` with explicit project references.
 */
export class NewsEntityLinker {
  private resolver = entityResolver;

  /**
   * Link a news article to ecosystem entities by analyzing its title and summary.
   * Returns one link per matched project.
   */
  linkArticle(article: { id: string; title: string; summary: string }): NewsEntityLink[] {
    const text = `${article.title} ${article.summary}`;
    const links: NewsEntityLink[] = [];
    const matched = new Set<string>(); // track matched project IDs

    // Try to find project names in the text
    for (const project of this.resolver.getAllProjects()) {
      // Check project name
      const nameVariants = [project.name, ...(project.aliases || [])];
      for (const variant of nameVariants) {
        if (variant.length < 3) continue; // skip very short names
        const regex = new RegExp(`\\b${this.escapeRegex(variant)}\\b`, "i");
        if (regex.test(text)) {
          if (matched.has(project.id)) break;
          matched.add(project.id);
          links.push({
            articleId: article.id,
            projectId: project.id,
            projectName: project.name,
            categories: project.categories,
            matchConfidence: variant === project.name ? 0.95 : 0.85,
            matchMethod: variant === project.name ? "exact" : "alias",
          });
          break;
        }
      }
    }

    // Also check token symbols (longer than 3 chars to avoid false positives)
    for (const project of this.resolver.getAllProjects()) {
      if (matched.has(project.id)) continue;
      if (project.token?.symbol && project.token.symbol.length >= 4) {
        const regex = new RegExp(`\\b${this.escapeRegex(project.token.symbol)}\\b`, "i");
        if (regex.test(text)) {
          matched.add(project.id);
          links.push({
            articleId: article.id,
            projectId: project.id,
            projectName: project.name,
            categories: project.categories,
            matchConfidence: 0.7,
            matchMethod: "alias",
          });
        }
      }
    }

    return links.sort((a, b) => b.matchConfidence - a.matchConfidence);
  }

  /**
   * Link multiple articles at once.
   */
  linkArticles(articles: { id: string; title: string; summary: string }[]): {
    articleId: string;
    links: NewsEntityLink[];
  }[] {
    return articles.map((a) => ({
      articleId: a.id,
      links: this.linkArticle(a),
    }));
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GLOBAL INSTANCES
// ─────────────────────────────────────────────────────────────────────────────

export const discoveryEngine = new DiscoveryEngine();
export const verificationPipeline = new VerificationPipeline();
export const newsEntityLinker = new NewsEntityLinker();
