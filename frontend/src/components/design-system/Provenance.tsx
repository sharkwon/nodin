/**
 * Provenance — editorial data provenance display
 *
 * Inline mode: "[Data type] powered by [Source]" (source is clickable when URL available)
 * Expanded mode: source, confidence, data state
 *
 * No relative timestamps — this is editorial attribution, not monitoring.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DataStateDot, type DataStateValue } from "./DataState";

export interface ProvenanceData {
  source: string;
  sourceLabel: string;
  sourceUrl?: string;
  dataType?: string;
  fetchedAt?: string;
  confidence: number;
  status: "available" | "unavailable" | "stale" | "transformed" | "fallback";
  dataState?: DataStateValue;
}

interface ProvenanceProps {
  data: ProvenanceData;
  variant?: "inline" | "expanded" | "hover";
  className?: string;
}

export function Provenance({ data, variant = "inline", className }: ProvenanceProps) {
  const [hovered, setHovered] = useState(false);

  if (variant === "inline") {
    return (
      <span className={cn("text-metadata text-muted-foreground", className)}>
        {data.dataType ? `${data.dataType} powered by ` : "Powered by "}
        {data.sourceUrl ? (
          <a
            href={data.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary hover:text-foreground transition-colors underline decoration-dotted underline-offset-2"
          >
            {data.sourceLabel}
          </a>
        ) : (
          <span className="text-secondary">{data.sourceLabel}</span>
        )}
      </span>
    );
  }

  if (variant === "hover") {
    return (
      <span
        className={cn("relative inline-block", className)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="text-metadata text-muted-foreground cursor-help underline decoration-dotted underline-offset-2">
          {data.sourceLabel}
        </span>
        {hovered && (
          <ProvenanceCard data={data} className="absolute bottom-full left-0 mb-2 z-50 w-56" />
        )}
      </span>
    );
  }

  // expanded
  return <ProvenanceCard data={data} className={className} />;
}

function ProvenanceCard({ data, className }: { data: ProvenanceData; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface-elevated p-4 shadow-lg", className)}>
      <div className="flex items-center gap-2 mb-3">
        <DataStateDot state={data.dataState ?? (data.status === "available" ? "available" : "unavailable")} />
        <span className="text-label text-foreground">Source</span>
      </div>
      <dl className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-metadata text-muted-foreground">Provider</dt>
          <dd className="text-sm font-medium text-foreground">{data.sourceLabel}</dd>
        </div>
        {data.dataType && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-metadata text-muted-foreground">Data type</dt>
            <dd className="text-sm font-medium text-foreground">{data.dataType}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-metadata text-muted-foreground">Status</dt>
          <dd className="text-sm font-medium capitalize data-text-available">{data.status}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-metadata text-muted-foreground">Confidence</dt>
          <dd className="text-sm font-medium text-foreground tabular-nums">
            {Math.round(data.confidence * 100)}%
          </dd>
        </div>
      </dl>
    </div>
  );
}
