/**
 * ════════════════════════════════════════════════════════════════════════════
 * ENTITY RESOLUTION & ALIAS SYSTEM
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Resolves different names/aliases/tickers to a single canonical entity.
 * e.g. "Jupiter" / "Jupiter Exchange" / "JUP" → canonical project "jupiter"
 *
 * Resolution strategies (in priority order):
 * 1. Exact ID match (highest confidence)
 * 2. Exact slug match
 * 3. Mint address match (for tokens — primary identifier)
 * 4. Alias match (name, ticker, domain, twitter, github)
 * 5. Normalized name fuzzy match
 *
 * Also handles:
 * - Duplicate detection (same project registered twice)
 * - Rebrand detection (old name → new canonical)
 * - Deactivation tracking (project status changes)
 * ════════════════════════════════════════════════════════════════════════════
 */
import type { EcosystemProject, EntityAlias } from "./ecosystem-types.js";
import { normalizeName } from "./ecosystem-types.js";
import { CANONICAL_PROJECTS } from "./ecosystem-registry.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ALIAS INDEX — built from canonical registry
// ─────────────────────────────────────────────────────────────────────────────

interface AliasEntry {
  alias: string; // normalized
  original: string; // original alias text
  canonicalId: string;
  type: EntityAlias["type"];
  confidence: number; // 1.0 for exact, lower for fuzzy
}

/**
 * The EntityResolver maintains an index of all aliases → canonical projects.
 * It is built from the CANONICAL_PROJECTS registry at startup and can be
 * extended at runtime when new projects are verified.
 */
export class EntityResolver {
  private projects = new Map<string, EcosystemProject>();
  private aliases = new Map<string, AliasEntry[]>();
  private mintIndex = new Map<string, string>(); // mint address → project ID

  /** Build the index from a list of canonical projects */
  build(projects: EcosystemProject[]): void {
    this.projects.clear();
    this.aliases.clear();
    this.mintIndex.clear();

    for (const p of projects) {
      this.addProject(p);
    }
  }

  /** Add a single project to the index */
  addProject(p: EcosystemProject): void {
    this.projects.set(p.id, p);

    // Index by slug
    this.addAlias(p.slug, p.slug, p.id, "slug", 1.0);

    // Index by name
    this.addAlias(p.name, p.name, p.id, "name", 1.0);

    // Index by token mint (highest priority for tokens)
    if (p.token?.mintAddress) {
      this.mintIndex.set(p.token.mintAddress, p.id);
      this.addAlias(p.token.mintAddress, p.token.mintAddress, p.id, "name", 1.0);
    }

    // Index by token symbol
    if (p.token?.symbol) {
      this.addAlias(p.token.symbol, p.token.symbol, p.id, "ticker", 0.9);
    }

    // Index by website domain
    if (p.website) {
      const domain = this.extractDomain(p.website);
      if (domain) this.addAlias(domain, domain, p.id, "domain", 0.85);
    }

    // Index by Twitter handle
    if (p.twitter) {
      const handle = this.extractTwitterHandle(p.twitter);
      if (handle) this.addAlias(handle, handle, p.id, "twitter", 0.85);
    }

    // Index by GitHub org
    if (p.github) {
      const org = this.extractGithubOrg(p.github);
      if (org) this.addAlias(org, org, p.id, "github", 0.85);
    }

    // Index all explicit aliases
    if (p.aliases) {
      for (const a of p.aliases) {
        this.addAlias(a, a, p.id, "name", 0.95);
      }
    }
  }

  /** Add an alias to the index */
  private addAlias(
    original: string,
    alias: string,
    canonicalId: string,
    type: EntityAlias["type"],
    confidence: number,
  ): void {
    const normalized = normalizeName(alias);
    if (!normalized) return;
    const entry: AliasEntry = { alias: normalized, original, canonicalId, type, confidence };
    const existing = this.aliases.get(normalized) ?? [];
    // Avoid duplicate entries for the same canonical ID
    if (!existing.some((e) => e.canonicalId === canonicalId)) {
      existing.push(entry);
      this.aliases.set(normalized, existing);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. RESOLUTION METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /** Resolve by exact ID */
  resolveById(id: string): EcosystemProject | undefined {
    return this.projects.get(id);
  }

  /** Resolve by mint address (primary token identifier) */
  resolveByMint(mintAddress: string): EcosystemProject | undefined {
    const id = this.mintIndex.get(mintAddress);
    if (id) return this.projects.get(id);
    // Try case-insensitive
    for (const [mint, pid] of Array.from(this.mintIndex.entries())) {
      if (mint.toLowerCase() === mintAddress.toLowerCase()) {
        return this.projects.get(pid);
      }
    }
    return undefined;
  }

  /**
   * Resolve a name/ticker/alias to a canonical project.
   * Tries exact match first, then fuzzy.
   *
   * @returns the resolved project and match confidence, or null
   */
  resolve(query: string): {
    project: EcosystemProject;
    confidence: number;
    matchMethod: "exact_id" | "exact_slug" | "exact_name" | "mint" | "alias" | "fuzzy";
  } | null {
    if (!query || !query.trim()) return null;

    // 1. Exact ID match
    const byId = this.projects.get(query);
    if (byId) return { project: byId, confidence: 1.0, matchMethod: "exact_id" };

    // 2. Mint address match
    const byMint = this.resolveByMint(query);
    if (byMint) return { project: byMint, confidence: 1.0, matchMethod: "mint" };

    // 3. Exact alias match (slug, name, ticker, domain, twitter, github)
    const normalized = normalizeName(query);
    const entries = this.aliases.get(normalized);
    if (entries && entries.length > 0) {
      // Pick highest confidence entry
      const best = entries.sort((a, b) => b.confidence - a.confidence)[0];
      const project = this.projects.get(best.canonicalId);
      if (project) {
        const method =
          best.type === "slug" ? "exact_slug" :
          best.type === "name" ? "exact_name" :
          best.type === "ticker" ? "alias" :
          "alias";
        return { project, confidence: best.confidence, matchMethod: method };
      }
    }

    // 4. Fuzzy match — normalized name similarity
    const fuzzy = this.fuzzyResolve(normalized);
    if (fuzzy) return { ...fuzzy, matchMethod: "fuzzy" };

    return null;
  }

  /**
   * Fuzzy resolution using normalized name similarity.
   * Uses a simple containment + length-distance heuristic.
   */
  private fuzzyResolve(normalized: string): { project: EcosystemProject; confidence: number } | null {
    if (!normalized || normalized.length < 2) return null;

    let bestMatch: { project: EcosystemProject; confidence: number } | null = null;

    for (const project of Array.from(this.projects.values())) {
      const projNorm = normalizeName(project.name);
      if (!projNorm) continue;

      // Containment check (one is substring of the other)
      if (projNorm.includes(normalized) || normalized.includes(projNorm)) {
        const lenDiff = Math.abs(projNorm.length - normalized.length);
        const confidence = Math.max(0.5, 1.0 - lenDiff * 0.05);
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { project, confidence };
        }
      }

      // Check aliases for fuzzy match
      if (project.aliases) {
        for (const alias of project.aliases) {
          const aliasNorm = normalizeName(alias);
          if (aliasNorm === normalized) {
            if (!bestMatch || 0.95 > bestMatch.confidence) {
              bestMatch = { project, confidence: 0.95 };
            }
          }
        }
      }
    }

    // Only return if confidence is above threshold
    return bestMatch && bestMatch.confidence >= 0.5 ? bestMatch : null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. DUPLICATE DETECTION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Check if a candidate project is a duplicate of an existing canonical project.
   * Returns the existing project if a duplicate is found.
   */
  detectDuplicate(candidate: {
    name: string;
    website?: string;
    tokenMint?: string;
    tokenSymbol?: string;
    github?: string;
    twitter?: string;
  }): EcosystemProject | null {
    // Mint address is the strongest duplicate signal
    if (candidate.tokenMint) {
      const existing = this.resolveByMint(candidate.tokenMint);
      if (existing) return existing;
    }

    // Name resolution
    const resolved = this.resolve(candidate.name);
    if (resolved && resolved.confidence >= 0.9) return resolved.project;

    // Website domain match
    if (candidate.website) {
      const domain = this.extractDomain(candidate.website);
      if (domain) {
        const norm = normalizeName(domain);
        const entries = this.aliases.get(norm);
        if (entries && entries.length > 0) {
          return this.projects.get(entries[0].canonicalId) ?? null;
        }
      }
    }

    // Twitter handle match
    if (candidate.twitter) {
      const handle = this.extractTwitterHandle(candidate.twitter);
      if (handle) {
        const norm = normalizeName(handle);
        const entries = this.aliases.get(norm);
        if (entries && entries.length > 0) {
          return this.projects.get(entries[0].canonicalId) ?? null;
        }
      }
    }

    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. UTILITY METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /** Get all canonical projects */
  getAllProjects(): EcosystemProject[] {
    return Array.from(this.projects.values());
  }

  /** Get projects by category */
  getByCategory(category: string): EcosystemProject[] {
    return this.getAllProjects().filter((p) => p.categories.includes(category as any));
  }

  /** Extract domain from URL */
  private extractDomain(url: string): string {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  /** Extract Twitter handle from URL */
  private extractTwitterHandle(url: string): string {
    const match = url.match(/twitter\.com\/(\w+)/) || url.match(/x\.com\/(\w+)/);
    return match ? match[1] : "";
  }

  /** Extract GitHub org from URL */
  private extractGithubOrg(url: string): string {
    const match = url.match(/github\.com\/([^/]+)/);
    return match ? match[1] : "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. GLOBAL RESOLVER INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

/** Singleton entity resolver — built from canonical registry at startup */
export const entityResolver = new EntityResolver();

// Build index from canonical projects
entityResolver.build(CANONICAL_PROJECTS);
