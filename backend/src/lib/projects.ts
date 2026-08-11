import { defiLlama, type LlamaProtocol } from "./publicData.js";
import { FEATURED } from "./snapshot.js";
import { STATIC_PROTOCOLS } from "./staticData.js";
import type { ProjectIntel, Narrative } from "./types.js";

export async function buildProjects(): Promise<ProjectIntel[]> {
  const protocols = await defiLlama.solanaProtocols();
  const bySlug = new Map<string, LlamaProtocol>(protocols.map((p) => [p.slug, p]));

  const out: ProjectIntel[] = [];
  for (const slug of FEATURED) {
    const p = bySlug.get(slug);
    if (p) {
      const change7d = p.change_7d ?? 0;
      out.push({
        name: p.name,
        category: p.category || "Unknown",
        tvl: p.tvl,
        change7d,
        narrative: inferNarrative(p.category || ""),
        status: statusFor(change7d),
        evidence: [
          `DeFiLlama TVL: $${formatUsd(p.tvl)}`,
          `7d change: ${change7d >= 0 ? "+" : ""}${change7d.toFixed(1)}%`,
          p.mcap ? `Market cap: $${formatUsd(p.mcap)}` : "Market cap: n/a",
        ],
      });
    } else {
      const s = STATIC_PROTOCOLS.find((x) => x.slug === slug);
      if (!s) continue;
      out.push({
        name: s.name,
        category: s.category,
        tvl: s.tvl,
        change7d: s.change7d,
        narrative: inferNarrative(s.category),
        status: statusFor(s.change7d),
        evidence: [
          `[demo] Static TVL: $${formatUsd(s.tvl)}`,
          `[demo] 7d change: ${s.change7d >= 0 ? "+" : ""}${s.change7d.toFixed(1)}%`,
          s.mcap ? `[demo] Market cap: $${formatUsd(s.mcap)}` : "[demo] Market cap: n/a",
        ],
      });
    }
  }
  if (bySlug.size > 0) return out.sort((a, b) => b.tvl - a.tvl);

  const staticOut: ProjectIntel[] = STATIC_PROTOCOLS.map((s) => ({
    name: s.name,
    category: s.category,
    tvl: s.tvl,
    change7d: s.change7d,
    narrative: inferNarrative(s.category),
    status: statusFor(s.change7d),
    evidence: [
      `[demo] Static TVL: $${formatUsd(s.tvl)}`,
      `[demo] 7d change: ${s.change7d >= 0 ? "+" : ""}${s.change7d.toFixed(1)}%`,
    ],
  }));
  return staticOut.sort((a, b) => b.tvl - a.tvl);
}

function statusFor(change7d: number): ProjectIntel["status"] {
  return change7d <= -25 ? "at_risk" : change7d <= -8 ? "watch" : "healthy";
}

function inferNarrative(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("liquid") || c.includes("staking")) return "Liquid Staking & Restaking";
  if (c.includes("dex") || c.includes("amm")) return "DEX & On-chain Liquidity";
  if (c.includes("lend")) return "Lending & Borrowing";
  if (c.includes("yield")) return "Yield & Structured Products";
  if (c.includes("perp") || c.includes("derivative")) return "Perpetuals & Derivatives";
  return "Core DeFi Infrastructure";
}

export function buildNarratives(projects: ProjectIntel[]): Narrative[] {
  const byNarrative = new Map<string, string[]>();
  for (const p of projects) {
    const list = byNarrative.get(p.narrative) ?? [];
    list.push(p.name);
    byNarrative.set(p.narrative, list);
  }
  const trends: Narrative["trend"][] = ["up", "up", "down", "flat"];
  return Array.from(byNarrative.entries()).map(([title, reps], i) => {
    const avg = reps.length
      ? projects.filter((p) => reps.includes(p.name)).reduce((s, p) => s + p.change7d, 0) / reps.length
      : 0;
    return {
      id: title.toLowerCase().replace(/\s+/g, "-"),
      title,
      trend: avg >= 1 ? "up" : avg <= -1 ? "down" : trends[i % trends.length],
      summary: `${reps.length} tracked protocols · avg 7d ${avg >= 0 ? "+" : ""}${avg.toFixed(1)}%.`,
      representativeProjects: reps.slice(0, 4),
    };
  });
}

function formatUsd(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(0);
}