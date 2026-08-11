/**
 * ════════════════════════════════════════════════════════════════════════════
 * DATA PIPELINE — operational fetch, fallback, provenance
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Orchestrates real data fetching for ecosystem projects.
 * Uses SourceMapper to resolve project source IDs to connectors,
 * executes fetches with fallback, and returns provenance-stamped results.
 *
 * This is the operational layer that makes the architecture live.
 * ════════════════════════════════════════════════════════════════════════════
 */
import { CANONICAL_PROJECTS } from "./ecosystem-registry.js";
import type { EcosystemProject, ProvenanceMetric } from "./ecosystem-types.js";
import { sourceRegistry, sourceMapper } from "./source-registry.js";
import { healthMonitor } from "./health-monitor.js";
import { registerAllConnectors } from "./connectors/index.js";
import { validateProvenanceMetric } from "./data-quality.js";

// Ensure connectors are registered
let initialized = false;
function ensureInit() {
  if (initialized) return;
  initialized = true;
  registerAllConnectors();
}

/**
 * Fetch a specific capability for a specific project.
 * Tries all of the project's data sources that can provide the capability,
 * with fallback between them.
 *
 * @returns ProvenanceMetric with the value, or null if all sources failed
 */
export async function fetchProjectMetric(
  projectId: string,
  capability: string,
  extraParams?: Record<string, string>,
): Promise<ProvenanceMetric<unknown> | null> {
  ensureInit();

  const project = CANONICAL_PROJECTS.find((p) => p.id === projectId);
  if (!project) return null;

  // Find all data sources for this project that have the requested capability
  // (or at least can be resolved to a connector)
  const resolvableSources = project.dataSources
    .map((ds) => ({ ds, resolved: sourceMapper.resolve(ds.id) }))
    .filter((r) => r.resolved !== null) as {
    ds: typeof project.dataSources[0];
    resolved: { connector: import("./source-registry.js").DataConnector; params: Record<string, string> };
  }[];

  // Try each source in order
  for (const { ds, resolved } of resolvableSources) {
    const status = sourceRegistry.getStatus(resolved.connector.sourceId);
    if (status === "unavailable") continue;

    const params = { ...resolved.params, ...extraParams };

    // Check if this connector actually has the capability
    if (!resolved.connector.capabilities.includes(capability)) continue;

    try {
      const result = await resolved.connector.fetch(capability, params);
      if (result && result.value !== null) {
        // Validate the fetched data
        const validation = validateProvenanceMetric(result, {
          fieldName: `${project.name}/${capability}`,
          allowNegative: false,
          allowZero: false,
        });

        // If validation fails with error severity, skip this result
        if (validation.severity === "error") {
          // Log but don't crash — try next source
          sourceRegistry.recordHealth(resolved.connector.sourceId, {
            sourceId: resolved.connector.sourceId,
            status: "degraded",
            checkedAt: new Date().toISOString(),
            error: `validation: ${validation.message}`,
          });
          continue;
        }

        // Record health on success
        sourceRegistry.recordHealth(resolved.connector.sourceId, {
          sourceId: resolved.connector.sourceId,
          status: "healthy",
          checkedAt: new Date().toISOString(),
        });
        return result;
      }
    } catch {
      sourceRegistry.recordHealth(resolved.connector.sourceId, {
        sourceId: resolved.connector.sourceId,
        status: "unavailable",
        checkedAt: new Date().toISOString(),
        error: `fetch ${capability} failed`,
      });
    }
  }

  // All project sources failed — try global fallback by capability
  const globalResult = await sourceRegistry.fetchWithFallback(capability, extraParams);
  if (globalResult && globalResult.value !== null) {
    return { ...globalResult, status: "fallback" as const };
  }

  return null;
}

/**
 * Fetch a capability across all projects and return results per project.
 * Useful for batch operations like "fetch TVL for all DEX protocols".
 */
export async function fetchMetricForProjects(
  projectIds: string[],
  capability: string,
  extraParams?: Record<string, string>,
): Promise<{ projectId: string; project: EcosystemProject; metric: ProvenanceMetric<unknown> | null }[]> {
  ensureInit();

  const results: { projectId: string; project: EcosystemProject; metric: ProvenanceMetric<unknown> | null }[] = [];

  for (const pid of projectIds) {
    const project = CANONICAL_PROJECTS.find((p) => p.id === pid);
    if (!project) continue;
    const metric = await fetchProjectMetric(pid, capability, extraParams);
    results.push({ projectId: pid, project, metric });
  }

  return results;
}

/**
 * Run a real-provider smoke test on all registered connectors.
 * Calls health check + a simple fetch on each connector.
 * Returns actual results — never fabricated.
 */
export async function runConnectorSmokeTest(): Promise<{
  connectorId: string;
  provider: string;
  healthStatus: string;
  fetchStatus: string;
  fetchValue: unknown;
  latencyMs: number;
  error?: string;
}[]> {
  ensureInit();

  // Run health checks first
  await healthMonitor.runHealthCheck();

  const connectors = sourceRegistry.getAll();
  const results: {
    connectorId: string;
    provider: string;
    healthStatus: string;
    fetchStatus: string;
    fetchValue: unknown;
    latencyMs: number;
    error?: string;
  }[] = [];

  for (const conn of connectors) {
    const start = Date.now();
    const healthStatus = sourceRegistry.getStatus(conn.sourceId);
    const firstCap = conn.capabilities[0];

    if (!firstCap) {
      results.push({
        connectorId: conn.sourceId,
        provider: conn.provider,
        healthStatus,
        fetchStatus: "no_capability",
        fetchValue: null,
        latencyMs: Date.now() - start,
      });
      continue;
    }

    try {
      const result = await conn.fetch(firstCap, {});
      results.push({
        connectorId: conn.sourceId,
        provider: conn.provider,
        healthStatus,
        fetchStatus: result?.status ?? "unavailable",
        fetchValue: result?.value ?? null,
        latencyMs: Date.now() - start,
      });
    } catch (err) {
      results.push({
        connectorId: conn.sourceId,
        provider: conn.provider,
        healthStatus,
        fetchStatus: "error",
        fetchValue: null,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return results;
}

/**
 * Get all projects that have at least one live (healthy) data source.
 */
export function getProjectsWithLiveData(): EcosystemProject[] {
  ensureInit();
  return CANONICAL_PROJECTS.filter((p) =>
    p.dataSources.some((ds) => sourceMapper.hasLiveSource(ds.id)),
  );
}

/**
 * Get all projects that have at least one registered connector (any health status).
 */
export function getProjectsWithRegisteredSources(): EcosystemProject[] {
  ensureInit();
  return CANONICAL_PROJECTS.filter((p) =>
    p.dataSources.some((ds) => sourceMapper.hasRegisteredSource(ds.id)),
  );
}
