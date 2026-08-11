/**
 * Metric — displays a labeled metric with optional provenance and data state
 *
 * Never shows 0 for unavailable data. Uses DataState for null-safe rendering.
 */
import { cn } from "@/lib/utils";
import { DataState, type DataStateValue } from "./DataState";
import type { ProvenanceData } from "./Provenance";

interface MetricProps {
  label: string;
  value?: React.ReactNode;
  state?: DataStateValue;
  provenance?: ProvenanceData;
  staleValue?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Metric({ label, value, state = "available", provenance, staleValue, size = "md", className }: MetricProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-label text-muted-foreground">{label}</span>
      <DataState
        state={state}
        value={value}
        staleValue={staleValue}
        source={provenance?.sourceLabel}
        sourceUrl={provenance?.sourceUrl}
        dataType={provenance?.dataType}
        size={size}
      />
    </div>
  );
}

/** Compact metric grid — for project detail pages */
interface MetricGridProps {
  metrics: MetricProps[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function MetricGrid({ metrics, columns = 3, className }: MetricGridProps) {
  const colClass = columns === 4 ? "grid-cols-2 md:grid-cols-4" : columns === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3";
  return (
    <div className={cn("grid gap-4", colClass, className)}>
      {metrics.map((m, i) => (
        <Metric key={i} {...m} />
      ))}
    </div>
  );
}

/** Completeness bar — shows a single completeness dimension with label + percentage */
export function CompletenessBar({ label, value, className }: { label: string; value: number; className?: string }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "var(--data-available)" : pct >= 30 ? "var(--data-stale)" : "var(--data-unavailable)";
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-body-sm text-secondary">{label}</span>
        <span className="text-ticker text-muted-foreground tabular-nums">{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-border-subtle overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/** Coverage stat — for the coverage dashboard, shows a single separated coverage metric */
export function CoverageStat({
  label,
  value,
  total,
  description,
  className,
}: {
  label: string;
  value: number;
  total?: number;
  description?: string;
  className?: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className={cn("flex flex-col gap-2 p-5 rounded-lg border border-border bg-surface", className)}>
      <span className="text-label text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-metric-lg text-foreground tabular-nums">{pct}%</span>
        {total !== undefined && (
          <span className="text-body-sm text-muted-foreground tabular-nums">
            {total} projects
          </span>
        )}
      </div>
      {description && <span className="text-metadata text-muted-foreground">{description}</span>}
    </div>
  );
}
