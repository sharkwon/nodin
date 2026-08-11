/**
 * SMOKE TEST v2 — Full ecosystem verification with new connectors
 * Run: npx tsx src/__tests__/smoke-test-v2.ts
 */
import { registerAllConnectors } from "../lib/connectors/index.js";
import { sourceRegistry, sourceMapper } from "../lib/source-registry.js";
import { healthMonitor } from "../lib/health-monitor.js";
import { CANONICAL_PROJECTS } from "../lib/ecosystem-registry.js";
import { coverageEngine } from "../lib/coverage-engine.js";
import { fetchProjectMetric } from "../lib/data-pipeline.js";
import { expectedCapabilitiesForProject, categoryCapabilityBreakdown } from "../lib/category-contracts.js";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ECOSYSTEM SMOKE TEST v2 — Full Connector Verification");
  console.log("═══════════════════════════════════════════════════════════════\n");

  registerAllConnectors();
  const connectors = sourceRegistry.getAll();
  console.log(`Registered connectors: ${connectors.length}`);
  connectors.forEach((c) => {
    console.log(`  - ${c.sourceId} (${c.provider}) — caps: [${c.capabilities.join(", ")}]`);
  });
  console.log();

  // Health checks
  console.log("Running health checks...\n");
  await healthMonitor.runHealthCheck();

  console.log("── HEALTH STATUS ──");
  let healthy = 0, degraded = 0, unavailable = 0, unknown = 0;
  connectors.forEach((c) => {
    const status = sourceRegistry.getStatus(c.sourceId);
    const confidence = sourceRegistry.getConfidence(c.sourceId);
    const health = sourceRegistry.getHealthSummary(c.sourceId);
    console.log(`  ${c.sourceId}: ${status} (confidence: ${confidence})`);
    if (health && health.consecutiveFailures > 0) console.log(`    consecutiveFailures: ${health.consecutiveFailures}`);
    const lastCheck = health?.history?.[health.history.length - 1];
    if (lastCheck?.error) console.log(`    error: ${lastCheck.error}`);
    if (status === "healthy") healthy++;
    else if (status === "degraded" || status === "rate_limited") degraded++;
    else if (status === "unavailable") unavailable++;
    else unknown++;
  });
  console.log(`\n  Summary: ${healthy} healthy, ${degraded} degraded, ${unavailable} unavailable, ${unknown} unknown`);
  console.log();

  // Orphaned source IDs check
  console.log("── ORPHANED SOURCE IDs ──");
  const allSourceIds = new Set<string>();
  for (const p of CANONICAL_PROJECTS) {
    for (const ds of p.dataSources) allSourceIds.add(ds.id);
  }
  let orphaned = 0;
  let resolved = 0;
  for (const sid of allSourceIds) {
    const r = sourceMapper.resolve(sid);
    if (r) {
      resolved++;
    } else {
      orphaned++;
      console.log(`  ❌ ${sid} → NOT RESOLVED`);
    }
  }
  console.log(`\n  Resolved: ${resolved}/${allSourceIds.size}, Orphaned: ${orphaned}`);
  console.log();

  // Real fetch attempts — representative projects
  console.log("── REAL FETCH ATTEMPTS ──");
  const testProjects = [
    // DEX
    { id: "jupiter", name: "Jupiter", caps: ["tvl", "volume"] },
    { id: "raydium", name: "Raydium", caps: ["tvl"] },
    { id: "orca", name: "Orca", caps: ["tvl"] },
    // Oracle
    { id: "pyth-network", name: "Pyth Network", caps: ["price_feeds"] },
    { id: "switchboard", name: "Switchboard", caps: ["price_feeds"] },
    { id: "chainlink-solana", name: "Chainlink", caps: ["price_feeds"] },
    { id: "dia", name: "DIA", caps: ["price_feeds"] },
    // NFT
    { id: "magic-eden", name: "Magic Eden", caps: ["collections"] },
    { id: "tensor", name: "Tensor", caps: ["collections"] },
    { id: "hyperspace", name: "Hyperspace", caps: ["collections"] },
    { id: "solanart", name: "Solanart", caps: ["collections"] },
    // Token (CoinGecko)
    { id: "bonk", name: "BONK", caps: ["price"] },
    { id: "dogwifhat", name: "WIF", caps: ["price"] },
    { id: "popcat", name: "POPCAT", caps: ["price"] },
    // Infrastructure
    { id: "helius", name: "Helius", caps: ["rpc"] },
  ];

  let fetchSuccess = 0, fetchFail = 0, fetchSkip = 0;
  for (const tp of testProjects) {
    const project = CANONICAL_PROJECTS.find((p) => p.id === tp.id);
    if (!project) {
      console.log(`  ${tp.name}: PROJECT NOT FOUND`);
      fetchSkip++;
      continue;
    }
    console.log(`  ${tp.name} (${tp.id}):`);
    console.log(`    dataSources: ${project.dataSources.map((d) => d.id).join(", ")}`);

    for (const ds of project.dataSources) {
      const resolved = sourceMapper.resolve(ds.id);
      console.log(`    ${ds.id} → ${resolved ? resolved.connector.sourceId : "NOT RESOLVED"}`);
    }

    const cap = tp.caps[0];
    const result = await fetchProjectMetric(tp.id, cap);
    if (result && result.value !== null) {
      console.log(`    FETCH ${cap}: ✅`);
      console.log(`      value: ${JSON.stringify(result.value).slice(0, 120)}`);
      console.log(`      source: ${result.source} (${result.sourceLabel})`);
      console.log(`      status: ${result.status}, confidence: ${result.confidence}`);
      fetchSuccess++;
    } else {
      console.log(`    FETCH ${cap}: ❌ null`);
      fetchFail++;
    }
  }
  console.log(`\n  Fetch results: ${fetchSuccess} success, ${fetchFail} null, ${fetchSkip} skip`);
  console.log();

  // Separated coverage
  console.log("── SEPARATED COVERAGE ──");
  const sep = coverageEngine.separatedCoverage();
  console.log(`  Registry coverage: ${(sep.registryCoverage * 100).toFixed(1)}%`);
  console.log(`  Source coverage: ${(sep.sourceCoverage * 100).toFixed(1)}%`);
  console.log(`  Live data coverage: ${(sep.liveDataCoverage * 100).toFixed(1)}%`);
  console.log(`  Completeness: ${(sep.completeness * 100).toFixed(1)}%`);
  console.log(`  Freshness: ${(sep.freshness * 100).toFixed(1)}%`);
  console.log(`  Total projects: ${sep.totalProjects}`);
  console.log(`  With registered source: ${sep.projectsWithRegisteredSource}`);
  console.log(`  With live data: ${sep.projectsWithLiveData}`);
  console.log(`  Metadata only: ${sep.projectsMetadataOnly}`);
  console.log(`  No source: ${sep.projectsNoSource}`);
  console.log();

  // Token mints
  const mintCount = CANONICAL_PROJECTS.filter((p) => p.token?.mintAddress).length;
  console.log(`── ON-CHAIN IDENTIFIERS ──`);
  console.log(`  Projects with verified token mints: ${mintCount}`);
  console.log();

  // Category capability breakdown for key categories
  console.log("── CATEGORY CAPABILITY BREAKDOWN ──");
  const keyCategories = ["dex", "oracle", "nft_marketplace", "meme"];
  const sourceCapsByProject = new Map<string, string[]>();
  for (const p of CANONICAL_PROJECTS) {
    const caps = new Set<string>();
    for (const ds of p.dataSources) {
      if (sourceMapper.hasRegisteredSource(ds.id)) {
        for (const c of ds.capabilities) caps.add(c);
      }
    }
    sourceCapsByProject.set(p.id, Array.from(caps));
  }

  for (const cat of keyCategories) {
    const projects = CANONICAL_PROJECTS.filter((p) => p.categories.includes(cat as any));
    const projectIds = projects.map((p) => p.id);
    const breakdown = categoryCapabilityBreakdown(cat as any, projectIds, sourceCapsByProject);
    console.log(`  ${cat}:`);
    console.log(`    expected: [${breakdown.expectedCapabilities.join(", ")}]`);
    console.log(`    available: [${breakdown.availableCapabilities.join(", ")}]`);
    console.log(`    missing: [${breakdown.missingCapabilities.join(", ")}]`);
    console.log(`    completeness: ${(breakdown.completeness * 100).toFixed(1)}%`);
  }
  console.log();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  SMOKE TEST v2 COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch(console.error);
