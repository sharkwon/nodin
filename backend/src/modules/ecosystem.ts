/**
 * ════════════════════════════════════════════════════════════════════════════
 * ECOSYSTEM API ROUTER
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Exposes the ecosystem registry, coverage reports, source health,
 * discovery engine, and news-entity linking via REST API.
 *
 * Routes:
 * GET /api/ecosystem/categories          — taxonomy + project counts
 * GET /api/ecosystem/projects            — full project directory (filterable)
 * GET /api/ecosystem/projects/:id        — single project detail
 * GET /api/ecosystem/coverage            — coverage report (all categories)
 * GET /api/ecosystem/coverage/:category  — coverage report for one category
 * GET /api/ecosystem/sources             — all data sources + health
 * GET /api/ecosystem/sources/:id/health  — single source health
 * GET /api/ecosystem/discover            — run discovery engine
 * GET /api/ecosystem/search?q=           — entity resolution search
 * POST /api/ecosystem/link-news          — link news articles to entities
 * ════════════════════════════════════════════════════════════════════════════
 */
import { Router, type Request, type Response } from "express";
import { CANONICAL_PROJECTS } from "../lib/ecosystem-registry.js";
import { CATEGORY_METADATA, categoryLabel, type EcosystemCategory } from "../lib/ecosystem-types.js";
import { entityResolver } from "../lib/entity-resolver.js";
import { coverageEngine } from "../lib/coverage-engine.js";
import { sourceRegistry, sourceMapper } from "../lib/source-registry.js";
import { discoveryEngine, verificationPipeline, newsEntityLinker } from "../lib/discovery-engine.js";
import { registerAllConnectors } from "../lib/connectors/index.js";
import { fetchProjectIntelligence, relatedProjects, PROTOCOL_MAPPINGS } from "../lib/protocol-mapping.js";

// Register connectors on first import
registerAllConnectors();

export const ecosystemRouter = Router();

// ── GET /categories — taxonomy + project counts ──
ecosystemRouter.get("/categories", (_req: Request, res: Response) => {
  const categories = CATEGORY_METADATA
    .filter((c) => c.id !== "other")
    .map((c) => {
      const projects = CANONICAL_PROJECTS.filter((p) => p.categories.includes(c.id));
      return {
        id: c.id,
        label: c.label,
        description: c.description,
        parent: c.parent,
        projectCount: projects.length,
        withDataSource: projects.filter((p) => p.dataSources.length > 0).length,
      };
    })
    .filter((c) => c.projectCount > 0);

  res.json({
    totalCategories: categories.length,
    totalProjects: CANONICAL_PROJECTS.length,
    categories: categories.sort((a, b) => b.projectCount - a.projectCount),
  });
});

// ── GET /projects — full directory with optional category filter ──
ecosystemRouter.get("/projects", (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  const status = req.query.status as string | undefined;

  let projects = CANONICAL_PROJECTS;

  if (category) {
    projects = projects.filter((p) => p.categories.includes(category as EcosystemCategory));
  }
  if (status) {
    projects = projects.filter((p) => p.status === status);
  }

  // Return summary view (not full detail)
  const summary = projects.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    categories: p.categories,
    status: p.status,
    verificationStage: p.verificationStage,
    website: p.website,
    logo: p.logo,
    token: p.token ? { symbol: p.token.symbol, name: p.token.name, mintAddress: p.token.mintAddress } : undefined,
    dataSourceCount: p.dataSources.length,
    hasLiveData: p.dataSources.some((ds) => sourceMapper.hasLiveSource(ds.id)),
    hasRegisteredSource: p.dataSources.some((ds) => sourceMapper.hasRegisteredSource(ds.id)),
  }));

  res.json({
    total: summary.length,
    projects: summary.sort((a, b) => b.dataSourceCount - a.dataSourceCount),
  });
});

// ── GET /projects/:id — full project detail ──
ecosystemRouter.get("/projects/:id", (req: Request, res: Response) => {
  const id = String(req.params.id);

  // Try exact ID first
  let project = CANONICAL_PROJECTS.find((p) => p.id === id);

  // Try entity resolution
  if (!project) {
    const resolved = entityResolver.resolve(id);
    if (resolved) project = resolved.project;
  }

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  // Compute data completeness
  const completeness = coverageEngine.completenessForProject(project);

  // Get health status for each data source — use sourceMapper for resolution
  const dataSources = project.dataSources.map((ds) => {
    const resolved = sourceMapper.resolve(ds.id);
    const isLive = sourceMapper.hasLiveSource(ds.id);
    const isRegistered = sourceMapper.hasRegisteredSource(ds.id);
    const connectorHealth = resolved ? sourceRegistry.getHealthSummary(resolved.connector.sourceId) : undefined;

    // Determine data state for frontend
    let dataState: "available" | "unavailable" | "stale" | "loading" | "not_reported";
    if (!isRegistered) {
      dataState = "not_reported";
    } else if (isLive) {
      dataState = "available";
    } else if (connectorHealth?.currentStatus === "unavailable") {
      dataState = "unavailable";
    } else if (connectorHealth?.currentStatus === "stale") {
      dataState = "stale";
    } else if (connectorHealth?.currentStatus === "unknown") {
      dataState = "unavailable";
    } else {
      dataState = "unavailable";
    }

    return {
      ...ds,
      resolvedConnector: resolved?.connector.sourceId ?? null,
      isLive,
      isRegistered,
      dataState,
      health: connectorHealth ? {
        sourceId: connectorHealth.sourceId,
        currentStatus: connectorHealth.currentStatus,
        confidence: connectorHealth.confidence,
        consecutiveFailures: connectorHealth.consecutiveFailures,
        lastCheckedAt: connectorHealth.lastCheckedAt,
        lastSuccessAt: connectorHealth.lastSuccessAt,
      } : undefined,
    };
  });

  res.json({
    ...project,
    dataSources,
    dataCompleteness: completeness,
  });
});

// ── GET /coverage — coverage report for all categories ──
ecosystemRouter.get("/coverage", (_req: Request, res: Response) => {
  const report = coverageEngine.reportAll();
  const separated = coverageEngine.separatedCoverage();
  res.json({ ...report, separated });
});

// ── GET /coverage/:category — coverage for single category ──
ecosystemRouter.get("/coverage/:category", (req: Request, res: Response) => {
  const category = String(req.params.category) as EcosystemCategory;
  const report = coverageEngine.reportForCategory(category);
  const missing = coverageEngine.missingDataForCategory(category);
  res.json({ ...report, ...missing });
});

// ── GET /sources — all data sources with health ──
ecosystemRouter.get("/sources", (_req: Request, res: Response) => {
  const health = coverageEngine.sourceHealthSummary();
  res.json(health);
});

// ── GET /sources/:id/health — single source health ──
ecosystemRouter.get("/sources/:id/health", (req: Request, res: Response) => {
  const id = String(req.params.id);
  const summary = sourceRegistry.getHealthSummary(id);
  if (!summary) {
    return res.status(404).json({ error: "Source not found" });
  }
  const connector = sourceRegistry.get(id);
  res.json({
    ...summary,
    provider: connector?.provider,
    capabilities: connector?.capabilities,
    endpoint: connector?.endpoint,
  });
});

// ── GET /discover — run discovery engine ──
ecosystemRouter.get("/discover", async (_req: Request, res: Response) => {
  try {
    const candidates = await discoveryEngine.discoverAll();
    const result = await verificationPipeline.process(candidates);
    res.json({
      totalCandidates: candidates.length,
      newProjects: result.newProjects.length,
      duplicates: result.duplicates.length,
      rejected: result.rejected.length,
      candidates: candidates.slice(0, 50), // first 50 for preview
    });
  } catch {
    res.status(500).json({ error: "Discovery failed" });
  }
});

// ── GET /search?q= — entity resolution search ──
ecosystemRouter.get("/search", (req: Request, res: Response) => {
  const q = String(req.query.q || "");
  if (!q) return res.json({ results: [] });

  const resolved = entityResolver.resolve(q);
  if (!resolved) return res.json({ results: [] });

  res.json({
    results: [{
      projectId: resolved.project.id,
      name: resolved.project.name,
      slug: resolved.project.slug,
      categories: resolved.project.categories,
      confidence: resolved.confidence,
      matchMethod: resolved.matchMethod,
      website: resolved.project.website,
      token: resolved.project.token ? { symbol: resolved.project.token.symbol } : undefined,
    }],
  });
});

// ── GET /projects/:id/intelligence — live DeFiLlama metrics for a project ──
ecosystemRouter.get("/projects/:id/intelligence", async (req: Request, res: Response) => {
  const id = String(req.params.id);
  // Try exact ID first
  let project = CANONICAL_PROJECTS.find((p) => p.id === id);
  // Try entity resolution
  if (!project) {
    const resolved = entityResolver.resolve(id);
    if (resolved) project = resolved.project;
  }
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }
  const intelligence = await fetchProjectIntelligence(project.id);
  res.json(intelligence);
});

// ── GET /projects/:id/related — related projects by shared categories ──
ecosystemRouter.get("/projects/:id/related", (req: Request, res: Response) => {
  const id = String(req.params.id);
  let project = CANONICAL_PROJECTS.find((p) => p.id === id);
  if (!project) {
    const resolved = entityResolver.resolve(id);
    if (resolved) project = resolved.project;
  }
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }
  const related = relatedProjects(project.id, 6);
  res.json({
    projectId: project.id,
    related: related.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      categories: p.categories,
      status: p.status,
      website: p.website,
      token: p.token ? { symbol: p.token.symbol, name: p.token.name } : undefined,
      dataSourceCount: p.dataSources.length,
    })),
  });
});

// ── GET /intelligence/mappings — all verified protocol→project mappings ──
ecosystemRouter.get("/intelligence/mappings", (_req: Request, res: Response) => {
  res.json({
    totalMappings: PROTOCOL_MAPPINGS.length,
    mappings: PROTOCOL_MAPPINGS,
  });
});

// ── POST /link-news — link news articles to ecosystem entities ──
ecosystemRouter.post("/link-news", (req: Request, res: Response) => {
  const articles = req.body?.articles;
  if (!Array.isArray(articles)) {
    return res.status(400).json({ error: "Expected { articles: [{ id, title, summary }] }" });
  }

  const results = newsEntityLinker.linkArticles(
    articles.map((a: any) => ({
      id: String(a.id),
      title: String(a.title || ""),
      summary: String(a.summary || ""),
    })),
  );

  res.json({ results });
});
