import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import type { ProtocolListItem, ProtocolDetail } from "../lib/nodin";
import { cn } from "../lib/utils";

type ChartPoint = { date: number; tvl: number };

const CATEGORY_ORDER = [
  "Spot DEXs",
  "Perp DEXs",
  "Lending",
  "Vaults",
  "Launchpads",
  "Liquid Staking",
  "Real-World Assets",
  "Bridges",
  "Oracles",
  "Prediction Markets",
  "Synthetics",
  "Options",
  "Insurance",
  "NFT Marketplace",
  "Stablecoins",
];

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function ProtocolExplorer() {
  const [directory, setDirectory] = useState<Record<string, ProtocolListItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<ProtocolDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    fetch("/api/insight/protocols")
      .then((r) => r.json())
      .then((data) => {
        setDirectory(data);
        const cats = Object.keys(data);
        if (cats.length > 0) setActiveCategory(cats[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadDetail = useCallback((slug: string) => {
    setDetailLoading(true);
    setChartLoading(true);
    setDetail(null);
    setChartData([]);
    fetch(`/api/insight/protocols/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setDetail(data);
        setDetailLoading(false);
      })
      .catch(() => setDetailLoading(false));
    fetch(`/api/insight/protocols/${slug}/chart?days=90`)
      .then((r) => r.json())
      .then((data) => {
        setChartData(data.points || []);
        setChartLoading(false);
      })
      .catch(() => setChartLoading(false));
  }, []);

  // Flatten all protocols for search
  const allProtocols = Object.values(directory).flat();
  const searchResults = search
    ? allProtocols
        .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.solanaTvl - a.solanaTvl)
        .slice(0, 20)
    : [];

  const protocols = activeCategory ? directory[activeCategory] || [] : [];

  if (loading) {
    return (
      <div className="border-b border-border px-6 lg:px-10 py-10">
        <h3 className="text-lg font-bold text-foreground mb-1">Protocol Explorer</h3>
        <p className="text-xs text-muted-foreground mb-6">Browse Solana protocols by category</p>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-card/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border px-6 lg:px-10 py-10">
      <h3 className="text-lg font-bold text-foreground mb-1">Protocol Explorer</h3>
      <p className="text-xs text-muted-foreground mb-6">
        Solana protocols by sector — click any protocol for detailed financials
      </p>

      {/* Search bar */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search protocols..."
          className="w-full max-w-md bg-card/50 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
        />
      </div>

      {/* Search results override category view */}
      {search && searchResults.length > 0 ? (
        <div className="space-y-1">
          {searchResults.map((p) => (
            <ProtocolRow key={p.id} protocol={p} onClick={() => loadDetail(p.slug)} />
          ))}
        </div>
      ) : search ? (
        <p className="text-sm text-muted-foreground">No protocols found for "{search}"</p>
      ) : (
        <div className="flex gap-6">
          {/* Category sidebar */}
          <div className="w-48 shrink-0 space-y-0.5 nodin-scroll overflow-y-auto max-h-[500px]">
            {CATEGORY_ORDER.filter((c) => directory[c]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded text-xs font-medium transition-colors",
                  activeCategory === cat
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/30"
                )}
              >
                {cat}
                <span className="ml-2 text-[9px] opacity-50">
                  {directory[cat]?.length || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Protocol list */}
          <div className="flex-1 space-y-1">
            {protocols.map((p) => (
              <ProtocolRow key={p.id} protocol={p} onClick={() => loadDetail(p.slug)} />
            ))}
          </div>
        </div>
      )}

      {/* Detail panel */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4"
          onClick={() => {
            setDetail(null);
            setDetailLoading(false);
          }}
        >
          <div
            className="bg-card border border-border rounded-lg max-w-2xl w-full p-6 max-h-[70vh] overflow-y-auto nodin-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="space-y-3">
                <div className="h-8 bg-muted/10 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-muted/10 rounded animate-pulse" />
                <div className="h-32 bg-muted/10 rounded animate-pulse" />
              </div>
            ) : detail ? (
              <ProtocolDetailPanel
                detail={detail}
                chartData={chartData}
                chartLoading={chartLoading}
                onClose={() => {
                  setDetail(null);
                  setDetailLoading(false);
                }}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function ProtocolRow({
  protocol,
  onClick,
}: {
  protocol: ProtocolListItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 rounded border border-border/30 hover:border-primary/30 hover:bg-card/20 transition-all group text-left"
    >
      <div className="flex items-center gap-3">
        <span className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
          {protocol.name}
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60">
          {protocol.category}
        </span>
        {protocol.ecosystemProjectId && (
          <Link
            to={`/ecosystem/${protocol.ecosystemProjectId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[9px] text-accent hover:text-foreground transition-colors"
          >
            → ecosystem
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono tabular-nums text-foreground">
          {fmtUsd(protocol.solanaTvl)}
        </span>
        {protocol.solanaTvl > 0 && (
          <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            →
          </span>
        )}
      </div>
    </button>
  );
}

function ProtocolDetailPanel({
  detail,
  chartData,
  chartLoading,
  onClose,
}: {
  detail: ProtocolDetail;
  chartData: ChartPoint[];
  chartLoading: boolean;
  onClose: () => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-xl font-bold text-foreground">{detail.name}</h4>
          <p className="text-xs font-mono uppercase tracking-widest text-primary mt-1">
            {detail.category}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Metric label="Solana TVL" value={fmtUsd(detail.solanaTvl)} />
        <Metric label="Total TVL" value={fmtUsd(detail.totalTvl)} />
        {detail.change_1d != null && (
          <Metric
            label="24h Change"
            value={`${detail.change_1d >= 0 ? "+" : ""}${detail.change_1d.toFixed(2)}%`}
            color={detail.change_1d >= 0 ? "text-primary" : "text-destructive"}
          />
        )}
        {detail.change_7d != null && (
          <Metric
            label="7d Change"
            value={`${detail.change_7d >= 0 ? "+" : ""}${detail.change_7d.toFixed(2)}%`}
            color={detail.change_7d >= 0 ? "text-primary" : "text-destructive"}
          />
        )}
        {detail.mcap != null && <Metric label="Market Cap" value={fmtUsd(detail.mcap)} />}
        {detail.chains.length > 1 && (
          <Metric label="Chains" value={`${detail.chains.length}`} />
        )}
      </div>

      {/* TVL Chart */}
      <div className="mb-6">
        <h5 className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
          Solana TVL — 90 Days
        </h5>
        {chartLoading ? (
          <div className="h-32 bg-muted/10 rounded animate-pulse" />
        ) : chartData.length > 1 ? (
          <TvlChart data={chartData} />
        ) : (
          <p className="text-xs text-muted-foreground">No historical data available</p>
        )}
      </div>

      {/* Description */}
      {detail.description && (
        <div className="mb-6">
          <h5 className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Description
          </h5>
          <p className="text-sm text-foreground/80 leading-relaxed">{detail.description}</p>
        </div>
      )}

      {/* Chains */}
      {detail.chains.length > 0 && (
        <div className="mb-6">
          <h5 className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Chains
          </h5>
          <div className="flex flex-wrap gap-2">
            {detail.chains.map((c) => (
              <span
                key={c}
                className={cn(
                  "px-2 py-1 rounded text-[10px] font-mono",
                  c === "Solana"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/10 text-muted-foreground"
                )}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Audit links */}
      {detail.audit_links && detail.audit_links.length > 0 && (
        <div className="mb-6">
          <h5 className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Audits
          </h5>
          <div className="space-y-1">
            {detail.audit_links.map((link, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-primary hover:underline"
              >
                {link.length > 60 ? link.slice(0, 60) + "..." : link}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Misc metadata */}
      {detail.misc && Object.keys(detail.misc).length > 0 && (
        <div className="mb-6">
          <h5 className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Metadata
          </h5>
          <div className="space-y-1">
            {Object.entries(detail.misc).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-foreground font-mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* External links + download */}
      <div className="flex gap-3 pt-4 border-t border-border flex-wrap">
        {detail.url && (
          <a
            href={detail.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Website ↗
          </a>
        )}
        {detail.twitter && (
          <a
            href={detail.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Twitter ↗
          </a>
        )}
        <button
          onClick={() => downloadProtocolReport(detail, chartData)}
          className="text-xs text-primary hover:underline ml-auto"
        >
          Download Report ↓
        </button>
        {detail.parentProtocols && detail.parentProtocols.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Parent: {detail.parentProtocols.join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-muted/5 rounded p-3">
      <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </p>
      <p className={cn("text-sm font-mono tabular-nums", color || "text-foreground")}>{value}</p>
    </div>
  );
}

function TvlChart({ data }: { data: ChartPoint[] }) {
  const W = 520;
  const H = 140;
  const PAD = 8;
  if (data.length < 2) return null;

  const tvls = data.map((d) => d.tvl);
  const minTvl = Math.min(...tvls);
  const maxTvl = Math.max(...tvls);
  const range = maxTvl - minTvl || 1;
  const minDate = data[0].date;
  const maxDate = data[data.length - 1].date;

  const points = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - 2 * PAD);
    const y = H - PAD - ((d.tvl - minTvl) / range) * (H - 2 * PAD);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const isUp = data[data.length - 1].tvl >= data[0].tvl;
  const stroke = isUp ? "#00F5D4" : "#ef4444";
  const fill = isUp ? "rgba(0,245,212,0.08)" : "rgba(239,68,68,0.08)";
  const areaPath = `M ${points[0]} L ${points.join(" L ")} L ${(W - PAD).toFixed(1)},${(H - PAD).toFixed(1)} L ${PAD.toFixed(1)},${(H - PAD).toFixed(1)} Z`;

  const fmtTvl = (n: number) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[9px] font-mono text-muted-foreground">
          {new Date(minDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
        <span className="text-[9px] font-mono text-muted-foreground">
          {new Date(maxDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
        <path d={areaPath} fill={fill} />
        <polyline points={points.join(" ")} fill="none" stroke={stroke} strokeWidth="1.5" />
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-mono text-muted-foreground">{fmtTvl(minTvl)}</span>
        <span className={cn("text-[9px] font-mono", isUp ? "text-primary" : "text-destructive")}>
          {fmtTvl(maxTvl)}
        </span>
      </div>
    </div>
  );
}

function downloadProtocolReport(
  detail: ProtocolDetail,
  chartData: ChartPoint[]
) {
  const lines: string[] = [];
  lines.push(`# ${detail.name}`);
  lines.push("");
  lines.push(`_Generated ${new Date().toISOString()} · NODIN Protocol Report_`);
  lines.push("");
  lines.push(`## Overview`);
  lines.push("");
  lines.push(`- **Category:** ${detail.category}`);
  lines.push(`- **Solana TVL:** $${detail.solanaTvl.toLocaleString()}`);
  lines.push(`- **Total TVL:** $${detail.totalTvl.toLocaleString()}`);
  if (detail.change_1d != null) {
    lines.push(`- **24h Change:** ${detail.change_1d >= 0 ? "+" : ""}${detail.change_1d.toFixed(2)}%`);
  }
  if (detail.change_7d != null) {
    lines.push(`- **7d Change:** ${detail.change_7d >= 0 ? "+" : ""}${detail.change_7d.toFixed(2)}%`);
  }
  if (detail.mcap != null) {
    lines.push(`- **Market Cap:** $${detail.mcap.toLocaleString()}`);
  }
  lines.push(`- **Chains:** ${detail.chains.join(", ") || "Solana"}`);
  lines.push("");

  if (detail.description) {
    lines.push(`## Description`);
    lines.push("");
    lines.push(detail.description);
    lines.push("");
  }

  if (chartData.length > 1) {
    lines.push(`## TVL History (90 days)`);
    lines.push("");
    lines.push(`| Date | TVL (USD) |`);
    lines.push(`| --- | --- |`);
    for (const p of chartData) {
      lines.push(`| ${new Date(p.date * 1000).toISOString().slice(0, 10)} | $${p.tvl.toLocaleString()} |`);
    }
    lines.push("");
  }

  if (detail.audit_links && detail.audit_links.length > 0) {
    lines.push(`## Audits`);
    lines.push("");
    for (const link of detail.audit_links) {
      lines.push(`- ${link}`);
    }
    lines.push("");
  }

  if (detail.misc && Object.keys(detail.misc).length > 0) {
    lines.push(`## Metadata`);
    lines.push("");
    for (const [k, v] of Object.entries(detail.misc)) {
      lines.push(`- **${k}:** ${v}`);
    }
    lines.push("");
  }

  if (detail.url || detail.twitter) {
    lines.push(`## Links`);
    lines.push("");
    if (detail.url) lines.push(`- Website: ${detail.url}`);
    if (detail.twitter) lines.push(`- Twitter: ${detail.twitter}`);
    lines.push("");
  }

  const md = lines.join("\n");
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${detail.slug || detail.name.toLowerCase().replace(/\s+/g, "-")}-report.md`;
  a.click();
  URL.revokeObjectURL(url);
}
