/**
 * ════════════════════════════════════════════════════════════════════════════
 * SOURCE HEALTH MONITOR — operational health checking
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Runs health checks on all registered connectors:
 * - Startup health check (runs once on app boot)
 * - Periodic health check (runs every N seconds)
 * - Timeout handling
 * - Failure tracking
 * - Status transitions (healthy → degraded → unavailable → healthy)
 *
 * After startup, all connectors have a real health status — never "unknown".
 * ════════════════════════════════════════════════════════════════════════════
 */
import { sourceRegistry } from "./source-registry.js";
import type { SourceHealthCheck } from "./ecosystem-types.js";

export class HealthMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs: number;
  private readonly timeoutMs: number;
  private startupDone = false;
  private checkInProgress = false;

  constructor(intervalMs = 120_000, timeoutMs = 10_000) {
    this.intervalMs = intervalMs;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Run a single health check cycle on all registered connectors.
   * Each connector gets its own timeout. Failed/timed-out connectors
   * get marked as "unavailable" with the actual error reason.
   */
  async runHealthCheck(): Promise<void> {
    if (this.checkInProgress) return;
    this.checkInProgress = true;

    const connectors = sourceRegistry.getAll();

    await Promise.allSettled(
      connectors.map(async (connector) => {
        const start = Date.now();
        try {
          // Race the health check against a timeout
          const result = await Promise.race([
            connector.checkHealth(),
            new Promise<SourceHealthCheck>((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), this.timeoutMs),
            ),
          ]);

          const latency = Date.now() - start;
          // Classify status based on latency
          let finalStatus = result.status;
          if (result.status === "healthy" && latency > 5000) {
            finalStatus = "degraded";
          }

          sourceRegistry.recordHealth(connector.sourceId, {
            ...result,
            status: finalStatus,
            responseTimeMs: latency,
          });
        } catch (err) {
          const latency = Date.now() - start;
          const errorMsg = err instanceof Error ? err.message : "unknown error";
          sourceRegistry.recordHealth(connector.sourceId, {
            sourceId: connector.sourceId,
            status: "unavailable",
            checkedAt: new Date().toISOString(),
            responseTimeMs: latency,
            error: errorMsg,
          });
        }
      }),
    );

    this.checkInProgress = false;
    if (!this.startupDone) this.startupDone = true;
  }

  /**
   * Run the startup health check. Should be called once on app boot.
   * Waits for completion before returning.
   */
  async startupCheck(): Promise<void> {
    if (this.startupDone) return;
    await this.runHealthCheck();
  }

  /**
   * Start periodic health checks.
   */
  startPeriodic(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.runHealthCheck().catch(() => {});
    }, this.intervalMs);
  }

  /**
   * Stop periodic health checks.
   */
  stopPeriodic(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Check if startup health check has completed */
  isStartupDone(): boolean {
    return this.startupDone;
  }
}

/** Singleton health monitor */
export const healthMonitor = new HealthMonitor();
