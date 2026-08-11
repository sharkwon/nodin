/**
 * Sources page — transparency / trust layer
 *
 * Not a server monitoring dashboard. Shows what data sources power the platform,
 * their health, and which projects they serve.
 */
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ecosystemApi } from "@/lib/ecosystem-api";
import { DataStateDot } from "@/components/design-system";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function SourcesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["ecosystem", "sources"],
    queryFn: ecosystemApi.sources,
    refetchInterval: 120_000,
  });

  if (isLoading || !data) {
    return (
      <div className="container-editorial py-12">
        <div className="skeleton h-10 w-48 rounded mb-8" />
        <div className="space-y-3">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const statusOrder = ["healthy", "degraded", "rate_limited", "stale", "unknown", "unavailable"];
  const sources = [...data.sources].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
  const healthyPct = Math.round((data.healthy / data.total) * 100);

  return (
    <div className="container-editorial py-12">
      <div className="mb-10">
        <h1 className="text-h1 text-foreground">Data Sources</h1>
        <p className="mt-3 text-body text-muted-foreground max-w-2xl">
          {data.total} connectors providing live ecosystem data. Health checks run automatically every 2 minutes.
        </p>
      </div>

      {/* Single summary line — not 6 cards */}
      <div className="mb-10 flex items-baseline gap-4 pb-6 border-b border-border">
        <span className="text-metric-lg text-foreground tabular-nums">{data.healthy}</span>
        <span className="text-body text-muted-foreground">of {data.total} sources healthy</span>
        <span className={cn(
          "text-ticker tabular-nums",
          healthyPct === 100 ? "data-text-available" : healthyPct >= 80 ? "data-text-stale" : "data-text-unavailable"
        )}>
          {healthyPct}%
        </span>
        {data.degraded > 0 && (
          <span className="text-metadata text-muted-foreground">
            · {data.degraded} degraded
          </span>
        )}
        {data.unavailable > 0 && (
          <span className="text-metadata data-text-unavailable">
            · {data.unavailable} unavailable
          </span>
        )}
      </div>

      {/* Source list — editorial rows, not cards */}
      <div className="space-y-1">
        {sources.map((source, i) => (
          <motion.div
            key={source.sourceId}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.03, duration: 0.3, ease: EASE }}
            className="flex items-start justify-between gap-4 p-4 rounded-lg hover:bg-surface-elevated transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <DataStateDot
                  state={
                    source.status === "healthy" ? "available" :
                    source.status === "unavailable" ? "unavailable" :
                    source.status === "stale" ? "stale" :
                    source.status === "unknown" ? "loading" : "stale"
                  }
                />
                <span className="text-body-sm font-medium text-foreground">{source.provider}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-4 text-metadata text-muted-foreground">
                <span>Confidence {Math.round(source.confidence * 100)}%</span>
              </div>
              {source.projectsUsing.length > 0 && source.projectIds && source.projectIds.length > 0 && (
                <div className="mt-1.5 text-metadata text-muted-foreground">
                  Used by {source.projectsUsing.length} {source.projectsUsing.length === 1 ? "project" : "projects"}
                  <span className="ml-2 text-muted-foreground/60">
                    {source.projectsUsing.slice(0, 4).map((name, i) => {
                      const pid = source.projectIds[i];
                      return pid ? (
                        <Link key={pid} to={`/ecosystem/${pid}`} className="text-secondary hover:text-foreground transition-colors">
                          {name}
                        </Link>
                      ) : (
                        <span key={i}>{name}</span>
                      );
                    }).reduce((acc: React.ReactNode[], el, i) => {
                      if (i > 0) acc.push(<span key={`sep-${i}`} className="text-muted-foreground/40">, </span>);
                      acc.push(el);
                      return acc;
                    }, [])}
                    {source.projectsUsing.length > 4 && ` +${source.projectsUsing.length - 4} more`}
                  </span>
                </div>
              )}
              {source.projectsUsing.length > 0 && (!source.projectIds || source.projectIds.length === 0) && (
                <div className="mt-1.5 text-metadata text-muted-foreground">
                  Used by {source.projectsUsing.length} {source.projectsUsing.length === 1 ? "project" : "projects"}
                  <span className="ml-2 text-muted-foreground/60">
                    {source.projectsUsing.slice(0, 4).join(", ")}
                    {source.projectsUsing.length > 4 && ` +${source.projectsUsing.length - 4} more`}
                  </span>
                </div>
              )}
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
          </motion.div>
        ))}
      </div>
    </div>
  );
}
