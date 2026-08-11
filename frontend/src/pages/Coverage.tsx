/**
 * Coverage page — ecosystem intelligence dashboard
 *
 * "How complete is our intelligence?" — not a developer monitoring tool.
 * Visual hierarchy: registry = primary, then live data, then sub-metrics.
 */
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ecosystemApi } from "@/lib/ecosystem-api";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CoveragePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["ecosystem", "coverage"],
    queryFn: ecosystemApi.coverage,
  });

  if (isLoading || !data) {
    return (
      <div className="container-editorial py-12">
        <div className="skeleton h-10 w-64 rounded mb-8" />
        <div className="skeleton h-32 rounded-lg mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const sep = data.separated;

  return (
    <div className="container-editorial py-12">
      <div className="mb-12">
        <h1 className="text-h1 text-foreground">Ecosystem Coverage</h1>
        <p className="mt-3 text-body text-muted-foreground max-w-2xl">
          Transparent metrics showing what we know, what we don't, and how fresh our data is.
          These metrics are never combined into a single misleading score.
        </p>
      </div>

      {/* Primary stat — Registry */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="mb-8 p-8 rounded-xl border border-border bg-surface"
      >
        <div className="flex items-end justify-between">
          <div>
            <span className="text-label text-muted-foreground">Registry Coverage</span>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-metric-lg text-foreground tabular-nums">{sep.totalProjects}</span>
              <span className="text-body text-muted-foreground">canonical projects tracked</span>
            </div>
          </div>
          <span className="text-h2 text-foreground tabular-nums">{Math.round(sep.registryCoverage * 100)}%</span>
        </div>
      </motion.div>

      {/* Secondary stats — 2x2 grid with clear hierarchy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <SecondaryStat label="Live Data" value={`${sep.projectsWithLiveData}`} sub={`/ ${sep.totalProjects}`} pct={sep.liveDataCoverage} state="available" />
        <SecondaryStat label="With Source" value={`${sep.projectsWithRegisteredSource}`} sub={`/ ${sep.totalProjects}`} pct={sep.sourceCoverage} state="available" />
        <SecondaryStat label="Completeness" value={`${Math.round(sep.completeness * 100)}%`} sub="avg coverage" pct={sep.completeness} state="stale" />
        <SecondaryStat label="Freshness" value={`${Math.round(sep.freshness * 100)}%`} sub="recently checked" pct={sep.freshness} state="available" />
      </div>

      {/* Project status breakdown — editorial, not cards */}
      <section className="mb-12">
        <h2 className="text-h3 text-foreground mb-6">Project Data Status</h2>
        <div className="space-y-3 max-w-2xl">
          <StatusRow label="With live data" count={sep.projectsWithLiveData} total={sep.totalProjects} state="available" />
          <StatusRow label="Metadata only" count={sep.projectsMetadataOnly} total={sep.totalProjects} state="stale" />
          <StatusRow label="No data source" count={sep.projectsNoSource} total={sep.totalProjects} state="not_reported" />
        </div>
      </section>

      {/* Category coverage — editorial list, not dashboard */}
      <section className="mb-12">
        <h2 className="text-h3 text-foreground mb-6">Category Coverage</h2>
        <div className="space-y-1 max-w-3xl">
          {data.perCategory
            .filter((c) => c.registeredProjects > 0)
            .map((cat) => (
              <Link
                key={cat.category}
                to={`/ecosystem?category=${cat.category}`}
                className="flex items-center justify-between py-2.5 border-b border-border-subtle hover:border-border-strong transition-colors group"
              >
                <span className="text-body-sm text-secondary group-hover:text-foreground transition-colors">
                  {cat.categoryLabel}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-ticker text-muted-foreground tabular-nums">
                    {cat.projectsWithLiveData}/{cat.registeredProjects}
                  </span>
                  <div className="w-24">
                    <div className="h-1 rounded-full bg-border-subtle overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round(cat.coverageScore * 100)}%`,
                          background: cat.coverageScore >= 0.7 ? "var(--data-available)" : cat.coverageScore >= 0.3 ? "var(--data-stale)" : "var(--data-unavailable)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}

function SecondaryStat({ label, value, sub, pct, state }: {
  label: string;
  value: string;
  sub: string;
  pct: number;
  state: "available" | "stale" | "not_reported";
}) {
  return (
    <div className={cn("p-5 rounded-lg border border-border bg-surface")}>
      <span className="text-label text-muted-foreground">{label}</span>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-h3 text-foreground tabular-nums">{value}</span>
        <span className="text-body-sm text-muted-foreground">{sub}</span>
      </div>
      <div className="mt-3 h-1 rounded-full bg-border-subtle overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.round(pct * 100)}%`,
            background: state === "available" ? "var(--data-available)" : state === "stale" ? "var(--data-stale)" : "var(--data-unavailable)",
          }}
        />
      </div>
    </div>
  );
}

function StatusRow({ label, count, total, state }: {
  label: string;
  count: number;
  total: number;
  state: "available" | "stale" | "not_reported";
}) {
  const pct = Math.round((count / total) * 100);
  return (
    <div className={cn("flex items-center justify-between py-3 px-4 rounded-lg", `data-bg-${state}`)}>
      <span className="text-body-sm text-secondary">{label}</span>
      <div className="flex items-baseline gap-3">
        <span className="text-metric text-foreground tabular-nums">{count}</span>
        <span className="text-body-sm text-muted-foreground">/ {total}</span>
        <span className="text-ticker text-muted-foreground tabular-nums">{pct}%</span>
      </div>
    </div>
  );
}
