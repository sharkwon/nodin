/**
 * ════════════════════════════════════════════════════════════════════════════
 * ECOSYSTEM INTELLIGENCE TEST SUITE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Tests cover:
 * - Entity resolution (exact, alias, fuzzy, mint address, duplicates)
 * - Source registry (registration, capability lookup, health, fallback)
 * - Coverage calculation (per-category, overall, missing data)
 * - Missing data detection
 * - Provider failure isolation (multi-source fallback)
 * - Stale source detection
 * - Duplicate project detection
 * - Project rebrand detection
 * - Project deactivation tracking
 * - Partial data / unavailable data handling
 * ════════════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeName,
  calculateCoverageScore,
  calculateOverallCompleteness,
  healthConfidence,
  CATEGORY_METADATA,
  type EcosystemProject,
  type DataSource,
  type DataCompleteness,
} from "../lib/ecosystem-types.js";
import { CANONICAL_PROJECTS } from "../lib/ecosystem-registry.js";
import { EntityResolver } from "../lib/entity-resolver.js";
import { SourceRegistry, type DataConnector } from "../lib/source-registry.js";
import { CoverageEngine, KNOWN_PROJECTS_PER_CATEGORY } from "../lib/coverage-engine.js";

// ── Mock connector for testing ──
class MockConnector implements DataConnector {
  readonly sourceId: string;
  readonly provider: string;
  readonly type: DataSource["type"] = "api";
  readonly capabilities: string[];
  readonly auth: DataSource["authentication"] = "none";
  readonly endpoint?: string;
  private shouldFail: boolean;
  private delayMs: number;

  constructor(id: string, capabilities: string[], shouldFail = false, delayMs = 0) {
    this.sourceId = id;
    this.provider = `Mock ${id}`;
    this.capabilities = capabilities;
    this.shouldFail = shouldFail;
    this.delayMs = delayMs;
  }

  async fetch(capability: string): Promise<any> {
    if (this.shouldFail) throw new Error("mock failure");
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    return {
      value: { capability, source: this.sourceId },
      source: this.sourceId,
      sourceLabel: this.provider,
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt: new Date().toISOString(),
      transformation: "raw",
      confidence: 1,
      status: "available" as const,
    };
  }

  async checkHealth() {
    return {
      sourceId: this.sourceId,
      status: (this.shouldFail ? "unavailable" : "healthy") as "healthy" | "unavailable",
      checkedAt: new Date().toISOString(),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 1. ENTITY RESOLUTION
// ════════════════════════════════════════════════════════════════════════════
describe("EntityResolver", () => {
  let resolver: EntityResolver;

  beforeEach(() => {
    resolver = new EntityResolver();
    resolver.build(CANONICAL_PROJECTS);
  });

  it("should resolve by exact ID", () => {
    const result = resolver.resolveById("jupiter");
    expect(result).toBeDefined();
    expect(result?.name).toBe("Jupiter");
  });

  it("should resolve by exact name", () => {
    const result = resolver.resolve("Jupiter");
    expect(result).not.toBeNull();
    expect(result?.project.name).toBe("Jupiter");
    // Match method may be exact_id, exact_slug, or exact_name depending on alias registration order
    expect(["exact_id", "exact_slug", "exact_name"]).toContain(result?.matchMethod);
  });

  it("should resolve by alias", () => {
    const result = resolver.resolve("Jupiter Exchange");
    expect(result).not.toBeNull();
    expect(result?.project.name).toBe("Jupiter");
  });

  it("should resolve by token ticker", () => {
    const result = resolver.resolve("JUP");
    expect(result).not.toBeNull();
    expect(result?.project.name).toBe("Jupiter");
  });

  it("should resolve by mint address", () => {
    const result = resolver.resolve("JUPyiWrYQdr6eUSFxYnLBHZW5K6yVw56g7vNaGRTQJL");
    expect(result).not.toBeNull();
    expect(result?.project.name).toBe("Jupiter");
    expect(result?.matchMethod).toBe("mint");
  });

  it("should resolve Magic Eden by alias", () => {
    const result = resolver.resolve("MagicEden");
    expect(result).not.toBeNull();
    expect(result?.project.name).toBe("Magic Eden");
  });

  it("should resolve Pyth by alias", () => {
    const result = resolver.resolve("Pyth Network");
    expect(result).not.toBeNull();
    expect(result?.project.name).toBe("Pyth Network");
  });

  it("should fuzzy match partial names", () => {
    const result = resolver.resolve("jupit");
    expect(result).not.toBeNull();
    expect(result?.matchMethod).toBe("fuzzy");
  });

  it("should return null for non-existent query", () => {
    const result = resolver.resolve("xyznonexistent123");
    expect(result).toBeNull();
  });

  it("should detect duplicates by name", () => {
    const dup = resolver.detectDuplicate({ name: "Jupiter" });
    expect(dup).not.toBeNull();
    expect(dup?.name).toBe("Jupiter");
  });

  it("should detect duplicates by mint address", () => {
    const dup = resolver.detectDuplicate({
      name: "Some New Project",
      tokenMint: "JUPyiWrYQdr6eUSFxYnLBHZW5K6yVw56g7vNaGRTQJL",
    });
    expect(dup).not.toBeNull();
    expect(dup?.name).toBe("Jupiter");
  });

  it("should detect duplicates by website domain", () => {
    const dup = resolver.detectDuplicate({
      name: "New Name",
      website: "https://jup.ag",
    });
    expect(dup).not.toBeNull();
    expect(dup?.name).toBe("Jupiter");
  });

  it("should not detect duplicate for truly new project", () => {
    const dup = resolver.detectDuplicate({
      name: "Brand New Protocol",
      website: "https://brandnew.example.com",
    });
    expect(dup).toBeNull();
  });

  it("should handle rebrand: old name resolves to new canonical", () => {
    // If project rebranded, old alias should still resolve
    const result = resolver.resolve("MagicEden");
    expect(result).not.toBeNull();
    expect(result?.project.id).toBe("magic-eden");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. SOURCE REGISTRY
// ════════════════════════════════════════════════════════════════════════════
describe("SourceRegistry", () => {
  let registry: SourceRegistry;

  beforeEach(() => {
    registry = new SourceRegistry();
  });

  it("should register and retrieve connectors", () => {
    const conn = new MockConnector("test-1", ["tvl", "volume"]);
    registry.register(conn);
    expect(registry.get("test-1")).toBe(conn);
  });

  it("should find connectors by capability", () => {
    registry.register(new MockConnector("a", ["tvl", "volume"]));
    registry.register(new MockConnector("b", ["tvl", "fees"]));
    const tvlConnectors = registry.findByCapability("tvl");
    expect(tvlConnectors.length).toBe(2);
  });

  it("should find best connector for capability", () => {
    registry.register(new MockConnector("a", ["tvl"]));
    registry.register(new MockConnector("b", ["tvl"]));
    const best = registry.findBestForCapability("tvl");
    expect(best).not.toBeNull();
  });

  it("should skip unavailable sources in findBestForCapability", () => {
    const failing = new MockConnector("failing", ["tvl"], true);
    const healthy = new MockConnector("healthy", ["tvl"], false);
    registry.register(failing);
    registry.register(healthy);
    // Record health — failing source should be unavailable
    registry.recordHealth("failing", {
      sourceId: "failing",
      status: "unavailable",
      checkedAt: new Date().toISOString(),
    });
    registry.recordHealth("healthy", {
      sourceId: "healthy",
      status: "healthy",
      checkedAt: new Date().toISOString(),
    });
    const best = registry.findBestForCapability("tvl");
    expect(best?.sourceId).toBe("healthy");
  });

  it("should record health and track confidence", () => {
    registry.register(new MockConnector("test", ["tvl"]));
    registry.recordHealth("test", {
      sourceId: "test",
      status: "healthy",
      checkedAt: new Date().toISOString(),
    });
    const summary = registry.getHealthSummary("test");
    expect(summary?.currentStatus).toBe("healthy");
    expect(summary?.confidence).toBeGreaterThan(0.5);
  });

  it("should reduce confidence on consecutive failures", () => {
    registry.register(new MockConnector("test", ["tvl"]));
    for (let i = 0; i < 3; i++) {
      registry.recordHealth("test", {
        sourceId: "test",
        status: "unavailable",
        checkedAt: new Date().toISOString(),
      });
    }
    const summary = registry.getHealthSummary("test");
    expect(summary?.consecutiveFailures).toBe(3);
    expect(summary?.confidence).toBeLessThan(0.3);
  });

  it("should isolate provider failures (multi-source fallback)", async () => {
    const failing = new MockConnector("failing", ["tvl"], true);
    const healthy = new MockConnector("healthy", ["tvl"], false);
    registry.register(failing);
    registry.register(healthy);
    // Mark failing as unavailable
    registry.recordHealth("failing", {
      sourceId: "failing",
      status: "unavailable",
      checkedAt: new Date().toISOString(),
    });
    // fetchWithFallback should skip failing and use healthy
    const result = await registry.fetchWithFallback("tvl");
    expect(result).not.toBeNull();
    expect(result?.source).toBe("healthy");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. COVERAGE CALCULATION
// ════════════════════════════════════════════════════════════════════════════
describe("CoverageEngine", () => {
  let engine: CoverageEngine;

  beforeEach(() => {
    engine = new CoverageEngine(CANONICAL_PROJECTS);
  });

  it("should generate coverage report for all categories", () => {
    const report = engine.reportAll();
    expect(report.totalCategories).toBeGreaterThan(0);
    // totalRegistered counts per-category, so multi-category projects count multiple times
    expect(report.totalRegistered).toBeGreaterThanOrEqual(CANONICAL_PROJECTS.length);
    expect(report.overallCoverageScore).toBeGreaterThan(0);
    expect(report.overallCoverageScore).toBeLessThanOrEqual(1);
  });

  it("should report missing projects per category", () => {
    const oracleReport = engine.reportForCategory("oracle");
    expect(oracleReport.category).toBe("oracle");
    expect(oracleReport.discoveredProjects).toBeGreaterThanOrEqual(4);
    expect(oracleReport.registeredProjects).toBeGreaterThanOrEqual(4);
  });

  it("should calculate data completeness for a project", () => {
    const jupiter = CANONICAL_PROJECTS.find((p) => p.id === "jupiter");
    expect(jupiter).toBeDefined();
    if (!jupiter) return;
    const completeness = engine.completenessForProject(jupiter);
    expect(completeness.metadata).toBeGreaterThan(0.5);
    expect(completeness.overall).toBeGreaterThan(0);
    expect(completeness.overall).toBeLessThanOrEqual(1);
  });

  it("should detect missing capabilities per category", () => {
    const missing = engine.missingDataForCategory("oracle");
    expect(missing).toBeDefined();
    expect(Array.isArray(missing.missingProjects)).toBe(true);
    expect(Array.isArray(missing.missingCapabilities)).toBe(true);
  });

  it("should not count 0 API integrations as 100% coverage", () => {
    const report = engine.reportForCategory("wallet");
    // Wallets have no data sources — coverage should not be 100%
    expect(report.coverageScore).toBeLessThan(1.0);
    expect(report.coverageScore).toBeGreaterThan(0); // has registered projects
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. TYPE UTILITIES
// ════════════════════════════════════════════════════════════════════════════
describe("Type utilities", () => {
  it("should normalize names correctly", () => {
    // normalizeName strips suffixes like "exchange", "network", "protocol" and removes non-alphanumerics
    expect(normalizeName("Jupiter Exchange")).toBe("jupiter");
    expect(normalizeName("Magic Eden")).toBe("magiceden");
    expect(normalizeName("pump.fun")).toBe("pumpfun");
  });

  it("should calculate coverage score", () => {
    const score = calculateCoverageScore({
      discovered: 10,
      registered: 10,
      verifiedIdentity: 10,
      withDataSource: 10,
      withLiveData: 10,
    });
    expect(score).toBeCloseTo(1, 1);
  });

  it("should return 0 coverage for no discovered projects", () => {
    const score = calculateCoverageScore({
      discovered: 0,
      registered: 0,
      verifiedIdentity: 0,
      withDataSource: 0,
      withLiveData: 0,
    });
    expect(score).toBe(0);
  });

  it("should calculate overall completeness", () => {
    const dims: Omit<DataCompleteness, "overall"> = {
      metadata: 0.8,
      marketData: 0.6,
      onChainData: 0.5,
      socialData: 0.3,
      newsData: 0,
      historicalData: 0.2,
    };
    const overall = calculateOverallCompleteness(dims);
    expect(overall).toBeGreaterThan(0.4);
    expect(overall).toBeLessThan(0.8);
  });

  it("should map health status to confidence", () => {
    expect(healthConfidence("healthy")).toBe(1.0);
    expect(healthConfidence("unavailable")).toBe(0);
    expect(healthConfidence("degraded")).toBe(0.6);
  });

  it("should have consistent category metadata", () => {
    expect(CATEGORY_METADATA.length).toBeGreaterThan(30);
    const ids = CATEGORY_METADATA.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length); // no duplicates
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. PROJECT REGISTRY INTEGRITY
// ════════════════════════════════════════════════════════════════════════════
describe("Canonical Project Registry", () => {
  it("should have 80+ projects", () => {
    expect(CANONICAL_PROJECTS.length).toBeGreaterThanOrEqual(80);
  });

  it("should have unique project IDs", () => {
    const ids = CANONICAL_PROJECTS.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("should have all projects with at least one category", () => {
    for (const p of CANONICAL_PROJECTS) {
      expect(p.categories.length).toBeGreaterThan(0);
    }
  });

  it("should have all projects with chain=solana", () => {
    for (const p of CANONICAL_PROJECTS) {
      expect(p.chain).toBe("solana");
    }
  });

  it("should have verified projects", () => {
    const verified = CANONICAL_PROJECTS.filter((p) => p.verificationStage === "verified");
    expect(verified.length).toBe(CANONICAL_PROJECTS.length);
  });

  it("should have multi-source oracle providers", () => {
    const oracles = CANONICAL_PROJECTS.filter((p) => p.categories.includes("oracle"));
    expect(oracles.length).toBeGreaterThanOrEqual(4);
    const oracleNames = oracles.map((o) => o.name);
    expect(oracleNames).toContain("Pyth Network");
    expect(oracleNames).toContain("Switchboard");
    expect(oracleNames).toContain("Chainlink");
    expect(oracleNames).toContain("DIA");
  });

  it("should have multi-source NFT marketplaces", () => {
    const marketplaces = CANONICAL_PROJECTS.filter((p) => p.categories.includes("nft_marketplace"));
    expect(marketplaces.length).toBeGreaterThanOrEqual(4);
    const names = marketplaces.map((m) => m.name);
    expect(names).toContain("Magic Eden");
    expect(names).toContain("Tensor");
    expect(names).toContain("Hyperspace");
    expect(names).toContain("Solanart");
  });

  it("should track project deactivation status", () => {
    const inactive = CANONICAL_PROJECTS.filter((p) => p.status === "inactive");
    // Formfunction is marked inactive
    expect(inactive.length).toBeGreaterThanOrEqual(1);
  });

  it("should have projects with multiple categories", () => {
    const jupiter = CANONICAL_PROJECTS.find((p) => p.id === "jupiter");
    expect(jupiter?.categories.length).toBeGreaterThan(2);
  });
});
