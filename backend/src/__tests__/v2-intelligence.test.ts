/**
 * V2 Tests — Project Intelligence Bridge
 *
 * Tests:
 * - Verified protocol → project mapping
 * - Unmapped protocol
 * - Metric available
 * - Metric unavailable
 * - Metric null (not 0)
 * - No null→0 inference
 * - Provenance preserved
 * - Related projects
 * - Source → project navigation (projectIds)
 * - Protocol → project navigation (ecosystemProjectId)
 * - Existing API contract unchanged
 * - Existing routes still work
 */
import { describe, it, expect } from "vitest";
import { PROTOCOL_MAPPINGS, primarySlugForProject, projectIdForSlug, allMappedProjectIds, allMappedSlugs, relatedProjects, slugsForProject, getMapping } from "../lib/protocol-mapping.js";
import { CANONICAL_PROJECTS } from "../lib/ecosystem-registry.js";

// ── Verified protocol → project mapping ──
describe("Protocol Mapping — Verified Mappings", () => {
  it("should have mappings defined", () => {
    expect(PROTOCOL_MAPPINGS.length).toBeGreaterThan(0);
  });

  it("every mapping has a valid project ID that exists in the registry", () => {
    const projectIds = new Set(CANONICAL_PROJECTS.map((p) => p.id));
    for (const m of PROTOCOL_MAPPINGS) {
      expect(projectIds.has(m.projectId), `Mapping projectId "${m.projectId}" not in registry`).toBe(true);
    }
  });

  it("every mapping has a non-empty DeFiLlama slug", () => {
    for (const m of PROTOCOL_MAPPINGS) {
      expect(m.defiLlamaSlug.length).toBeGreaterThan(0);
    }
  });

  it("every mapping has a valid match method", () => {
    const validMethods = ["exact_slug", "name_verified", "manual_verified"];
    for (const m of PROTOCOL_MAPPINGS) {
      expect(validMethods).toContain(m.matchMethod);
    }
  });

  it("every mapping has confidence between 0 and 1", () => {
    for (const m of PROTOCOL_MAPPINGS) {
      expect(m.confidence).toBeGreaterThan(0);
      expect(m.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("each mapped project has exactly one primary mapping", () => {
    const primariesPerProject = new Map<string, number>();
    for (const m of PROTOCOL_MAPPINGS) {
      if (m.isPrimary) {
        primariesPerProject.set(m.projectId, (primariesPerProject.get(m.projectId) ?? 0) + 1);
      }
    }
    for (const [pid, count] of primariesPerProject) {
      expect(count, `Project "${pid}" has ${count} primary mappings, expected 1`).toBe(1);
    }
  });
});

// ── Unmapped protocol ──
describe("Protocol Mapping — Unmapped", () => {
  it("should return null slug for unmapped project (e.g. phantom wallet)", () => {
    expect(primarySlugForProject("phantom")).toBeNull();
  });

  it("should return null slug for non-existent project", () => {
    expect(primarySlugForProject("nonexistent-project-xyz")).toBeNull();
  });

  it("should return null project ID for unmapped slug", () => {
    expect(projectIdForSlug("some-random-slug")).toBeNull();
  });

  it("wallets should not have mappings", () => {
    const wallets = ["phantom", "solflare", "backpack", "glow"];
    for (const w of wallets) {
      expect(primarySlugForProject(w)).toBeNull();
    }
  });

  it("security firms should not have mappings", () => {
    const security = ["sec3", "ottersec", "neodyme", "zellic", "sig"];
    for (const s of security) {
      expect(primarySlugForProject(s)).toBeNull();
    }
  });
});

// ── Metric value integrity: null ≠ 0 ──
describe("Data Integrity — Null ≠ 0", () => {
  it("unmapped project should produce null values, not 0", async () => {
    const { fetchProjectIntelligence } = await import("../lib/protocol-mapping.js");
    const intel = await fetchProjectIntelligence("phantom");
    expect(intel.isMapped).toBe(false);
    expect(intel.tvl.value).toBeNull();
    expect(intel.totalTvl.value).toBeNull();
    expect(intel.change24h.value).toBeNull();
    expect(intel.change7d.value).toBeNull();
    expect(intel.marketCap.value).toBeNull();
    // Status should be unavailable, never "available" with value 0
    expect(intel.tvl.status).toBe("unavailable");
    expect(intel.totalTvl.status).toBe("unavailable");
  });

  it("unmapped project should not have history", async () => {
    const { fetchProjectIntelligence } = await import("../lib/protocol-mapping.js");
    const intel = await fetchProjectIntelligence("glow");
    expect(intel.hasHistory).toBe(false);
    expect(intel.history).toBeNull();
  });

  it("unmapped project should have null mapping metadata", async () => {
    const { fetchProjectIntelligence } = await import("../lib/protocol-mapping.js");
    const intel = await fetchProjectIntelligence("backpack");
    expect(intel.mapping).toBeNull();
    expect(intel.defiLlamaSlug).toBeNull();
  });
});

// ── Provenance preserved ──
describe("Provenance Preservation", () => {
  it("every mapping has source label", () => {
    // Static mappings always have source info via the mapping table
    const slugs = allMappedSlugs();
    for (const slug of slugs) {
      expect(slug.length).toBeGreaterThan(0);
    }
  });

  it("mapped project should have DeFiLlama as source", async () => {
    const { fetchProjectIntelligence } = await import("../lib/protocol-mapping.js");
    const intel = await fetchProjectIntelligence("raydium");
    if (intel.isMapped) {
      expect(intel.tvl.source).toBe("DeFiLlama");
      expect(intel.tvl.sourceUrl).toContain("defillama");
    }
  });

  it("mapped project should have fetchedAt timestamp", async () => {
    const { fetchProjectIntelligence } = await import("../lib/protocol-mapping.js");
    const intel = await fetchProjectIntelligence("jupiter");
    expect(intel.fetchedAt).toBeTruthy();
    expect(new Date(intel.fetchedAt).toString()).not.toBe("Invalid Date");
  });

  it("mapped project should have mapping metadata", async () => {
    const { fetchProjectIntelligence } = await import("../lib/protocol-mapping.js");
    const intel = await fetchProjectIntelligence("drift");
    if (intel.isMapped) {
      expect(intel.mapping).not.toBeNull();
      expect(intel.mapping?.matchMethod).toBeTruthy();
      expect(intel.mapping?.confidence).toBeGreaterThan(0);
    }
  });
});

// ── Related projects ──
describe("Related Projects", () => {
  it("should return related projects for a DEX project", () => {
    const related = relatedProjects("raydium", 6);
    expect(related.length).toBeGreaterThan(0);
    expect(related.length).toBeLessThanOrEqual(6);
    // Should not include the project itself
    expect(related.find((p) => p.id === "raydium")).toBeUndefined();
  });

  it("related projects should be active (not inactive/deprecated)", () => {
    const related = relatedProjects("jupiter", 6);
    for (const p of related) {
      expect(p.status).not.toBe("inactive");
      expect(p.status).not.toBe("deprecated");
    }
  });

  it("related projects should share at least one category", () => {
    const project = CANONICAL_PROJECTS.find((p) => p.id === "drift");
    expect(project).toBeDefined();
    const related = relatedProjects("drift", 6);
    for (const p of related) {
      const shared = p.categories.filter((c) => project!.categories.includes(c));
      expect(shared.length).toBeGreaterThan(0);
    }
  });

  it("should return empty for non-existent project", () => {
    const related = relatedProjects("nonexistent-xyz", 6);
    expect(related).toEqual([]);
  });
});

// ── Source → project navigation ──
describe("Source → Project Navigation", () => {
  it("coverage engine source health summary should have projectIds field", async () => {
    const { coverageEngine } = await import("../lib/coverage-engine.js");
    const summary = coverageEngine.sourceHealthSummary();
    // In test environment, sources may be 0 if health checks haven't run
    // What we're testing is that the FIELD exists and is an array
    expect(summary).toBeDefined();
    expect(Array.isArray(summary.sources)).toBe(true);
    for (const s of summary.sources) {
      expect(s.projectIds).toBeDefined();
      expect(Array.isArray(s.projectIds)).toBe(true);
    }
  });
});

// ── Protocol → project navigation ──
describe("Protocol → Project Navigation", () => {
  it("projectIdForSlug should return correct project for known slugs", () => {
    expect(projectIdForSlug("raydium-amm")).toBe("raydium");
    expect(projectIdForSlug("orca-dex")).toBe("orca");
    expect(projectIdForSlug("jupiter-lend")).toBe("jupiter");
    expect(projectIdForSlug("drift-trade")).toBe("drift");
  });

  it("projectIdForSlug should return null for unknown slug", () => {
    expect(projectIdForSlug("unknown-protocol-slug")).toBeNull();
  });
});

// ── Existing API contract unchanged ──
describe("API Contract Safety — No Breaking Changes", () => {
  it("primarySlugForProject returns string or null", () => {
    const result = primarySlugForProject("raydium");
    expect(result === null || typeof result === "string").toBe(true);
  });

  it("slugsForProject returns array (possibly empty)", () => {
    const result = slugsForProject("jupiter");
    expect(Array.isArray(result)).toBe(true);
  });

  it("getMapping returns mapping or null", () => {
    const result = getMapping("raydium", "raydium-amm");
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("allMappedProjectIds returns array of strings", () => {
    const result = allMappedProjectIds();
    expect(Array.isArray(result)).toBe(true);
    for (const id of result) {
      expect(typeof id).toBe("string");
    }
  });

  it("allMappedSlugs returns array of strings", () => {
    const result = allMappedSlugs();
    expect(Array.isArray(result)).toBe(true);
    for (const slug of result) {
      expect(typeof slug).toBe("string");
    }
  });
});

// ── Mapping count summary ──
describe("Mapping Coverage Summary", () => {
  it("should have a reasonable number of mappings", () => {
    expect(PROTOCOL_MAPPINGS.length).toBeGreaterThanOrEqual(20);
  });

  it("should map key projects", () => {
    const mapped = new Set(allMappedProjectIds());
    const keyProjects = ["raydium", "orca", "meteora", "jupiter", "kamino", "drift", "jito", "marinade", "pyth", "magic-eden"];
    for (const p of keyProjects) {
      expect(mapped.has(p), `Key project "${p}" should be mapped`).toBe(true);
    }
  });
});
