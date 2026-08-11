/**
 * SolanaNow — WHAT'S HAPPENING NOW
 *
 * Compact network status snapshot for homepage.
 * Shows: TPS, slot, epoch, SOL price, TVL, validators, anomalies.
 */
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { networkApi, type NetworkSnapshot } from "@/lib/nodin";
import { DataStateDot } from "@/components/design-system";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function SolanaNow() {
  const { data: snap, isLoading } = useQuery({
    queryKey: ["network-snapshot"],
    queryFn: networkApi.snapshot,
    refetchInterval: 30_000,
  });

  if (isLoading || !snap) {
    return (
      <section className="border-t border-border py-8">
        <div className="container-editorial">
          <h2 className="text-h2 text-foreground mb-6">Solana Now</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-surface animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const hasAnomalies = snap.anomalies.length > 0;
  const epochProgress = snap.epoch
    ? (snap.epoch.slotIndex / snap.epoch.slotsInEpoch) * 100
    : null;

  return (
    <section className="border-t border-border py-8">
      <div className="container-editorial">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-h2 text-foreground">Solana Now</h2>
            <DataStateDot
              state={snap.health === "ok" ? "available" : "stale"}
            />
          </div>
          <span className="text-metadata text-muted-foreground">
            Network data powered by {snap.source}
          </span>
        </div>

        {/* Metric grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <NowMetric
            label="TPS"
            value={snap.tps !== null ? formatNum(snap.tps) : "—"}
            state={snap.tps !== null ? "available" : "unavailable"}
          />
          <NowMetric
            label="Slot Time"
            value={snap.slotTimeMs !== null ? `${snap.slotTimeMs}ms` : "—"}
            state={snap.slotTimeMs !== null ? "available" : "unavailable"}
          />
          <NowMetric
            label="Block Height"
            value={snap.blockHeight !== null ? formatNum(snap.blockHeight) : "—"}
            state={snap.blockHeight !== null ? "available" : "unavailable"}
          />
          <NowMetric
            label="Epoch"
            value={snap.epoch ? `${snap.epoch.epoch}` : "—"}
            subValue={epochProgress !== null ? `${epochProgress.toFixed(1)}%` : undefined}
            state={snap.epoch ? "available" : "unavailable"}
          />
          <NowMetric
            label="Active Validators"
            value={snap.validators ? formatNum(snap.validators.active) : "—"}
            subValue={snap.validators ? `${snap.validators.delinquent} delinquent` : undefined}
            state={snap.validators ? "available" : "unavailable"}
          />
          <NowMetric
            label="Total Stake"
            value={snap.validators ? formatSol(snap.validators.totalStake) : "—"}
            state={snap.validators ? "available" : "unavailable"}
          />
        </div>

        {/* Anomaly alerts */}
        {hasAnomalies && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mt-6 space-y-2"
          >
            <h3 className="text-label text-muted-foreground">Anomaly Alerts</h3>
            {snap.anomalies.slice(0, 5).map((a, i) => (
              <AnomalyRow key={i} anomaly={a} />
            ))}
          </motion.div>
        )}

        {!hasAnomalies && snap.tps !== null && (
          <p className="mt-6 text-body-sm text-muted-foreground">
            No anomalies detected. All metrics within normal range.
          </p>
        )}
      </div>
    </section>
  );
}

function NowMetric({
  label,
  value,
  subValue,
  state,
}: {
  label: string;
  value: string;
  subValue?: string;
  state: "available" | "unavailable" | "stale";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.2, ease: EASE }}
      className="p-4 rounded-lg border border-border bg-surface"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-label text-muted-foreground">{label}</span>
        <DataStateDot state={state} />
      </div>
      <p className="text-h3 text-foreground tabular-nums">{value}</p>
      {subValue && (
        <p className="text-metadata text-muted-foreground tabular-nums">{subValue}</p>
      )}
    </motion.div>
  );
}

function AnomalyRow({ anomaly }: { anomaly: NetworkSnapshot["anomalies"][0] }) {
  const colors: Record<string, string> = {
    critical: "text-red-400 border-red-500/30",
    high: "text-amber-400 border-amber-500/30",
    medium: "text-yellow-400 border-yellow-500/30",
    low: "text-blue-400 border-blue-500/30",
  };
  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-lg border bg-surface", colors[anomaly.severity] || "")}>
      <span className="text-label font-medium uppercase">{anomaly.severity}</span>
      <div className="flex-1 min-w-0">
        <p className="text-body-sm text-foreground">
          {anomaly.description}
        </p>
        <p className="text-metadata text-muted-foreground tabular-nums">
          {anomaly.metric}: {anomaly.value} (expected: {anomaly.expected})
        </p>
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}

function formatSol(lamports: number): string {
  const sol = lamports / 1e9;
  if (sol >= 1e9) return `${(sol / 1e9).toFixed(2)}B SOL`;
  if (sol >= 1e6) return `${(sol / 1e6).toFixed(1)}M SOL`;
  if (sol >= 1e3) return `${(sol / 1e3).toFixed(1)}K SOL`;
  return `${sol.toFixed(0)} SOL`;
}
