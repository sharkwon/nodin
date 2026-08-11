/**
 * ════════════════════════════════════════════════════════════════════════════
 * CONNECTOR INTERFACE & SOURCE REGISTRY
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Defines the canonical connector interface that all data providers implement.
 * The SourceRegistry manages all connectors, their health, and fallback logic.
 *
 * Key principles:
 * - One project → multiple data sources (multi-source isolation)
 * - If source A fails, source B can serve the same capability
 * - Health is tracked per-source, not per-project
 * - Capabilities are explicitly declared, not implied
 * ════════════════════════════════════════════════════════════════════════════
 */
import type {
  DataSource,
  SourceStatus,
  SourceHealthCheck,
  SourceHealthSummary,
  ProvenanceMetric,
} from "./ecosystem-types.js";
import { healthConfidence } from "./ecosystem-types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONNECTOR INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A data connector. Every external data provider implements this interface.
 * The connector declares its capabilities and provides a fetch method.
 *
 * Connectors are registered in the SourceRegistry and selected by capability.
 */
export interface DataConnector {
  /** Unique source ID — matches DataSource.id */
  readonly sourceId: string;
  /** Human-readable provider name */
  readonly provider: string;
  /** Source type */
  readonly type: DataSource["type"];
  /** Capabilities this connector can provide */
  readonly capabilities: string[];
  /** Authentication requirement */
  readonly auth: DataSource["authentication"];
  /** Endpoint URL (if applicable) */
  readonly endpoint?: string;

  /**
   * Fetch a specific capability from this connector.
   * Returns a ProvenanceMetric so every value carries its origin.
   *
   * @param capability - one of this connector's capabilities
   * @param params - optional parameters (e.g. token mint, collection slug)
   * @returns provenance-stamped result, or null if unavailable
   */
  fetch(capability: string, params?: Record<string, string>): Promise<ProvenanceMetric<unknown> | null>;

  /**
   * Health check — ping the source and return its status.
   * Called periodically by the health monitor.
   */
  checkHealth(): Promise<SourceHealthCheck>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SOURCE REGISTRY — manages all connectors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The SourceRegistry is the central manager for all data connectors.
 * It handles:
 * - Connector registration
 * - Capability-based lookup (find all sources that can provide "tvl")
 * - Health tracking (per-source status, history, confidence)
 * - Fallback selection (if primary source is down, try secondary)
 * - Provenance stamping (every fetched value gets source attribution)
 */
export class SourceRegistry {
  private connectors = new Map<string, DataConnector>();
  private healthSummaries = new Map<string, SourceHealthSummary>();
  private healthHistoryMax = 20;

  /** Register a connector */
  register(connector: DataConnector): void {
    this.connectors.set(connector.sourceId, connector);
    if (!this.healthSummaries.has(connector.sourceId)) {
      this.healthSummaries.set(connector.sourceId, {
        sourceId: connector.sourceId,
        currentStatus: "unknown",
        lastCheckedAt: "",
        consecutiveFailures: 0,
        history: [],
        confidence: 0.1,
      });
    }
  }

  /** Unregister a connector */
  unregister(sourceId: string): void {
    this.connectors.delete(sourceId);
    this.healthSummaries.delete(sourceId);
  }

  /** Get a connector by source ID */
  get(sourceId: string): DataConnector | undefined {
    return this.connectors.get(sourceId);
  }

  /** Get all registered connectors */
  getAll(): DataConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Find all connectors that declare a given capability.
   * Results are sorted by health confidence (highest first).
   */
  findByCapability(capability: string): DataConnector[] {
    return this.getAll()
      .filter((c) => c.capabilities.includes(capability))
      .sort((a, b) => this.getConfidence(b.sourceId) - this.getConfidence(a.sourceId));
  }

  /**
   * Find the best connector for a capability.
   * Returns the healthiest connector, or null if none available.
   */
  findBestForCapability(capability: string): DataConnector | null {
    const candidates = this.findByCapability(capability);
    // Filter out unavailable sources
    const available = candidates.filter(
      (c) => this.getStatus(c.sourceId) !== "unavailable",
    );
    return available[0] ?? null;
  }

  /**
   * Fetch a capability from the best available source.
   * If the primary source fails, tries fallback sources.
   * Returns provenance-stamped data, or null if all sources fail.
   */
  async fetchWithFallback(
    capability: string,
    params?: Record<string, string>,
  ): Promise<ProvenanceMetric<unknown> | null> {
    const candidates = this.findByCapability(capability);
    for (const connector of candidates) {
      const status = this.getStatus(connector.sourceId);
      if (status === "unavailable") continue;
      try {
        const result = await connector.fetch(capability, params);
        if (result && result.value !== null) {
          // Update health on success
          this.recordHealth(connector.sourceId, {
            sourceId: connector.sourceId,
            status: "healthy",
            checkedAt: new Date().toISOString(),
          });
          return result;
        }
      } catch {
        // Record failure, try next source
        this.recordHealth(connector.sourceId, {
          sourceId: connector.sourceId,
          status: "unavailable",
          checkedAt: new Date().toISOString(),
          error: "fetch failed",
        });
      }
    }
    return null;
  }

  // ── Health management ──

  /** Get current status of a source */
  getStatus(sourceId: string): SourceStatus {
    return this.healthSummaries.get(sourceId)?.currentStatus ?? "unknown";
  }

  /** Get confidence score of a source (0-1) */
  getConfidence(sourceId: string): number {
    return this.healthSummaries.get(sourceId)?.confidence ?? 0.1;
  }

  /** Get full health summary for a source */
  getHealthSummary(sourceId: string): SourceHealthSummary | undefined {
    return this.healthSummaries.get(sourceId);
  }

  /** Get all health summaries */
  getAllHealth(): SourceHealthSummary[] {
    return Array.from(this.healthSummaries.values());
  }

  /**
   * Record a health check result.
   * Updates the source's status, history, and confidence.
   */
  recordHealth(sourceId: string, check: SourceHealthCheck): void {
    let summary = this.healthSummaries.get(sourceId);
    if (!summary) {
      summary = {
        sourceId,
        currentStatus: "unknown",
        lastCheckedAt: "",
        consecutiveFailures: 0,
        history: [],
        confidence: 0.1,
      };
      this.healthSummaries.set(sourceId, summary);
    }

    summary.currentStatus = check.status;
    summary.lastCheckedAt = check.checkedAt;
    summary.history.push(check);
    if (summary.history.length > this.healthHistoryMax) {
      summary.history.shift();
    }

    if (check.status === "healthy") {
      summary.consecutiveFailures = 0;
      summary.lastSuccessAt = check.checkedAt;
    } else if (check.status === "unavailable" || check.status === "rate_limited") {
      summary.consecutiveFailures++;
    }

    // Recalculate confidence
    summary.confidence = this.calculateConfidence(summary);
  }

  /**
   * Run health checks on all registered connectors.
   * Called periodically by the health monitor.
   */
  async checkAllHealth(): Promise<void> {
    const checks = Array.from(this.connectors.values()).map(async (connector) => {
      try {
        const result = await connector.checkHealth();
        this.recordHealth(connector.sourceId, result);
      } catch {
        this.recordHealth(connector.sourceId, {
          sourceId: connector.sourceId,
          status: "unavailable",
          checkedAt: new Date().toISOString(),
          error: "health check failed",
        });
      }
    });
    await Promise.allSettled(checks);
  }

  /**
   * Calculate confidence from health history.
   * Based on: current status, recent success rate, consecutive failures.
   */
  private calculateConfidence(summary: SourceHealthSummary): number {
    const base = healthConfidence(summary.currentStatus);
    // Penalize consecutive failures
    const failurePenalty = Math.min(0.3, summary.consecutiveFailures * 0.1);
    // Look at last 5 checks for trend
    const recent = summary.history.slice(-5);
    const successRate = recent.length > 0
      ? recent.filter((h) => h.status === "healthy").length / recent.length
      : 0;
    const trendBonus = successRate * 0.1;
    return Math.max(0, Math.min(1, base - failurePenalty + trendBonus));
  }

  /**
   * Convert registry to DataSource[] for a given project.
   * Used when building EcosystemProject.dataSources from active connectors.
   */
  toDataSources(sourceIds: string[]): DataSource[] {
    return sourceIds
      .map((id) => {
        const c = this.connectors.get(id);
        const h = this.healthSummaries.get(id);
        if (!c) return undefined;
        const ds: DataSource = {
          id: c.sourceId,
          provider: c.provider,
          type: c.type,
          capabilities: c.capabilities,
          endpoint: c.endpoint,
          authentication: c.auth,
          status: h?.currentStatus ?? "unknown",
          lastCheckedAt: h?.lastCheckedAt ?? "",
          lastSuccessAt: h?.lastSuccessAt,
          lastError: h?.history[h.history.length - 1]?.error,
        };
        return ds;
      })
      .filter((d): d is DataSource => d !== undefined);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SOURCE MAPPER — maps project source IDs to registered connectors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves project-specific data source IDs to registered connectors.
 *
 * Project sources use IDs like "defillama-jupiter", "pyth-api", "magic-eden-api".
 * Connectors use IDs like "defillama-protocols", "pyth", "magic-eden".
 *
 * The mapper extracts the provider prefix and optional params (e.g. DeFiLlama slug)
 * from the project source ID, then resolves to the correct connector.
 */
export class SourceMapper {
  private customMappings = new Map<string, { connectorId: string; params?: Record<string, string> }>();

  /**
   * Register a custom mapping for a specific source ID.
   * Use this when the automatic pattern matching is insufficient.
   */
  registerMapping(sourceId: string, connectorId: string, params?: Record<string, string>): void {
    this.customMappings.set(sourceId, { connectorId, params });
  }

  /**
   * Resolve a project source ID to a connector + params.
   * Returns null if no connector is registered for this source.
   */
  resolve(sourceId: string): { connector: DataConnector; params: Record<string, string> } | null {
    // 1. Check custom mappings first
    const custom = this.customMappings.get(sourceId);
    if (custom) {
      const connector = sourceRegistry.get(custom.connectorId);
      if (connector) return { connector, params: custom.params ?? {} };
    }

    // 2. Pattern: defillama-{slug} → connector "defillama-protocols", params: { slug }
    if (sourceId.startsWith("defillama-")) {
      const slug = sourceId.slice("defillama-".length);
      const connector = sourceRegistry.get("defillama-protocols");
      if (connector) return { connector, params: { slug } };
      // Fallback to generic defillama
      const generic = sourceRegistry.get("defillama");
      if (generic) return { connector: generic, params: {} };
    }

    // 3. Pattern: {provider}-api → connector "{provider}"
    //    e.g. pyth-api → pyth, magic-eden-api → magic-eden, jupiter-api → jupiter
    if (sourceId.endsWith("-api")) {
      const provider = sourceId.slice(0, -4); // strip "-api"
      const connector = sourceRegistry.get(provider);
      if (connector) return { connector, params: {} };
    }

    // 4. Pattern: {provider}-rpc → connector "{provider}" (if registered)
    if (sourceId.endsWith("-rpc")) {
      const provider = sourceId.slice(0, -4);
      const connector = sourceRegistry.get(provider);
      if (connector) return { connector, params: {} };
    }

    // 5. Pattern: {provider}-stats → connector "{provider}" (if registered)
    if (sourceId.endsWith("-stats")) {
      const provider = sourceId.slice(0, -6);
      const connector = sourceRegistry.get(provider);
      if (connector) return { connector, params: {} };
    }

    // 6. Pattern: coingecko-{symbol} → connector "coingecko", params: { sourceSuffix: symbol }
    if (sourceId.startsWith("coingecko-")) {
      const connector = sourceRegistry.get("coingecko");
      if (connector) {
        const suffix = sourceId.slice("coingecko-".length);
        return { connector, params: { sourceSuffix: suffix } };
      }
    }

    // 7. Direct match — source ID is the connector ID
    const direct = sourceRegistry.get(sourceId);
    if (direct) return { connector: direct, params: {} };

    return null;
  }

  /**
   * Check if a project source ID has a registered, healthy connector.
   */
  hasLiveSource(sourceId: string): boolean {
    const resolved = this.resolve(sourceId);
    if (!resolved) return false;
    const status = sourceRegistry.getStatus(resolved.connector.sourceId);
    return status === "healthy";
  }

  /**
   * Check if a project source ID has a registered connector (any health status).
   */
  hasRegisteredSource(sourceId: string): boolean {
    return this.resolve(sourceId) !== null;
  }

  /**
   * Fetch a capability from a project source, with fallback.
   * Uses the mapper to resolve the source ID to a connector,
   * then calls the connector with the resolved params.
   */
  async fetchFromProjectSource(
    sourceId: string,
    capability: string,
    extraParams?: Record<string, string>,
  ): Promise<ProvenanceMetric<unknown> | null> {
    const resolved = this.resolve(sourceId);
    if (!resolved) return null;

    const params = { ...resolved.params, ...extraParams };
    const status = sourceRegistry.getStatus(resolved.connector.sourceId);
    if (status === "unavailable") return null;

    try {
      const result = await resolved.connector.fetch(capability, params);
      if (result && result.value !== null) {
        sourceRegistry.recordHealth(resolved.connector.sourceId, {
          sourceId: resolved.connector.sourceId,
          status: "healthy",
          checkedAt: new Date().toISOString(),
        });
      }
      return result;
    } catch {
      sourceRegistry.recordHealth(resolved.connector.sourceId, {
        sourceId: resolved.connector.sourceId,
        status: "unavailable",
        checkedAt: new Date().toISOString(),
        error: "fetch from project source failed",
      });
      return null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GLOBAL INSTANCES
// ─────────────────────────────────────────────────────────────────────────────

/** Singleton source registry — shared across the application */
export const sourceRegistry = new SourceRegistry();

/** Singleton source mapper — resolves project source IDs to connectors */
export const sourceMapper = new SourceMapper();

// ─────────────────────────────────────────────────────────────────────────────
// 5. ABSTRACT BASE CONNECTOR — simplifies connector implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abstract base connector that handles common functionality:
 * - HTTP fetching with timeout
 * - Provenance stamping
 * - Health checking
 *
 * Subclasses implement fetchCapability() and ping().
 */
export abstract class BaseConnector implements DataConnector {
  abstract readonly sourceId: string;
  abstract readonly provider: string;
  abstract readonly type: DataSource["type"];
  abstract readonly capabilities: string[];
  readonly auth: DataSource["authentication"] = "none";
  readonly endpoint?: string;

  protected timeoutMs = 8000;

  async fetch(capability: string, params?: Record<string, string>): Promise<ProvenanceMetric<unknown> | null> {
    if (!this.capabilities.includes(capability)) return null;
    try {
      const value = await this.fetchCapability(capability, params);
      if (value === null || value === undefined) return this.nullResult(capability);
      return this.stamp(value, capability);
    } catch {
      return this.nullResult(capability);
    }
  }

  /** Subclasses implement the actual data fetch logic */
  protected abstract fetchCapability(capability: string, params?: Record<string, string>): Promise<unknown>;

  /** Default health check: try a simple fetch */
  async checkHealth(): Promise<SourceHealthCheck> {
    const start = Date.now();
    try {
      const firstCap = this.capabilities[0];
      if (firstCap) {
        await this.fetchCapability(firstCap, {});
      }
      return {
        sourceId: this.sourceId,
        status: "healthy",
        checkedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
      };
    } catch {
      return {
        sourceId: this.sourceId,
        status: "unavailable",
        checkedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
        error: "health check failed",
      };
    }
  }

  /** Stamp a value with provenance */
  protected stamp<T>(value: T, capability: string): ProvenanceMetric<T> {
    return {
      value,
      source: this.sourceId,
      sourceLabel: this.provider,
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt: new Date().toISOString(),
      transformation: "raw",
      confidence: sourceRegistry.getConfidence(this.sourceId),
      status: "available",
    };
  }

  /** Create a null (unavailable) result with provenance */
  protected nullResult(capability: string): ProvenanceMetric<null> {
    return {
      value: null,
      source: this.sourceId,
      sourceLabel: this.provider,
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt: null,
      transformation: "raw",
      confidence: 0,
      status: "unavailable",
    };
  }

  /** HTTP fetch helper with timeout */
  protected async fetchJson<T>(url: string, fallback: T): Promise<T> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Accept: "application/json", "User-Agent": "nodin-agent/1.0" },
      });
      clearTimeout(t);
      if (!res.ok) return fallback;
      return (await res.json()) as T;
    } catch {
      return fallback;
    }
  }

  protected async fetchText(url: string, fallback = ""): Promise<string> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Accept: "text/html,application/xml,application/json", "User-Agent": "nodin-agent/1.0" },
      });
      clearTimeout(t);
      if (!res.ok) return fallback;
      return await res.text();
    } catch {
      return fallback;
    }
  }
}
