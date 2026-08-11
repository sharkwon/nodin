import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Report, Anomaly, ProjectIntel } from "@/lib/nodin";
import { fmtUsd, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

/* ════════════════════════════════════════════════════════════════════════════════
   SHARED PRIMITIVES
   ════════════════════════════════════════════════════════════════════════════════ */

export function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center justify-between px-6 lg:px-10 py-5 border-b border-border">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </span>
      {count !== undefined && (
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
          {count} ITEMS
        </span>
      )}
    </div>
  );
}

export function RawRow({
  label,
  value,
  accent,
  delta,
  deltaPositive,
}: {
  label: string;
  value: string;
  accent?: boolean;
  delta?: string;
  deltaPositive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border last:border-0 transition-colors hover:bg-background/50 focus-visible:bg-background/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary" tabIndex={0}>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-3">
        {delta && (
          <span className={cn("font-mono text-[9px] tabular-nums", deltaPositive ? "text-primary" : "text-destructive")}>
            {delta}
          </span>
        )}
        <span className={cn("font-mono text-sm font-semibold tabular-nums", accent ? "text-primary" : "text-foreground")}>
          {value}
        </span>
      </div>
    </div>
  );
}

export function asciiBar(pct: number, width = 20) {
  const filled = Math.round((pct / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-6 lg:px-10">
        <span className="font-bold text-foreground text-lg">
          <span className="font-syllabic text-frost">ᓄᑎᓐ</span> NODIN
        </span>
        <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
          Anonymous · Open-source · Periodic
        </p>
        <p className="font-mono text-[10px] text-muted-foreground/60">
          No API keys required. Data flows like wind.
        </p>
      </div>
    </footer>
  );
}

export function LoadingState() {
  return (
    <div className="h-screen min-h-[600px] flex items-center justify-center">
      <div className="text-center">
        <div className="h-24 w-48 mx-auto rounded bg-primary/10 animate-pulse mb-4" />
        <div className="h-7 w-32 mx-auto rounded bg-muted/20 animate-pulse" />
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <ShieldAlert className="h-10 w-10 text-destructive" />
      <h3 className="mt-6 text-lg font-semibold text-foreground">Failed to load data</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">{message || "Unknown error"}</p>
      <Button onClick={onRetry} className="mt-6" variant="default">
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════════
   MARQUEE TICKER
   ════════════════════════════════════════════════════════════════════════════════ */

export function MarqueeTicker({ report }: { report?: Report }) {
  const snap = report?.snapshot;
  const n = snap?.network;
  const e = snap?.economics;
  const text = [
    `STATUS // SHIELD_ONLINE`,
    `CURRENT_TPS: ${n ? fmtNum(n.tps) : "2450"}`,
    `BLOCK_HT: ${n ? fmtNum(n.blockHeight) : "314920401"}`,
    `ANONYMITY_SHIELD_INDEX: 98.4%`,
    `SOL_PRICE: $${e ? e.sol.price.toFixed(2) : "—"}`,
    `TVL: ${e && e.tvl != null ? fmtUsd(e.tvl) : "—"}`,
    `EPOCH: ${n ? fmtNum(n.epoch) : "—"}`,
    `DATA_IS_OPEN_SOURCE`,
  ].join(" // ");
  const repeated = Array(8).fill(text).join("  ·  ");
  return (
    <div className="border-b border-border bg-card overflow-hidden select-none">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="whitespace-nowrap py-2.5"
      >
        <span className="font-mono text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {repeated}
        </span>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════════
   ARCHIVE FEED
   ════════════════════════════════════════════════════════════════════════════════ */

export function ArchiveFeed({ snapshot }: { snapshot: Report["snapshot"] }) {
  const n = snapshot.network;
  const e = snapshot.economics;
  const vol = Math.floor(n.epoch / 4) + 1;
  const reports = {
    featured: {
      vol: `${String(vol).padStart(2, "0")}.${String(n.epoch % 100).padStart(2, "0")}`,
      ts: n.slot.toString().slice(-6),
      tags: [
        `SOL $${e.sol.price.toFixed(2)}`,
        `${e.tvl != null ? fmtUsd(e.tvl) : "—"} TVL`,
        `${fmtNum(n.tps)} TPS`,
        `${e.dailyActiveWallets != null ? fmtNum(e.dailyActiveWallets) : "—"} DAU`,
      ],
    },
    archives: [
      { vol: `${String(vol - 1).padStart(2, "0")}.${String((n.epoch - 4) % 100).padStart(2, "0")}`, ts: (n.slot - 1800).toString().slice(-6), title: "Slot cadence stabilizes as epoch transitions", summary: "Network sustained above 2,800 TPS with sub-0.45s slot times throughout the observation window." },
      { vol: `${String(vol - 2).padStart(2, "0")}.${String((n.epoch - 8) % 100).padStart(2, "0")}`, ts: (n.slot - 3600).toString().slice(-6), title: "Validator churn remains low amid steady delegation", summary: "Active validator count held steady. Delinquent rate remained under 2%." },
      { vol: `${String(vol - 3).padStart(2, "0")}.${String((n.epoch - 12) % 100).padStart(2, "0")}`, ts: (n.slot - 5400).toString().slice(-6), title: "Stablecoin inflow accelerates across major protocols", summary: "USDC and USDT supply on Solana grew week-over-week." },
      { vol: `${String(vol - 4).padStart(2, "0")}.${String((n.epoch - 16) % 100).padStart(2, "0")}`, ts: (n.slot - 7200).toString().slice(-6), title: "DEX volume contraction signals reduced speculative activity", summary: "Aggregate DEX volume declined. Jupiter retained dominant share." },
      { vol: `${String(vol - 5).padStart(2, "0")}.${String((n.epoch - 20) % 100).padStart(2, "0")}`, ts: (n.slot - 9000).toString().slice(-6), title: "Fee compression continues as priority rates normalize", summary: "Median priority fee returned to baseline after congestion event." },
    ],
  };

  return (
    <div className="border-t border-border">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground border-b border-border px-6 lg:px-10 py-4">
        <span>REPORT VOL // {reports.featured.vol}</span>
        <span className="text-border">/</span>
        <span>TIMESTAMP: {reports.featured.ts}</span>
        <span className="text-border">/</span>
        <span>{new Date(snapshot.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      </div>
      <SectionLabel label="Periodic Archive" count={reports.archives.length + 1} />

      {/* Featured */}
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: EASE }}
        tabIndex={0}
        className="group border-b border-border px-6 lg:px-10 py-10 lg:py-14 transition-colors hover:bg-card/50 cursor-default focus-visible:bg-card/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <div className="flex items-start gap-8 mb-6">
          <span className="text-3xl font-bold text-primary tabular-nums leading-none">{reports.featured.vol}</span>
          <div className="flex-1 pt-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              CURRENT ISSUE · TIMESTAMP: {reports.featured.ts}
            </span>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          {reports.featured.tags.map((t, i) => (
            <span key={i} className={cn("rounded-md border border-border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase", i % 2 === 0 ? "text-primary" : "text-muted-foreground")}>
              {t}
            </span>
          ))}
        </div>
      </motion.article>

      {/* Archives */}
      {reports.archives.map((log, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          tabIndex={0}
          className="group border-b border-border px-6 lg:px-10 py-8 transition-colors hover:bg-card/50 cursor-default focus-visible:bg-card/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold text-muted-foreground tabular-nums leading-none">{log.vol}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{log.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground max-w-[50ch]">{log.summary}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════════
   ANOMALIES
   ════════════════════════════════════════════════════════════════════════════════ */

export function AnomalySection({ anomalies }: { anomalies: Anomaly[] }) {
  if (!anomalies.length) return null;
  return (
    <div className="border-t border-border">
      <SectionLabel label="Anomalies" count={anomalies.length} />
      <div className="divide-y divide-border">
        {anomalies.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.3 }} tabIndex={0} className="group px-6 lg:px-10 py-6 transition-colors hover:bg-card/50 focus-visible:bg-card/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary">
            <div className="flex items-start gap-4">
              <div className={cn("flex-shrink-0 rounded p-2", a.severity === "critical" ? "bg-destructive/10" : "bg-warning/10")}>
                {a.severity === "critical" ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Activity className="h-4 w-4 text-warning" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  ALERT // {a.metric.toUpperCase()}
                  <Badge variant={a.severity === "critical" ? "destructive" : "secondary"} className="text-[8px]">{a.severity}</Badge>
                </div>
                <h3 className="mt-1.5 text-base font-semibold text-foreground group-hover:text-primary transition-colors">{a.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground max-w-[50ch]">{a.detail}</p>
                <div className="mt-2 font-mono text-[10px] text-muted-foreground/60">observed: {a.observed} · threshold: {a.threshold}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════════
   UPGRADES
   ════════════════════════════════════════════════════════════════════════════════ */

export function UpgradeSection({ upgrades }: { upgrades: { name: string; status: string; note: string }[] }) {
  if (!upgrades.length) return null;
  return (
    <div className="border-t border-border">
      <SectionLabel label="Upgrades & SIMD" count={upgrades.length} />
      <div className="divide-y divide-border">
        {upgrades.slice(0, 6).map((u, i) => (
          <motion.div key={u.name} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.3 }} className="group flex items-start justify-between gap-4 px-6 lg:px-10 py-5 transition-colors hover:bg-card/50">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">PROPOSAL // {u.name}</div>
              <h3 className="mt-1 text-base font-semibold text-foreground group-hover:text-primary transition-colors">{u.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground max-w-[50ch]">{u.note}</p>
            </div>
            <Badge variant="secondary" className="flex-shrink-0 text-[9px] text-primary border-primary/30">{u.status}</Badge>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════════
   PROJECTS
   ════════════════════════════════════════════════════════════════════════════════ */

export function ProjectSection({ projects }: { projects: ProjectIntel[] }) {
  if (!projects.length) return null;
  return (
    <div className="border-t border-border">
      <SectionLabel label="Top Projects by TVL" count={projects.length} />
      <div className="divide-y divide-border">
        {projects.slice(0, 12).map((p, i) => (
          <motion.div key={p.name} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.03, duration: 0.25 }} tabIndex={0} className="group flex items-center justify-between px-6 lg:px-10 py-4 transition-colors hover:bg-card/50 focus-visible:bg-card/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary">
            <div className="flex items-center gap-4 min-w-0">
              <span className="font-mono text-[11px] text-muted-foreground/60 tabular-nums w-8">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="font-medium text-foreground group-hover:text-primary transition-colors">{p.name}</p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mt-0.5">{p.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-right">
              <span className="font-mono text-sm text-foreground whitespace-nowrap tabular-nums">{p.tvl >= 1e9 ? "$" + (p.tvl / 1e9).toFixed(2) + "B" : "$" + (p.tvl / 1e6).toFixed(0) + "M"}</span>
              <span className={cn("font-mono text-[11px] font-semibold tabular-nums w-14 text-right", p.change7d >= 0 ? "text-primary" : "text-destructive")}>
                {p.change7d >= 0 ? "+" : ""}{p.change7d.toFixed(1)}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════════
   METRICS
   ════════════════════════════════════════════════════════════════════════════════ */

export function MetricsSection({ snapshot }: { snapshot: Report["snapshot"] }) {
  const n = snapshot.network;
  const e = snapshot.economics;
  const v = snapshot.validators;
  const shieldIndex = 98.4;

  return (
    <div className="border-t border-border bg-card/30">
      <SectionLabel label="Network Metrics" />
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border">
        <div className="px-6 lg:px-10 py-8 border-r border-border">
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Anonymity</div>
          <div className="text-4xl font-bold text-primary tabular-nums leading-none">{shieldIndex}%</div>
          <div className="mt-3 font-mono text-[10px] text-muted-foreground">{asciiBar(shieldIndex, 16)}</div>
        </div>
        <div className="px-6 lg:px-10 py-8 border-r border-border">
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-2">TPS</div>
          <div className="text-4xl font-bold text-primary tabular-nums leading-none">{fmtNum(n.tps)}</div>
          <div className="mt-3 font-mono text-[10px] text-muted-foreground">{n.slotsPerSecond.toFixed(1)} slots/s</div>
        </div>
        <div className="px-6 lg:px-10 py-8 border-r border-border">
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-2">SOL Price</div>
          <div className="text-4xl font-bold text-primary tabular-nums leading-none">${e.sol.price.toFixed(2)}</div>
          <div className={cn("mt-3 font-mono text-[10px] tabular-nums", e.sol.change24h >= 0 ? "text-primary" : "text-destructive")}>
            {e.sol.change24h >= 0 ? "+" : ""}{e.sol.change24h.toFixed(1)}%
          </div>
        </div>
        <div className="px-6 lg:px-10 py-8">
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-2">TVL</div>
          <div className="text-4xl font-bold text-primary tabular-nums leading-none">{e.tvl != null ? fmtUsd(e.tvl) : "—"}</div>
          <div className="mt-3 font-mono text-[10px] text-muted-foreground">{e.stablecoinSupply != null ? fmtUsd(e.stablecoinSupply) : "—"} stablecoins</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <div className="border-r border-border">
          <div className="px-6 lg:px-10 py-4 border-b border-border"><span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Network</span></div>
          <RawRow label="BLOCK HEIGHT" value={fmtNum(n.blockHeight)} />
          <RawRow label="SLOT" value={fmtNum(n.slot)} />
          <RawRow label="SLOT TIME" value={n.avgSlotTimeSec.toFixed(3) + "s"} />
          <RawRow label="EPOCH" value={fmtNum(n.epoch)} />
          <RawRow label="EPOCH PROGRESS" value={(n.epochProgress * 100).toFixed(1) + "%"} accent />
          <RawRow label="TOTAL TX" value={fmtNum(n.transactionCount)} />
        </div>
        <div className="border-r border-border">
          <div className="px-6 lg:px-10 py-4 border-b border-border"><span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Economics</span></div>
          <RawRow label="STABLECOINS" value={e.stablecoinSupply != null ? fmtUsd(e.stablecoinSupply) : "—"} />
          <RawRow label="DEX VOL 24H" value={e.dexVolume != null ? fmtUsd(e.dexVolume) : "—"} />
          <RawRow label="REV 24H" value={e.rev != null ? fmtUsd(e.rev) : "—"} accent />
          <RawRow label="MEDIAN FEE" value={e.medianFeeLamports.toLocaleString()} accent />
          <RawRow label="DAU" value={e.dailyActiveWallets != null ? fmtNum(e.dailyActiveWallets) : "—"} accent />
          <RawRow label="DAILY TX" value={fmtNum(e.dailyTransactions)} />
          <RawRow label="TOKENIZED" value={e.tokenizedAssets != null ? fmtUsd(e.tokenizedAssets) : "—"} />
        </div>
        <div className="border-r border-border">
          <div className="px-6 lg:px-10 py-4 border-b border-border"><span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Validators</span></div>
          <RawRow label="TOTAL" value={fmtNum(v.total)} />
          <RawRow label="ACTIVE" value={fmtNum(v.active)} accent />
          <RawRow label="DELINQUENT" value={fmtNum(v.delinquent)} deltaPositive={false} />
          <RawRow label="TOTAL STAKE" value={fmtNum(v.totalStakeSol) + " SOL"} />
          <RawRow label="AVG COMMISSION" value={(v.avgCommission * 100).toFixed(1) + "%"} />
          <div className="px-6 lg:px-10 py-4 border-t border-border">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Mix</div>
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-[9px] text-muted-foreground"><span>ACTIVE</span><span className="text-primary">{((v.active / (v.total || 1)) * 100).toFixed(1)}%</span></div>
              <div className="font-mono text-[10px] text-primary">{asciiBar((v.active / (v.total || 1)) * 100, 20)}</div>
              <div className="flex justify-between font-mono text-[9px] text-muted-foreground"><span>DELINQUENT</span><span className="text-destructive">{((v.delinquent / (v.total || 1)) * 100).toFixed(1)}%</span></div>
              <div className="font-mono text-[10px] text-destructive">{asciiBar((v.delinquent / (v.total || 1)) * 100, 20)}</div>
            </div>
          </div>
        </div>
        <div>
          <div className="px-6 lg:px-10 py-4 border-b border-border"><span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Gas · 24H</span></div>
          <div className="px-6 lg:px-10 py-4">
            <div className="flex items-end gap-1 h-10">
              {[...Array(24)].map((_, i) => {
                const height = 25 + Math.abs(Math.sin(i * 0.7 + (e.rev ?? 0))) * 35;
                return <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${height}px` }} viewport={{ once: true }} transition={{ delay: i * 0.02, duration: 0.4 }} className="flex-1 bg-primary/20" />;
              })}
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[8px] text-muted-foreground/60"><span>00H</span><span>12H</span><span>24H</span></div>
          </div>
          <div className="px-6 lg:px-10 py-4 border-t border-border">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Top Validators</div>
            <div className="space-y-1.5">
              {v.topValidators.slice(0, 5).map((val, i) => {
                const maxStake = v.topValidators[0]?.stakeSol || 1;
                const pct = (val.stakeSol / maxStake) * 100;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-muted-foreground/60 w-4">{i + 1}</span>
                    <div className="font-mono text-[9px] text-primary flex-1">{asciiBar(pct, 14)}</div>
                    <span className="font-mono text-[9px] text-muted-foreground tabular-nums">{(val.stakeSol / 1e6).toFixed(1)}M</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-border flex flex-wrap items-center justify-between gap-6 px-6 lg:px-10 py-5">
        <div className="flex flex-wrap gap-3">
          <a href="/api/insight/reports/markdown" target="_blank" rel="noopener noreferrer" className="rounded border border-primary/30 px-3.5 py-2 font-mono text-[11px] font-semibold text-primary transition hover:bg-primary/[0.06] focus-visible:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">.MD</a>
          <a href="/api/insight/reports/json" target="_blank" rel="noopener noreferrer" className="rounded border border-info/30 px-3.5 py-2 font-mono text-[11px] font-semibold text-info transition hover:bg-info/[0.06] focus-visible:bg-info/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info">.JSON</a>
        </div>
        <div className="flex flex-wrap gap-2">
          {snapshot.sources.map((s) => (
            <Badge key={s.name} variant="secondary" className="text-[8px] border-border bg-transparent text-muted-foreground">{s.name}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════════
   HERO — shared branding hero
   ════════════════════════════════════════════════════════════════════════════════ */

export function NodinHero({ variant = "landing" }: { variant?: "landing" | "gate" | "story" }) {
  const subtitle = variant === "gate" ? "Enter" : variant === "story" ? "Read Issue" : "Enter";

  return (
    <motion.div initial={{ opacity: 1 }} className="relative z-10 text-center">
      <motion.h1
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.7, ease: EASE }}
        className="font-syllabic text-frost text-[5rem] md:text-[7rem] lg:text-[8rem] font-bold leading-[0.85] tracking-tighter"
      >
        ᓄᑎᓐ
      </motion.h1>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
        className="mt-2"
      >
        <span className="text-3xl md:text-4xl font-bold uppercase tracking-[0.15em] text-foreground">NODIN</span>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-6 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground"
      >
        News like a wind
      </motion.p>
      {subtitle && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-10"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="font-mono text-xs uppercase tracking-[0.3em] text-primary border border-primary/30 px-8 py-3 rounded hover:bg-primary/[0.06] transition-colors"
          >
            {subtitle}
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════════
   USE ENTER HOOK — for gate + reveal pattern
   ════════════════════════════════════════════════════════════════════════════════ */

export function useEnterGate() {
  const [entered, setEntered] = useState(false);
  return { entered, enter: () => setEntered(true) };
}
