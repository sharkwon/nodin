import { useState, useEffect, useCallback, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Search, ExternalLink, Github, FileText, MessageCircle } from "lucide-react";
import type { ProtocolListItem, ProtocolDetail } from "@/lib/nodin";
import type {
  EcosystemProjectSummary,
  EcosystemProjectDetail,
  CoverageSummary,
} from "@/lib/ecosystem-api";
import { cn } from "@/lib/utils";

type ChartPoint = { date: number; tvl: number };
type Directory = Record<string, ProtocolListItem[]>;

const CATEGORY_ORDER = [
  "Spot DEXs", "Perp DEXs", "Lending", "Vaults", "Launchpads",
  "Liquid Staking", "Real-World Assets", "Bridges", "Oracles",
  "Prediction Markets", "Synthetics", "Options", "Insurance", "NFT Marketplace",
];

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

type Selection =
  | { type: "default" }
  | { type: "category"; category: string }
  | { type: "project"; slug: string; ecoId?: string | null };

export function ProtocolToolbox() {
  const [directory, setDirectory] = useState<Directory>({});
  const [ecoProjects, setEcoProjects] = useState<Record<string, EcosystemProjectSummary>>({});
  const [coverage, setCoverage] = useState<CoverageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection>({ type: "default" });
  const [search, setSearch] = useState("");

  // detail state
  const [detail, setDetail] = useState<ProtocolDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [ecoDetail, setEcoDetail] = useState<EcosystemProjectDetail | null>(null);
  const [ecoDetailLoading, setEcoDetailLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/insight/protocols").then((r) => r.json()),
      fetch("/api/ecosystem/projects").then((r) => r.json()),
      fetch("/api/ecosystem/coverage").then((r) => r.json()),
    ])
      .then(([protoDir, ecoResp, covResp]) => {
        setDirectory(protoDir);
        const ecoMap: Record<string, EcosystemProjectSummary> = {};
        for (const p of ecoResp.projects || []) {
          ecoMap[p.id] = p;
        }
        setEcoProjects(ecoMap);
        setCoverage(covResp);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadDetail = useCallback((slug: string, ecoId?: string | null) => {
    setDetailLoading(true);
    setChartLoading(true);
    setEcoDetailLoading(true);
    setDetail(null);
    setChartData([]);
    setEcoDetail(null);

    fetch(`/api/insight/protocols/${slug}`)
      .then((r) => r.json())
      .then((data) => { setDetail(data); setDetailLoading(false); })
      .catch(() => setDetailLoading(false));

    fetch(`/api/insight/protocols/${slug}/chart?days=90`)
      .then((r) => r.json())
      .then((data) => { setChartData(data.points || []); setChartLoading(false); })
      .catch(() => setChartLoading(false));

    if (ecoId) {
      fetch(`/api/ecosystem/projects/${ecoId}`)
        .then((r) => r.json())
        .then((data) => { setEcoDetail(data); setEcoDetailLoading(false); })
        .catch(() => setEcoDetailLoading(false));
    } else {
      setEcoDetailLoading(false);
    }
  }, []);

  const allProtocols = useMemo(() => Object.values(directory).flat(), [directory]);
  const searchResults = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return allProtocols
      .filter((p) => p.name.toLowerCase().includes(q))
      .sort((a, b) => b.solanaTvl - a.solanaTvl)
      .slice(0, 20);
  }, [search, allProtocols]);

  const totalTvl = useMemo(
    () => allProtocols.reduce((s, p) => s + p.solanaTvl, 0),
    [allProtocols]
  );

  const categories = useMemo(
    () => CATEGORY_ORDER.filter((c) => directory[c]),
    [directory]
  );

  // Coverage per category — match ecosystem coverage by label
  const coverageByLabel = useMemo(() => {
    const m: Record<string, any> = {};
    if (coverage) {
      for (const c of coverage.perCategory || []) {
        m[c.categoryLabel] = c;
      }
    }
    return m;
  }, [coverage]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-border border border-border rounded-xl overflow-hidden">
      {/* TOOLBOX ~25% */}
      <div className="lg:col-span-3 bg-card p-5 flex flex-col gap-3 max-h-[700px] overflow-y-auto nodin-scroll">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search protocols..."
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2.5 font-mono text-xs text-slate-200 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted/10 rounded animate-pulse" />)}
          </div>
        ) : search ? (
          <div className="space-y-1">
            {searchResults.map((p) => {
              const eco = p.ecosystemProjectId ? ecoProjects[p.ecosystemProjectId] : null;
              return (
                <ProjectRow
                  key={p.id}
                  name={p.name}
                  tvl={p.solanaTvl}
                  hasLiveData={eco?.hasLiveData}
                  dataSourceCount={eco?.dataSourceCount}
                  active={selection.type === "project" && selection.slug === p.slug}
                  onClick={() => { setSelection({ type: "project", slug: p.slug, ecoId: p.ecosystemProjectId }); loadDetail(p.slug, p.ecosystemProjectId); }}
                />
              );
            })}
            {searchResults.length === 0 && (
              <p className="font-mono text-xs text-muted-foreground">No protocols found</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {/* All Protocols */}
            <button
              onClick={() => setSelection({ type: "default" })}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all",
                selection.type === "default" ? "bg-primary/10 border border-primary/30" : "border border-transparent hover:bg-background/50"
              )}
            >
              <span className={cn("font-mono text-sm font-bold uppercase", selection.type === "default" ? "text-primary" : "text-slate-200")}>All Protocols</span>
              <div className="flex items-center gap-3">
                {coverage && (
                  <span className="font-mono text-[9px] text-primary/70">{(coverage.overallCoverageScore * 100).toFixed(0)}%</span>
                )}
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{allProtocols.length}</span>
              </div>
            </button>

            {/* Categories */}
            {categories.map((cat) => {
              const protos = directory[cat] || [];
              const catTvl = protos.reduce((s, p) => s + p.solanaTvl, 0);
              const isActive = selection.type === "category" && selection.category === cat;
              const cov = coverageByLabel[cat];
              return (
                <div key={cat} className="flex flex-col">
                  <button
                    onClick={() => setSelection({ type: "category", category: cat })}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all",
                      isActive ? "bg-primary/10 border border-primary/30" : "border border-transparent hover:bg-background/50"
                    )}
                  >
                    <span className={cn("font-mono text-sm font-bold uppercase", isActive ? "text-primary" : "text-slate-200")}>{cat}</span>
                    <div className="flex items-center gap-3">
                      {cov && <span className="font-mono text-[9px] text-primary/70">{(cov.coverageScore * 100).toFixed(0)}%</span>}
                      <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{fmtUsd(catTvl)}</span>
                      <span className="font-mono text-[10px] text-muted-foreground/60">{protos.length}</span>
                    </div>
                  </button>
                  {/* Nested projects */}
                  <div className="ml-4 flex flex-col border-l border-border">
                    {[...protos].sort((a, b) => b.solanaTvl - a.solanaTvl).slice(0, 6).map((p) => {
                      const eco = p.ecosystemProjectId ? ecoProjects[p.ecosystemProjectId] : null;
                      const isProjActive = selection.type === "project" && selection.slug === p.slug;
                      return (
                        <button
                          key={p.id}
                          onClick={() => { setSelection({ type: "project", slug: p.slug, ecoId: p.ecosystemProjectId }); loadDetail(p.slug, p.ecosystemProjectId); }}
                          className={cn(
                            "flex items-center justify-between px-3 py-1.5 ml-2 border-l-2 transition-all",
                            isProjActive ? "border-primary bg-primary/5 text-primary" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-background/30"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {eco && (
                              <span className={cn("w-1.5 h-1.5 rounded-full", eco.hasLiveData ? "bg-primary" : "bg-muted-foreground/40")} />
                            )}
                            <span className="font-mono text-xs">{p.name}</span>
                          </div>
                          <span className={cn("font-mono text-[9px] tabular-nums", p.solanaTvl > 0 ? "text-muted-foreground" : "text-muted-foreground/40")}>
                            {p.solanaTvl > 0 ? fmtUsd(p.solanaTvl) : "—"}
                          </span>
                        </button>
                      );
                    })}
                    {protos.length > 6 && (
                      <button
                        onClick={() => setSelection({ type: "category", category: cat })}
                        className="ml-2 px-3 py-1 text-[10px] font-mono text-muted-foreground/60 hover:text-primary transition-colors"
                      >
                        +{protos.length - 6} more →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL PANEL ~75% */}
      <div className="lg:col-span-9 bg-card p-8 min-h-[700px] max-h-[700px] overflow-y-auto nodin-scroll">
        {selection.type === "default" && <DefaultPanel directory={directory} totalTvl={totalTvl} coverage={coverage} ecoProjects={ecoProjects} />}
        {selection.type === "category" && <CategoryPanel category={selection.category} protocols={directory[selection.category] || []} ecoProjects={ecoProjects} coverage={coverageByLabel[selection.category]} />}
        {selection.type === "project" && (
          <ProjectPanel
            detail={detail}
            detailLoading={detailLoading}
            chartData={chartData}
            chartLoading={chartLoading}
            ecoDetail={ecoDetail}
            ecoDetailLoading={ecoDetailLoading}
          />
        )}
      </div>
    </div>
  );
}

/* ── Toolbox row for search results ── */
function ProjectRow({ name, tvl, hasLiveData, dataSourceCount, active, onClick }: { name: string; tvl: number; hasLiveData?: boolean; dataSourceCount?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-3 py-2 rounded-lg transition-all",
        active ? "bg-primary/10 border border-primary/30" : "border border-transparent hover:bg-background/50"
      )}
    >
      <div className="flex items-center gap-2">
        {hasLiveData != null && (
          <span className={cn("w-1.5 h-1.5 rounded-full", hasLiveData ? "bg-primary" : "bg-muted-foreground/40")} />
        )}
        <span className={cn("font-mono text-xs", active ? "text-primary" : "text-slate-300")}>{name}</span>
      </div>
      <div className="flex items-center gap-3">
        {dataSourceCount != null && dataSourceCount > 0 && (
          <span className="font-mono text-[9px] text-muted-foreground/60">{dataSourceCount} src</span>
        )}
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{tvl > 0 ? fmtUsd(tvl) : "—"}</span>
      </div>
    </button>
  );
}

/* ── Default panel: network overview + coverage summary ── */
function DefaultPanel({ directory, totalTvl, coverage, ecoProjects }: { directory: Directory; totalTvl: number; coverage: CoverageSummary | null; ecoProjects: Record<string, EcosystemProjectSummary> }) {
  const topProtocols = useMemo(() => {
    return Object.values(directory)
      .flat()
      .sort((a, b) => b.solanaTvl - a.solanaTvl)
      .slice(0, 10);
  }, [directory]);
  const maxTvl = topProtocols[0]?.solanaTvl || 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between border-b border-border pb-4">
        <h3 className="font-sans font-black text-2xl text-slate-100 tracking-tight uppercase">Solana Ecosystem Overview</h3>
        <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">Network Summary</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden">
        <StatCard label="TOTAL TVL" value={fmtUsd(totalTvl)} highlight />
        <StatCard label="PROTOCOLS" value={String(Object.values(directory).flat().length)} />
        <StatCard label="CATEGORIES" value={String(Object.keys(directory).length)} />
        <StatCard label="COVERAGE" value={coverage ? `${(coverage.overallCoverageScore * 100).toFixed(0)}%` : "---"} highlight />
      </div>

      {/* Coverage breakdown */}
      {coverage && (
        <div>
          <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-3 uppercase">Coverage Breakdown</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CovBar label="Registry" pct={coverage.separated.registryCoverage * 100} sub={`${coverage.separated.totalProjects} projects`} />
            <CovBar label="Data Sources" pct={coverage.separated.sourceCoverage * 100} sub={`${coverage.separated.projectsWithRegisteredSource} sourced`} />
            <CovBar label="Live Data" pct={coverage.separated.liveDataCoverage * 100} sub={`${coverage.separated.projectsWithLiveData} live`} />
            <CovBar label="Completeness" pct={coverage.separated.completeness * 100} sub={`${(coverage.separated.completeness * 100).toFixed(0)}% avg`} />
          </div>
        </div>
      )}

      {/* Top 10 protocols */}
      <div>
        <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-4 uppercase">Top 10 Protocols by TVL</h4>
        <div className="space-y-2">
          {topProtocols.map((p, i) => {
            const pct = (p.solanaTvl / maxTvl) * 100;
            const barWidth = Math.max(2, pct);
            const eco = p.ecosystemProjectId ? ecoProjects[p.ecosystemProjectId] : null;
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-muted-foreground/60 w-6">{i + 1}</span>
                <div className="flex items-center gap-2 w-44">
                  {eco && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", eco.hasLiveData ? "bg-primary" : "bg-muted-foreground/40")} />}
                  <span className="font-mono text-xs text-slate-200 truncate">{p.name}</span>
                </div>
                <div className="flex-1 h-5 bg-background rounded relative overflow-hidden border border-border/30">
                  <div className="h-full bg-primary/20 rounded" style={{ width: `${barWidth}%` }} />
                </div>
                <span className="font-mono text-xs text-primary tabular-nums w-20 text-right">{fmtUsd(p.solanaTvl)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Category panel ── */
function CategoryPanel({ category, protocols, ecoProjects, coverage }: { category: string; protocols: ProtocolListItem[]; ecoProjects: Record<string, EcosystemProjectSummary>; coverage?: any }) {
  const totalTvl = protocols.reduce((s, p) => s + p.solanaTvl, 0);
  const maxTvl = protocols[0]?.solanaTvl || 1;
  const sorted = [...protocols].sort((a, b) => b.solanaTvl - a.solanaTvl);
  const liveCount = protocols.filter((p) => p.ecosystemProjectId && ecoProjects[p.ecosystemProjectId]?.hasLiveData).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between border-b border-border pb-4">
        <h3 className="font-sans font-black text-2xl text-slate-100 tracking-tight uppercase">{category}</h3>
        <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">Category Overview</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden">
        <StatCard label="CATEGORY TVL" value={fmtUsd(totalTvl)} highlight />
        <StatCard label="PROJECTS" value={String(protocols.length)} />
        <StatCard label="LIVE DATA" value={String(liveCount)} />
        <StatCard label="COVERAGE" value={coverage ? `${(coverage.coverageScore * 100).toFixed(0)}%` : "---"} />
      </div>

      <div>
        <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-4 uppercase">All Projects — Ranked by TVL</h4>
        <div className="space-y-2">
          {sorted.map((p, i) => {
            const pct = maxTvl > 0 ? (p.solanaTvl / maxTvl) * 100 : 0;
            const barWidth = Math.max(1, pct);
            const eco = p.ecosystemProjectId ? ecoProjects[p.ecosystemProjectId] : null;
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-muted-foreground/60 w-6">{i + 1}</span>
                <div className="flex items-center gap-2 w-48">
                  {eco && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", eco.hasLiveData ? "bg-primary" : "bg-muted-foreground/40")} />}
                  <span className="font-mono text-xs text-slate-200 truncate">{p.name}</span>
                </div>
                <div className="flex-1 h-5 bg-background rounded relative overflow-hidden border border-border/30">
                  <div className="h-full bg-primary/20 rounded" style={{ width: `${barWidth}%` }} />
                </div>
                {eco && eco.dataSourceCount > 0 && <span className="font-mono text-[9px] text-muted-foreground/60 w-10 text-right">{eco.dataSourceCount} src</span>}
                <span className="font-mono text-xs text-primary tabular-nums w-20 text-right">{p.solanaTvl > 0 ? fmtUsd(p.solanaTvl) : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Project detail panel ── */
function ProjectPanel({ detail, detailLoading, chartData, chartLoading, ecoDetail, ecoDetailLoading }: {
  detail: ProtocolDetail | null;
  detailLoading: boolean;
  chartData: ChartPoint[];
  chartLoading: boolean;
  ecoDetail: EcosystemProjectDetail | null;
  ecoDetailLoading: boolean;
}) {
  if (detailLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 bg-muted/10 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-muted/10 rounded animate-pulse" />)}</div>
        <div className="h-48 bg-muted/10 rounded animate-pulse" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-mono text-xs text-muted-foreground tracking-wider uppercase">Select a protocol to view details</p>
      </div>
    );
  }

  const isUp1d = (detail.change_1d ?? 0) >= 0;
  const isUp7d = (detail.change_7d ?? 0) >= 0;
  const chartDataFormatted = chartData.map((d) => ({ ...d, dateStr: new Date(d.date * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }) }));
  const chartIsUp = chartData.length >= 2 ? chartData[chartData.length - 1].tvl >= chartData[0].tvl : true;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-sans font-black text-2xl text-slate-100 tracking-tight uppercase">{detail.name}</h3>
            {ecoDetail?.token && (
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{ecoDetail.token.symbol}</span>
            )}
          </div>
          <p className="font-mono text-[10px] text-primary mt-1 uppercase tracking-widest">{detail.category}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {ecoDetail && (
            <>
              <span className={cn("font-mono text-[10px] px-2 py-0.5 rounded uppercase tracking-wider", ecoDetail.status === "active" ? "bg-primary/10 text-primary" : "bg-muted/10 text-muted-foreground")}>{ecoDetail.status}</span>
              <span className="font-mono text-[9px] text-muted-foreground">{ecoDetail.verificationStage}</span>
            </>
          )}
        </div>
      </div>

      {/* Financial metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden">
        <StatCard label="SOLANA TVL" value={fmtUsd(detail.solanaTvl)} highlight />
        <StatCard label="TOTAL TVL" value={fmtUsd(detail.totalTvl)} />
        {detail.change_1d != null && <StatCard label="24H CHANGE" value={`${isUp1d ? "+" : ""}${detail.change_1d.toFixed(2)}%`} color={isUp1d ? "primary" : "red"} />}
        {detail.change_7d != null && <StatCard label="7D CHANGE" value={`${isUp7d ? "+" : ""}${detail.change_7d.toFixed(2)}%`} color={isUp7d ? "primary" : "red"} />}
      </div>

      {/* TVL Chart */}
      <div>
        <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-3 uppercase">TVL History — 90 Days</h4>
        {chartLoading ? (
          <div className="h-48 bg-muted/10 rounded animate-pulse" />
        ) : chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartDataFormatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartIsUp ? "#00F5D4" : "#ef4444"} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={chartIsUp ? "#00F5D4" : "#ef4444"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" opacity={0.3} />
              <XAxis dataKey="dateStr" stroke="#64748B" tick={{ fontSize: 9, fontFamily: "monospace" }} dy={8} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" tick={{ fontSize: 9, fontFamily: "monospace" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtUsd(v)} />
              <Tooltip contentStyle={{ backgroundColor: "#0E1626", borderColor: "#1C2A3F", borderRadius: "8px" }} labelStyle={{ color: "#64748B", fontFamily: "monospace" }} formatter={(v: number) => [fmtUsd(v), "TVL"]} />
              <Area type="monotone" dataKey="tvl" stroke={chartIsUp ? "#00F5D4" : "#ef4444"} strokeWidth={2} fill="url(#tvlGradient)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="font-mono text-xs text-muted-foreground">No historical data available</p>
        )}
      </div>

      {/* Ecosystem coverage data */}
      {ecoDetailLoading ? (
        <div className="h-20 bg-muted/10 rounded animate-pulse" />
      ) : ecoDetail ? (
        <>
          {/* Data completeness */}
          {ecoDetail.dataCompleteness && (
            <div>
              <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-3 uppercase">Data Completeness</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <CovBar label="Metadata" pct={ecoDetail.dataCompleteness.metadata * 100} />
                <CovBar label="Market Data" pct={ecoDetail.dataCompleteness.marketData * 100} />
                <CovBar label="On-Chain" pct={ecoDetail.dataCompleteness.onChainData * 100} />
                <CovBar label="Social" pct={ecoDetail.dataCompleteness.socialData * 100} />
                <CovBar label="News" pct={ecoDetail.dataCompleteness.newsData * 100} />
                <CovBar label="Historical" pct={ecoDetail.dataCompleteness.historicalData * 100} />
                <CovBar label="Overall" pct={ecoDetail.dataCompleteness.overall * 100} highlight />
              </div>
            </div>
          )}

          {/* Data sources health */}
          {ecoDetail.dataSources && ecoDetail.dataSources.length > 0 && (
            <div>
              <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-3 uppercase">Data Sources ({ecoDetail.dataSources.length})</h4>
              <div className="space-y-2">
                {ecoDetail.dataSources.map((src, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-background/50 rounded border border-border/30">
                    <div className="flex items-center gap-3">
                      <span className={cn("w-2 h-2 rounded-full", src.isLive ? "bg-primary" : "bg-red-400")} />
                      <span className="font-mono text-xs text-slate-200">{src.provider}</span>
                      <span className="font-mono text-[9px] text-muted-foreground uppercase">{src.type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {src.health && (
                        <span className={cn("font-mono text-[9px]", src.health.consecutiveFailures > 0 ? "text-red-400/70" : "text-muted-foreground")}>
                          {src.health.consecutiveFailures > 0 ? `${src.health.consecutiveFailures} fails` : "healthy"}
                        </span>
                      )}
                      <span className={cn("font-mono text-[9px] uppercase tracking-wider", src.isLive ? "text-primary" : "text-red-400")}>
                        {src.dataState}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {ecoDetail.description && (
            <div>
              <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-2 uppercase">Description</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{ecoDetail.description}</p>
            </div>
          )}

          {/* Token info */}
          {ecoDetail.token && (
            <div>
              <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-2 uppercase">Token</h4>
              <div className="flex flex-wrap gap-4 font-mono text-xs">
                <span className="text-slate-300">Symbol: <span className="text-primary">{ecoDetail.token.symbol}</span></span>
                <span className="text-slate-300">Name: <span className="text-primary">{ecoDetail.token.name}</span></span>
                {ecoDetail.token.mintAddress && <span className="text-slate-300">Mint: <span className="text-muted-foreground">{ecoDetail.token.mintAddress.slice(0, 12)}...</span></span>}
              </div>
            </div>
          )}
        </>
      ) : !ecoDetailLoading && detail.description ? (
        <div>
          <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-2 uppercase">Description</h4>
          <p className="text-sm text-slate-300 leading-relaxed">{detail.description}</p>
        </div>
      ) : null}

      {/* Chains */}
      {detail.chains && detail.chains.length > 0 && (
        <div>
          <h4 className="font-mono text-xs text-muted-foreground tracking-wider mb-2 uppercase">Chains</h4>
          <div className="flex flex-wrap gap-2">
            {detail.chains.map((c) => (
              <span key={c} className={cn("font-mono text-[10px] px-2 py-1 rounded", c === "Solana" ? "bg-primary/10 text-primary" : "bg-muted/10 text-muted-foreground")}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      <div className="flex gap-4 pt-4 border-t border-border flex-wrap">
        {detail.url && <a href={detail.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink size={12} /> Website</a>}
        {ecoDetail?.docs && <a href={ecoDetail.docs} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><FileText size={12} /> Docs</a>}
        {ecoDetail?.github && <a href={ecoDetail.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Github size={12} /> GitHub</a>}
        {detail.twitter && <a href={detail.twitter.startsWith("http") ? detail.twitter : `https://twitter.com/${detail.twitter}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink size={12} /> Twitter</a>}
        {ecoDetail?.discord && <a href={ecoDetail.discord} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><MessageCircle size={12} /> Discord</a>}
        {detail.parentProtocols && detail.parentProtocols.length > 0 && <span className="text-xs text-muted-foreground ml-auto">Parent: {detail.parentProtocols.join(", ")}</span>}
      </div>
    </div>
  );
}

/* ── Reusable StatCard ── */
function StatCard({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: "primary" | "red" }) {
  const colorClass = color === "red" ? "text-red-400" : highlight ? "text-primary" : "text-slate-200";
  return (
    <div className="bg-card px-4 py-4 flex flex-col gap-1">
      <span className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase">{label}</span>
      <span className={cn("font-mono text-lg font-bold tabular-nums leading-none", colorClass)}>{value}</span>
    </div>
  );
}

/* ── Coverage bar ── */
function CovBar({ label, pct, sub, highlight }: { label: string; pct: number; sub?: string; highlight?: boolean }) {
  const barColor = pct >= 80 ? "bg-primary" : pct >= 50 ? "bg-primary/60" : pct >= 25 ? "bg-yellow-500/60" : "bg-red-400/60";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase">{label}</span>
        <span className={cn("font-mono text-[10px] tabular-nums", highlight ? "text-primary" : "text-slate-300")}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-background rounded-full overflow-hidden border border-border/30">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${Math.max(1, pct)}%` }} />
      </div>
      {sub && <span className="font-mono text-[8px] text-muted-foreground/60">{sub}</span>}
    </div>
  );
}
