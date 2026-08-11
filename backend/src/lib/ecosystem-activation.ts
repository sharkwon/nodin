/**
 * ════════════════════════════════════════════════════════════════════════════
 * ECOSYSTEM ACTIVATION — wires discovery, news linking, health into the runtime
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Called at app startup to:
 * 1. Register all connectors
 * 2. Run startup health checks
 * 3. Start periodic health checks
 * 4. Run discovery (if not recently run)
 * 5. Wire news-entity linking into the news pipeline
 *
 * This is the bridge between architecture and operation.
 * ════════════════════════════════════════════════════════════════════════════
 */
import { registerAllConnectors } from "./connectors/index.js";
import { healthMonitor } from "./health-monitor.js";
import { discoveryEngine, verificationPipeline } from "./discovery-engine.js";
import { newsEntityLinker } from "./discovery-engine.js";
import { sourceMapper } from "./source-registry.js";
import type { NewsItem } from "./types.js";

let activated = false;

/**
 * Activate the ecosystem data pipeline.
 * Called once at app startup.
 */
export async function activateEcosystem(): Promise<void> {
  if (activated) return;
  activated = true;

  // 1. Register all connectors
  registerAllConnectors();

  // 2. Run startup health checks (real network calls, with timeout)
  await healthMonitor.startupCheck();

  // 3. Start periodic health checks (every 2 minutes)
  healthMonitor.startPeriodic();

  // 4. Register custom source mappings (if any non-pattern mappings needed)
  // Currently all mappings are handled by pattern matching in SourceMapper

  // 5. Discovery is NOT run automatically at startup to avoid slow boot.
  //    It can be triggered via /api/ecosystem/discover or a periodic job.
}

/**
 * Link news articles to canonical ecosystem entities.
 * This is the integration point between the news pipeline and the ecosystem graph.
 *
 * Usage: call this after fetching news articles, before returning them to the client.
 */
export function linkNewsToEntities(
  articles: { id: string; title: string; summary: string }[],
): {
  articleId: string;
  links: {
    articleId: string;
    projectId: string;
    projectName: string;
    categories: string[];
    matchConfidence: number;
    matchMethod: string;
  }[];
}[] {
  return newsEntityLinker.linkArticles(articles);
}

/**
 * Enhance NewsItems with ecosystem entity links.
 * Returns the same array with an added `entityLinks` field per item.
 */
export function enhanceNewsWithEntities(news: NewsItem[]): (NewsItem & {
  entityLinks?: {
    projectId: string;
    projectName: string;
    categories: string[];
    matchConfidence: number;
    matchMethod: string;
  }[];
})[] {
  return news.map((item) => {
    const links = newsEntityLinker.linkArticle({
      id: item.id,
      title: item.title,
      summary: item.summary || "",
    });
    if (links.length === 0) return item;
    return {
      ...item,
      entityLinks: links.map((l) => ({
        projectId: l.projectId,
        projectName: l.projectName,
        categories: l.categories,
        matchConfidence: l.matchConfidence,
        matchMethod: l.matchMethod,
      })),
    };
  });
}

/**
 * Run ecosystem discovery and verification.
 * Returns the result of processing candidates through the pipeline.
 * Does NOT automatically promote candidates — only reports what was found.
 */
export async function runEcosystemDiscovery(): Promise<{
  totalCandidates: number;
  newProjects: number;
  duplicates: number;
  rejected: number;
}> {
  const candidates = await discoveryEngine.discoverAll();
  const result = await verificationPipeline.process(candidates);
  return {
    totalCandidates: candidates.length,
    newProjects: result.newProjects.length,
    duplicates: result.duplicates.length,
    rejected: result.rejected.length,
  };
}

/**
 * Get the activation status.
 */
export function isActivated(): boolean {
  return activated;
}

/**
 * Cleanup — stop periodic health checks.
 * Called on app shutdown.
 */
export function deactivateEcosystem(): void {
  healthMonitor.stopPeriodic();
  activated = false;
}
