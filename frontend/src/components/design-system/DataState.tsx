/**
 * DataState — renders data based on backend dataState, never infers 0 from null
 *
 * States:
 * - available: show value + attribution
 * - unavailable: "Data unavailable"
 * - stale: show last known value + "Stale" label
 * - loading: skeleton
 * - not_reported: "No data source"
 */
import { cn } from "@/lib/utils";

export type DataStateValue = "available" | "unavailable" | "stale" | "loading" | "not_reported";

interface DataStateProps {
  state: DataStateValue;
  value?: React.ReactNode;
  staleValue?: React.ReactNode;
  source?: string;
  sourceUrl?: string;
  dataType?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function DataState({ state, value, staleValue, source, sourceUrl, dataType, className, size = "md" }: DataStateProps) {
  const sizeClass = size === "lg" ? "text-metric-lg" : size === "sm" ? "text-sm font-semibold" : "text-metric";

  if (state === "available") {
    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        <span className={sizeClass}>{value}</span>
        {source && (
          <span className="text-metadata text-muted-foreground">
            {dataType ? `${dataType} powered by ` : ""}
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:text-foreground transition-colors underline decoration-dotted underline-offset-2"
              >
                {source}
              </a>
            ) : (
              <span className="text-secondary">{source}</span>
            )}
          </span>
        )}
      </div>
    );
  }

  if (state === "stale") {
    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        <span className={cn(sizeClass, "data-text-stale")}>
          {staleValue ?? value}
        </span>
        <span className="text-metadata data-text-stale">
          Stale{source ? ` · ${source}` : ""}
        </span>
      </div>
    );
  }

  if (state === "unavailable") {
    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        <span className={cn(sizeClass, "data-text-unavailable")}>—</span>
        <span className="text-metadata data-text-unavailable">Data unavailable</span>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        <div className={cn("skeleton rounded", size === "lg" ? "h-7 w-32" : size === "sm" ? "h-4 w-20" : "h-5 w-24")} />
        <div className="skeleton h-3 w-16 rounded" />
      </div>
    );
  }

  // not_reported
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className={cn(sizeClass, "data-text-not-reported")}>—</span>
      <span className="text-metadata data-text-not-reported">No data source</span>
    </div>
  );
}

/** Data state dot indicator */
export function DataStateDot({ state, className }: { state: DataStateValue; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        `data-dot-${state}`,
        className,
      )}
      aria-label={`Data state: ${state}`}
    />
  );
}

/** Data state badge — small pill with text */
export function DataStateBadge({ state, className }: { state: DataStateValue; className?: string }) {
  const labels: Record<DataStateValue, string> = {
    available: "Live",
    unavailable: "Unavailable",
    stale: "Stale",
    loading: "Loading",
    not_reported: "No source",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-metadata font-medium",
        `data-bg-${state} data-text-${state}`,
        className,
      )}
    >
      <span className={cn("inline-block h-1.5 w-1.5 rounded-full", `data-dot-${state}`)} />
      {labels[state]}
    </span>
  );
}

/** Time ago helper — still exported for editorial timestamps (article publishedAt) */
export function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
