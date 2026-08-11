/**
 * Footer — editorial-style footer
 *
 * Data column links to /sources page instead of hard-coded names.
 * About column shows live project/connector counts from API.
 */
import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { ecosystemApi } from "@/lib/ecosystem-api";
import { DataStateDot } from "@/components/design-system";
import { cn } from "@/lib/utils";

export function Footer() {
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const { data: sourcesData } = useQuery({
    queryKey: ["ecosystem", "sources"],
    queryFn: ecosystemApi.sources,
    staleTime: 120_000,
  });

  const { data: coverageData } = useQuery({
    queryKey: ["ecosystem", "coverage"],
    queryFn: ecosystemApi.coverage,
    staleTime: 120_000,
  });

  const totalProjects = coverageData?.separated.totalProjects;
  const healthySources = sourcesData?.healthy;
  const totalSources = sourcesData?.total;

  return (
    <footer className="border-t border-border bg-surface mt-20">
      <div className="container-editorial py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <span className="text-lg font-bold tracking-tight text-foreground">NODIN</span>
            <p className="mt-2 text-body-sm text-muted-foreground max-w-xs">
              NEWS LIKE A WIND. Editorial coverage, on-chain data, and protocol research.
            </p>
          </div>
          <div>
            <h4 className="text-label text-muted-foreground mb-3">Platform</h4>
            <ul className="space-y-2">
              <li><Link to="/ecosystem" className="text-body-sm text-secondary hover:text-foreground transition-colors">Ecosystem</Link></li>
              <li><Link to="/coverage" className="text-body-sm text-secondary hover:text-foreground transition-colors">Coverage</Link></li>
              <li>
                <button onClick={() => setSourcesOpen((v) => !v)} className="text-body-sm text-secondary hover:text-foreground transition-colors">
                  Source Health
                </button>
              </li>
              <li><Link to="/search" className="text-body-sm text-secondary hover:text-foreground transition-colors">Search</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-label text-muted-foreground mb-3">Data Sources</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setSourcesOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-body-sm text-secondary hover:text-foreground transition-colors"
                >
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", sourcesOpen && "rotate-180")} />
                  {totalSources != null ? `${totalSources} live connectors` : "Toggle sources"}
                </button>
              </li>
              <li>
                <Link to="/coverage" className="text-body-sm text-secondary hover:text-foreground transition-colors">
                  Coverage dashboard
                </Link>
              </li>
              <li>
                <span className="text-body-sm text-secondary">
                  {healthySources != null && totalSources != null
                    ? `${healthySources}/${totalSources} healthy`
                    : "Health status"}
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-label text-muted-foreground mb-3">About</h4>
            <ul className="space-y-2">
              <li>
                <span className="text-body-sm text-secondary">
                  {totalProjects != null ? `${totalProjects} canonical projects` : "Canonical project registry"}
                </span>
              </li>
              <li>
                <Link to="/coverage" className="text-body-sm text-secondary hover:text-foreground transition-colors">
                  Transparent coverage metrics
                </Link>
              </li>
              <li>
                <span className="text-body-sm text-secondary">Every metric is sourced</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Expandable source health panel */}
        {sourcesOpen && sourcesData && (
          <div className="mt-8 pt-6 border-t border-border-subtle">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-label text-muted-foreground">Source Health</span>
              <span className="text-metadata text-muted-foreground">
                {healthySources}/{totalSources} healthy · checks every 2 min
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
              {[...sourcesData.sources]
                .sort((a, b) => {
                  const order = ["healthy", "degraded", "rate_limited", "stale", "unknown", "unavailable"];
                  return order.indexOf(a.status) - order.indexOf(b.status);
                })
                .map((source) => (
                  <div key={source.sourceId} className="flex items-center justify-between gap-3 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <DataStateDot
                        state={
                          source.status === "healthy" ? "available" :
                          source.status === "unavailable" ? "unavailable" :
                          source.status === "stale" ? "stale" :
                          source.status === "unknown" ? "loading" : "stale"
                        }
                      />
                      <span className="text-body-sm text-foreground truncate">{source.provider}</span>
                    </div>
                    <span
                      className={cn(
                        "flex-shrink-0 text-label capitalize",
                        source.status === "healthy" ? "data-text-available" :
                        source.status === "unavailable" ? "data-text-unavailable" :
                        "data-text-stale"
                      )}
                    >
                      {source.status}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-metadata text-muted-foreground">
            © 2026 NODIN · NEWS LIKE A WIND
          </span>
          <span className="text-metadata text-muted-foreground">
            Data is transparent · Every metric is sourced
          </span>
        </div>
      </div>
    </footer>
  );
}
