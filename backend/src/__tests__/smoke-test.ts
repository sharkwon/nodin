/**
 * SMOKE TEST — real provider connectivity test
 * Run manually: npx tsx src/__tests__/smoke-test.ts
 * Tests actual API calls to providers that don't require credentials.
 * NOT part of the normal test suite (depends on external API availability).
 */
import { registerAllConnectors } from "../lib/connectors/index.js";
import { sourceRegistry } from "../lib/source-registry.js";
import { healthMonitor } from "../lib/health-monitor.js";
import { CANONICAL_PROJECTS } from "../lib/ecosystem-registry.js";
import { coverageEngine } from "../lib/coverage-engine.js";
import { fetchProjectMetric } from "../lib/data-pipeline.js";
import { sourceMapper } from "../lib/source-registry.js";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ECOSYSTEM SMOKE TEST — Real Provider Connectivity");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // 1. Register connectors
  registerAllConnectors();
  const connectors = sourceRegistry.getAll();
  console.log(`Registered connectors: ${connectors.length}`);
  connectors.forEach((c) => {
    console.log(`  - ${c.sourceId} (${c.provider}) — caps: [${c.capabilities.join(", ")}]`);
  });
  console.log();

  // 2. Run health checks
  console.log("Running health checks...");
  await healthMonitor.runHealthCheck();
  console.log();

  // 3. Report health status
  console.log("── HEALTH STATUS ──");
  connectors.forEach((c) => {
    const status = sourceRegistry.getStatus(c.sourceId);
    const health = sourceRegistry.getHealthSummary(c.sourceId);
    const confidence = sourceRegistry.getConfidence(c.sourceId);
    console.log(`  ${c.sourceId}:`);
    console.log(`    status: ${status}`);
    console.log(`    confidence: ${confidence}`);
    if (health?.lastCheckedAt) console.log(`    lastChecked: ${health.lastCheckedAt}`);
    if (health && health.consecutiveFailures > 0) console.log(`    consecutiveFailures: ${health.consecutiveFailures}`);
    const lastCheck = health?.history?.[health.history.length - 1];
    if (lastCheck?.error) console.log(`    error: ${lastCheck.error}`);
  });
  console.log();

  // 4. Try real fetches for key projects
  console.log("── REAL FETCH ATTEMPTS ──");
  const testProjects = [
    { id: "jupiter", name: "Jupiter", caps: ["tvl", "volume"] },
    { id: "raydium", name: "Raydium", caps: ["tvl"] },
    { id: "drift", name: "Drift", caps: ["tvl"] },
    { id: "pyth-network", name: "Pyth Network", caps: ["price_feeds"] },
    { id: "magic-eden", name: "Magic Eden", caps: ["collections"] },
    { id: "jito", name: "Jito", caps: ["tvl"] },
  ];

  for (const tp of testProjects) {
    const project = CANONICAL_PROJECTS.find((p) => p.id === tp.id);
    if (!project) {
      console.log(`  ${tp.name}: PROJECT NOT FOUND`);
      continue;
    }
    console.log(`  ${tp.name} (${tp.id}):`);
    console.log(`    dataSources: ${project.dataSources.map((d) => d.id).join(", ")}`);

    for (const ds of project.dataSources) {
      const resolved = sourceMapper.resolve(ds.id);
      console.log(`    ${ds.id} → resolved: ${resolved ? resolved.connector.sourceId : "NOT RESOLVED"}`);
    }

    // Try first capability
    const cap = tp.caps[0];
    const result = await fetchProjectMetric(tp.id, cap);
    if (result) {
      console.log(`    FETCH ${cap}: ✅`);
      console.log(`      value: ${JSON.stringify(result.value).slice(0, 120)}`);
      console.log(`      source: ${result.source}`);
      console.log(`      sourceLabel: ${result.sourceLabel}`);
      console.log(`      fetchedAt: ${result.fetchedAt}`);
      console.log(`      sourceUpdatedAt: ${result.sourceUpdatedAt}`);
      console.log(`      confidence: ${result.confidence}`);
      console.log(`      status: ${result.status}`);
    } else {
      console.log(`    FETCH ${cap}: ❌ null (no live source or fetch failed)`);
    }
  }
  console.log();

  // 5. Separated coverage
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

  // 6. Token mints
  const mintCount = CANONICAL_PROJECTS.filter((p) => p.token?.mintAddress).length;
  console.log(`── ON-CHAIN IDENTIFIERS ──`);
  console.log(`  Projects with verified token mints: ${mintCount}`);
  CANONICAL_PROJECTS.filter((p) => p.token?.mintAddress).forEach((p) => {
    console.log(`    ${p.name} (${p.token!.symbol}): ${p.token!.mintAddress}`);
  });
  console.log();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  SMOKE TEST COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch(console.error);
