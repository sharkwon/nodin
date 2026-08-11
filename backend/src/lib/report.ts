/**
 * Report generation — Markdown (human-readable) + JSON (machine-readable).
 */
import type { Snapshot, ProjectIntel, Narrative } from "./types.js";
import { detectAnomalies } from "./anomaly.js";

export function buildMarkdown(
  snapshot: Snapshot,
  projects: ProjectIntel[],
  narratives: Narrative[]
): string {
  const n = snapshot.network;
  const v = snapshot.validators;
  const e = snapshot.economics;
  const anomalies = detectAnomalies(snapshot);
  const now = new Date(snapshot.generatedAt).toUTCString();

  const lines: string[] = [];
  lines.push(`# Solana Ecosystem Report`);
  lines.push("");
  lines.push(`_Generated ${now} · Automated by ᓄᑎᓐ NODIN_`);
  lines.push("");
  lines.push(`> Every material claim links to a source. Items marked [demo] are synthetic demo data used when a live source is unreachable.`);
  lines.push("");

  lines.push(`## 1. Ecosystem Pulse`);
  lines.push("");
  lines.push(
    `Solana health is **${n.health}**. The network is in epoch **${n.epoch}** (${(
      n.epochProgress * 100
    ).toFixed(1)}% complete) at slot **${n.slot.toLocaleString()}** with block height **${n.blockHeight.toLocaleString()}**. Throughput is **${n.tps.toLocaleString()} TPS** at an average slot time of **${n.avgSlotTimeSec.toFixed(
      3
    )}s**.`
  );
  lines.push("");
  lines.push(
    `SOL trades at **$${e.sol.price.toFixed(2)}** (${e.sol.change24h >= 0 ? "+" : ""}${e.sol.change24h.toFixed(
      1
    )}% / 24h; mcap $${fmt(e.sol.marketCap)}). Total Solana TVL is **${e.tvl !== null ? "$" + fmt(e.tvl) : "unavailable"}** with **${e.dexVolume !== null ? "$" + fmt(e.dexVolume) : "unavailable"}** recent DEX volume.`
  );
  lines.push("");

  lines.push(`## 2. Network Performance`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Health | ${n.health} |`);
  lines.push(`| Current slot | ${n.slot.toLocaleString()} |`);
  lines.push(`| Block height | ${n.blockHeight.toLocaleString()} |`);
  lines.push(`| Epoch | ${n.epoch} (${(n.epochProgress * 100).toFixed(1)}%) |`);
  lines.push(`| TPS | ${n.tps.toLocaleString()} |`);
  lines.push(`| Avg slot time | ${n.avgSlotTimeSec.toFixed(3)}s |`);
  lines.push(`| Slots / sec | ${n.slotsPerSecond.toFixed(2)} |`);
  lines.push(`| Total transactions | ${n.transactionCount.toLocaleString()} |`);
  lines.push("");
  lines.push(`**Activity:** ~${fmt(e.dailyTransactions)} transactions / 24h, ${e.dailyActiveWallets !== null ? "~" + fmt(e.dailyActiveWallets) + " daily active wallets (est.)" : "daily active wallets unavailable"}.`);
  lines.push("");

  lines.push(`## 3. Validator Status`);
  lines.push("");
  lines.push(
    `**${v.total}** validators total — **${v.active}** active, **${v.delinquent}** delinquent. Total stake **${fmt(
      v.totalStakeSol
    )} SOL**, average commission **${(v.avgCommission * 100).toFixed(1)}%**.`
  );
  lines.push("");
  lines.push(`| # | Validator | Stake (SOL) | Commission |`);
  lines.push(`| --- | --- | --- | --- |`);
  v.topValidators.forEach((t, i) =>
    lines.push(`| ${i + 1} | ${t.votePubkey} | ${t.stakeSol.toLocaleString(undefined, { maximumFractionDigits: 0 })} | ${(t.commission * 100).toFixed(1)}% |`)
  );
  lines.push("");

  lines.push(`## 4. Economic Indicators`);
  lines.push("");
  lines.push(`| Indicator | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| SOL price | $${e.sol.price.toFixed(2)} (${e.sol.change24h.toFixed(1)}% 24h) |`);
  lines.push(`| SOL market cap | $${fmt(e.sol.marketCap)} |`);
  lines.push(`| Solana TVL | ${e.tvl !== null ? "$" + fmt(e.tvl) : "unavailable"} |`);
  lines.push(`| DEX volume | ${e.dexVolume !== null ? "$" + fmt(e.dexVolume) : "unavailable"} |`);
  lines.push(`| Stablecoin supply | ${e.stablecoinSupply !== null ? "$" + fmt(e.stablecoinSupply) : "unavailable"} |`);
  lines.push(`| REV (24h est.) | ${e.rev !== null ? "$" + fmt(e.rev) : "unavailable"} |`);
  lines.push(`| Median fee / tx | ${(e.medianFeeLamports / 1e6).toFixed(3)} µSOL (${e.medianFeeSol.toFixed(8)} SOL) |`);
  lines.push(`| Tokenized assets | ${e.tokenizedAssets !== null ? "$" + fmt(e.tokenizedAssets) : "unavailable"} |`);
  lines.push(`| Circulating supply | ${e.circulatingSupply !== null ? fmt(e.circulatingSupply) + " SOL" : "unavailable"} |`);
  lines.push(`| Total supply | ${e.totalSupply !== null ? fmt(e.totalSupply) + " SOL" : "unavailable"} |`);
  lines.push("");

  lines.push(`## 5. Ecosystem & Community News`);
  lines.push("");
  if (!snapshot.news.length) {
    lines.push(`_No live news available — solana.com/news RSS unreachable._`);
  } else {
    for (const item of snapshot.news.slice(0, 5)) {
      lines.push(`- **${item.title}** — ${item.summary} ([link](${item.url}))`);
    }
  }
  lines.push("");
  lines.push(`**Twitter / X pulse (best-effort keyless):**`);
  if (!snapshot.tweets.length) {
    lines.push(`_No tweets fetched._`);
  } else {
    for (const t of snapshot.tweets.slice(0, 4)) {
      lines.push(`- @${t.handle}: ${t.content.slice(0, 140)}${t.content.length > 140 ? "…" : ""}`);
    }
  }
  lines.push("");

  lines.push(`## 6. Narratives`);
  lines.push("");
  for (const na of narratives) {
    const arrow = na.trend === "up" ? "▲" : na.trend === "down" ? "▼" : "▬";
    lines.push(`- **${na.title}** ${arrow} — ${na.summary} (${na.representativeProjects.join(", ")})`);
  }
  lines.push("");

  lines.push(`## 7. Project Intelligence`);
  lines.push("");
  lines.push(`| Project | Category | TVL | 7d | Status |`);
  lines.push(`| --- | --- | --- | --- | --- |`);
  for (const p of projects) {
    lines.push(
      `| ${p.name} | ${p.category} | $${fmt(p.tvl)} | ${p.change7d >= 0 ? "+" : ""}${p.change7d.toFixed(
        1
      )}% | ${p.status} |`
    );
  }
  lines.push("");

  lines.push(`## 8. Upcoming Upgrades & SIMD`);
  lines.push("");
  for (const u of snapshot.upgrades) {
    lines.push(`- **${u.name}** (${u.status}): ${u.note}`);
  }
  lines.push("");

  lines.push(`## 9. Anomaly Detection`);
  lines.push("");
  if (!anomalies.length) {
    lines.push(`No anomalies detected against configured thresholds.`);
  } else {
    for (const a of anomalies) {
      lines.push(`- **[${a.severity.toUpperCase()}] ${a.title}** — ${a.detail}`);
    }
  }
  lines.push("");

  lines.push(`## 10. Sources`);
  lines.push("");
  for (const s of snapshot.sources) {
    lines.push(`- ${s.name} (${s.ok ? "ok" : "unreachable [demo]"}) — ${s.url}`);
  }
  lines.push("");
  lines.push(`_Sources: Solana RPC (on-chain), CoinGecko (price/mcap), DeFiLlama (TVL/volume/stablecoins), Solana.com RSS (news), GitHub SIMD (upgrades). All ingestion behind replaceable providers._`);
  lines.push("");

  return lines.join("\n");
}

export function buildReport(
  snapshot: Snapshot,
  projects: ProjectIntel[],
  narratives: Narrative[]
) {
  return {
    meta: {
      generatedAt: snapshot.generatedAt,
      report: "solana-ecosystem",
      version: "1.1.0",
      generator: "NODIN",
    },
    snapshot,
    projects,
    narratives,
    anomalies: detectAnomalies(snapshot),
    markdown: buildMarkdown(snapshot, projects, narratives),
  };
}

function fmt(n: number): string {
  if (!isFinite(n) || n <= 0) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(0);
}