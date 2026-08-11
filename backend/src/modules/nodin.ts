import { Router, type Request, type Response } from "express";
import { buildSnapshot } from "../lib/snapshot.js";
import { buildProjects, buildNarratives } from "../lib/projects.js";
import { buildReport } from "../lib/report.js";
import { detectAnomalies } from "../lib/anomaly.js";
import { solanaMarketData } from "../lib/publicData.js";
import { projectIdForSlug } from "../lib/protocol-mapping.js";

export const insightRouter = Router();

let cache: { at: number; data: unknown } | null = null;
const TTL = 60_000;

async function getReport() {
  const snapshot = await buildSnapshot();
  const projects = await buildProjects();
  const narratives = buildNarratives(projects);
  return buildReport(snapshot, projects, narratives);
}

insightRouter.get("/snapshot", async (_req: Request, res: Response) => {
  const snapshot = await buildSnapshot();
  const anomalies = detectAnomalies(snapshot);
  res.json({ ...snapshot, anomalies });
});

insightRouter.get("/projects", async (_req: Request, res: Response) => {
  const projects = await buildProjects();
  const narratives = buildNarratives(projects);
  res.json({ projects, narratives });
});

insightRouter.get("/narratives", async (_req: Request, res: Response) => {
  const projects = await buildProjects();
  res.json(buildNarratives(projects));
});

insightRouter.get("/reports", async (_req: Request, res: Response) => {
  const report = await getReport();
  res.json(report);
});

insightRouter.get("/reports/markdown", async (_req: Request, res: Response) => {
  const report = await getReport();
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="solana-report.md"');
  res.send(report.markdown);
});

insightRouter.get("/reports/json", async (_req: Request, res: Response) => {
  const report = await getReport();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="solana-report.json"');
  res.json(report);
});

insightRouter.get("/news", async (_req: Request, res: Response) => {
  const snapshot = await buildSnapshot();
  res.json({ news: snapshot.news, tweets: snapshot.tweets });
});

insightRouter.get("/upgrades", async (_req: Request, res: Response) => {
  const snapshot = await buildSnapshot();
  res.json(snapshot.upgrades);
});

insightRouter.get("/pulse", async (_req: Request, res: Response) => {
  const now = Date.now();
  if (cache && now - cache.at < TTL) {
    return res.json(cache.data);
  }
  const report = await getReport();
  cache = { at: now, data: report };
  res.json(report);
});

// SSE — server pushes pulse data every 60s, client auto-updates
insightRouter.get("/stream", async (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(": connected\n\n");

  // Send initial immediately
  try {
    const report = await getReport();
    res.write(`data: ${JSON.stringify(report)}\n\n`);
  } catch {
    // ignore initial error
  }

  const interval = setInterval(async () => {
    // Check if client still connected
    if (req.destroyed || res.destroyed) {
      clearInterval(interval);
      return;
    }
    try {
      const now = Date.now();
      if (!cache || now - cache.at >= TTL) {
        const report = await getReport();
        cache = { at: now, data: report };
      }
      res.write(`data: ${JSON.stringify(cache!.data)}\n\n`);
    } catch {
      // skip on error
    }
  }, TTL);

  // Cleanup on close
  req.on("close", () => {
    clearInterval(interval);
  });
});

// Protocol directory — Blockworks-style category explorer
insightRouter.get("/protocols", async (_req: Request, res: Response) => {
  try {
    const dir = await solanaMarketData.protocolDirectory();
    // Inject ecosystem project IDs where a verified mapping exists
    const enriched: Record<string, any[]> = {};
    for (const [cat, protocols] of Object.entries(dir)) {
      enriched[cat] = protocols.map((p: any) => ({
        ...p,
        ecosystemProjectId: projectIdForSlug(p.slug) ?? null,
      }));
    }
    res.json(enriched);
  } catch {
    res.status(500).json({ error: "Failed to fetch protocol directory" });
  }
});

// Single protocol detail
insightRouter.get("/protocols/:slug", async (req: Request, res: Response) => {
  try {
    const detail = await solanaMarketData.protocolDetail(String(req.params.slug));
    if (!detail) return res.status(404).json({ error: "Protocol not found" });
    res.json(detail);
  } catch {
    res.status(500).json({ error: "Failed to fetch protocol detail" });
  }
});

// Protocol TVL chart (historical, Solana-specific)
insightRouter.get("/protocols/:slug/chart", async (req: Request, res: Response) => {
  try {
    const days = parseInt(String(req.query.days), 10) || 90;
    const chart = await solanaMarketData.protocolTvlChart(String(req.params.slug), days);
    res.json({ slug: req.params.slug, points: chart });
  } catch {
    res.status(500).json({ error: "Failed to fetch chart" });
  }
});

// DEX volume leaderboard (Solana-only, 24h)
insightRouter.get("/dex-volume", async (_req: Request, res: Response) => {
  try {
    const leaderboard = await solanaMarketData.dexVolumeLeaderboard();
    res.json(leaderboard);
  } catch {
    res.status(500).json({ error: "Failed to fetch DEX volume" });
  }
});

// Stablecoin breakdown (Solana-only, per token)
insightRouter.get("/stablecoins", async (_req: Request, res: Response) => {
  try {
    const breakdown = await solanaMarketData.stablecoinBreakdown();
    res.json(breakdown);
  } catch {
    res.status(500).json({ error: "Failed to fetch stablecoin breakdown" });
  }
});

// Fee/revenue leaderboard (Solana-only, 24h)
insightRouter.get("/fees", async (_req: Request, res: Response) => {
  try {
    const leaderboard = await solanaMarketData.feeRevenueLeaderboard();
    res.json(leaderboard);
  } catch {
    res.status(500).json({ error: "Failed to fetch fee leaderboard" });
  }
});

// Solana network TVL history (90 days, downsampled)
insightRouter.get("/tvl-history", async (req: Request, res: Response) => {
  try {
    const days = parseInt(String(req.query.days), 10) || 90;
    const history = await solanaMarketData.solanaTvlHistory(days);
    res.json({ points: history });
  } catch {
    res.status(500).json({ error: "Failed to fetch TVL history" });
  }
});