# ᓄᑎᓐ NODIN — Solana Ecosystem Report

> **NEWS LIKE A WIND.** An anonymous, open-source, self-refreshing research surface
> for the Solana network. Like the wind, the data moves freely — accessible to and
> useful for the entire ecosystem.

NODIN is an automated Solana ecosystem report. It pulls **live on-chain data**
(Solana RPC), **economic indicators** (CoinGecko · DeFiLlama · stablecoin tracker),
**ecosystem coverage** (179 canonical projects across 40 categories), **official
news** (solana.com RSS), and **network improvement proposals** (SIMD GitHub tracker)
— refreshed every 60 seconds, with **no API keys required** beyond the public
Solana RPC endpoint.

It produces three synchronized outputs from a single data snapshot:

1. An **interactive dashboard** (React) — [live demo](#live-demo)
2. A human-readable **Markdown** report — [`backend/reports/nodin-report-sample.md`](backend/reports/nodin-report-sample.md)
3. A machine-readable **JSON** report — [`backend/reports/nodin-report-sample.json`](backend/reports/nodin-report-sample.json)

Built for the Superteam Earn Solana ecosystem challenge.

---

## Live Demo

- **Dashboard:** https://nodin.onrender.com
  *(single Render web service — serves the dashboard and the API from one origin;
  free tier may cold-start for ~30–50s on the first request after idle)*
- The dashboard degrades gracefully to cached/last-known data if a live source
  is temporarily rate-limited, and clearly flags data state (available / stale /
  unavailable) rather than showing a misleading `$0`.

---

## How to Read the Report

The report answers: **"Is the Solana network healthy right now, and what's
happening in its DeFi economy?"** Read it top to bottom:

| Section | What it tells you | Healthy baseline |
| --- | --- | --- |
| **Network Performance** | Throughput and liveness | TPS ~2,500–4,000; slot time ~400–450ms; health `ok` |
| **Validator Status** | Decentralization & consensus health | ~690 active, <2% delinquency; no single validator dominant |
| **Economic Indicators** | Money flowing through Solana | SOL price, TVL (~$4–5B), DEX volume, stablecoin supply, median fee (~5,000 lamports), REV |
| **Ecosystem** | Breadth of tracked coverage | 179 registered projects, 40 categories, ~120 with live data |
| **Anomaly Detection** | Automated red flags | Empty list = all metrics within normal range |
| **Upcoming Upgrades** | Protocol roadmap | Alpenglow, SIMD proposals |
| **Data Sources** | Provenance & health of every feed | Each source marked healthy / unavailable / awaiting-key |

Every metric is **sourced** — no fabricated values. When a source can't be
reached, the field reads *"Data unavailable"* instead of `0`.

---

## Data Sources & Integration

All ingestion is behind **replaceable connectors** (a `BaseConnector` /
`DataProvider` interface), so the report never hard-depends on a single vendor.
Each connector reports its own health, and the aggregator assembles one Snapshot
from all of them in parallel (`Promise.all`).

| Source | Provides | Keyless | Integration |
| --- | --- | --- | --- |
| **Solana RPC** (`api.mainnet-beta.solana.com`) | health, slot, epoch, performance samples (TPS/slot time), vote accounts (validators/stake), circulating supply | ✅ | JSON-RPC batch (`getEpochInfo`, `getVoteAccounts`, `getRecentPerformanceSamples`, `getSupply`, `getSlot`, `getHealth`) |
| **CoinGecko** | SOL price, 24h change, market cap | ✅ | REST `simple/price`; falls back to DeFiLlama coins API when rate-limited |
| **DeFiLlama** | Solana TVL, per-protocol TVL, DEX volume, fees/revenue | ✅ | `/v2/chains`, `/protocols` (Solana-filtered via `chains[]`), `/overview/dexs`, `/overview/fees` |
| **DeFiLlama Stablecoins** | 52 stablecoins on Solana with circulating supply | ✅ | `stablecoins.llama.fi/stablecoins` |
| **solana.com RSS** (`/news/rss.xml`) | official ecosystem news with images | ✅ | XML parse |
| **GitHub API** | SIMD proposals (`solana-foundation/solana-improvement-documents`) | ✅ | REST contents API |
| **SolanaFloor** | ETF flow data, secondary news | ✅ (best-effort) | Next.js RSC scrape; intermittent 403 tolerated |
| **Nitter / Twitter RSS** | community pulse (best-effort) | ✅ | Multi-instance RSS failover |
| **Dune Analytics** | DAA, tx volume, tokenized assets | ⚠️ needs key | Connector ready; reports `awaiting-key` and **omits** the section (no fabricated fallback) when no `DUNE_API_KEY` is set |

**Solana-only guarantee:** protocol and token data is strictly filtered to
`chains.includes("Solana")`, and per-protocol TVL uses `chainTvls["Solana"]` —
so multi-chain protocols (e.g. Lido) only contribute their Solana-side figures,
and no ETH/BTC data leaks in.

---

## Automation Strategy

- **Live dashboard:** the backend assembles and caches the full report for
  **60 seconds** (in-memory TTL on `/api/insight/pulse`); the frontend polls
  every 30–120s per data type with `@tanstack/react-query`.
- **Scheduled report generation:** `backend/scripts/cron-report.ts` runs on a
  configurable interval (default 5 min), fetches all sources, and writes
  timestamped Markdown + JSON files to `backend/reports/`. Run it as a cron job,
  a systemd timer, or a GitHub Action.

  ```bash
  cd backend
  npx tsx scripts/cron-report.ts 5   # regenerate every 5 minutes
  ```

- **Single source of truth:** the dashboard, Markdown, and JSON are all rendered
  from the same snapshot dict, so they never drift out of sync.
- **Graceful degradation:** every source is wrapped in try/catch with cached
  fallbacks; one dead source never breaks the whole report.

---

## Anomaly Detection

A pure-function engine (`backend/src/lib/anomaly-engine.ts`) evaluates the live
snapshot against thresholds on every refresh. Detected anomalies are attached to
the snapshot with a severity (`info` / `warning` / `critical`) and surfaced both
in the dashboard's Anomaly panel and the report's Anomaly Detection section.

| Rule | Warning | Critical |
| --- | --- | --- |
| TPS drop | < 1,000 | — |
| TPS spike | > 6,000 | — |
| Slot time | > 0.6s | — |
| Validator delinquency | > 5% | > 10% |
| SOL 24h move | ≥ 8% | ≥ 15% |
| TVL 24h move | ≥ 10% | ≥ 20% |
| Median fee | > 10k lamports | > 50k lamports |

An empty anomaly list is the healthy "ALL CLEAR" state.

---

## Setup & Run

**Prerequisites:** Node 22+, pnpm.

```bash
# Terminal 1 — backend (port 3000)
cd backend
pnpm install
pnpm dev

# Terminal 2 — frontend (port 5173, proxies /api -> :3000)
cd frontend
pnpm install
pnpm dev
```

Open **http://localhost:5173**.

### Deploy (Render, one service)

The repo ships a `render.yaml` blueprint that builds the frontend and serves it
alongside the API from a single Node web service. In Render:
**New → Blueprint → connect this repo → Apply**. No manual config needed —
region, build/start commands, and env vars come from the blueprint.

Optional environment variables (`backend/.env`):

| Var | Purpose |
| --- | --- |
| `SOLANA_RPC_URL` | Custom / higher-rate-limit RPC endpoint (e.g. Helius). Defaults to public mainnet RPC. |
| `DUNE_API_KEY` | Enables the Dune Analytics connector (DAA, tx volume). Without it, that section is omitted. |
| `PORT` | Backend port (default 3000). |

**Generate a static report** (no frontend needed):

```bash
cd backend
npx tsx scripts/cron-report.ts 5    # writes reports/nodin-report-<ts>.{md,json}
```

**Run the test suite** (162 tests, no keys required):

```bash
cd backend
npx vitest run
```

---

## API Reference

| Route | Description |
| --- | --- |
| `GET /api/insight/pulse` | Full report snapshot (cached 60s) |
| `GET /api/insight/snapshot` | Raw on-chain snapshot + anomalies |
| `GET /api/insight/projects` | Project intelligence + narratives |
| `GET /api/insight/protocols` | Protocol directory (Solana-filtered, grouped by category) |
| `GET /api/insight/protocols/:slug` | Single protocol detail |
| `GET /api/insight/protocols/:slug/chart?days=90` | TVL history |
| `GET /api/insight/dex-volume` · `/stablecoins` · `/fees` | Market leaderboards |
| `GET /api/insight/news` · `/upgrades` | News feed · SIMD upgrades |
| `GET /api/insight/reports/markdown` · `/reports/json` | Downloadable reports |
| `GET /api/network/snapshot` · `/anomalies` | Network telemetry + anomaly engine |
| `GET /api/network/etf/flow` | Solana ETF flow data |
| `GET /api/ecosystem/coverage` · `/projects` · `/sources` | Coverage metrics · registry · source health |
| `GET /api/report/markdown` · `/report/json` | Report generator (same as insight/reports) |

---

## Project Structure

```
nodin/
├── backend/                      # Express + tsx, port 3000
│   ├── src/
│   │   ├── modules/              # route handlers: insight, ecosystem, network
│   │   └── lib/
│   │       ├── connectors/       # SolanaRPC, SolanaFloor, TwitterRSS, Dune, solana.com
│   │       ├── publicData.ts     # CoinGecko + DeFiLlama providers (with fallbacks)
│   │       ├── snapshot.ts       # assembles the unified Snapshot
│   │       ├── anomaly-engine.ts # threshold-based anomaly detection
│   │       ├── coverage-engine.ts# ecosystem coverage metrics
│   │       └── report-generator.ts # Markdown + JSON output
│   ├── scripts/cron-report.ts    # scheduled report generation
│   └── reports/                  # sample generated reports (MD + JSON)
└── frontend/                     # Vite + React 19 + Tailwind v4, port 5173
    ├── src/pages/                # Home, Analysis, Coverage, Search
    ├── src/components/           # ProtocolToolbox, SolanaNow, layout/*
    └── src/lib/                  # live-data fetchers with multi-source fallback
```

---

## Design Notes

- **Frost & Ocean brutalist** aesthetic: deep arctic-night background (`#060B14`),
  frost-cyan accent (`#00F5D4`), Canadian syllabics wordmark `ᓄᑎᓐ`, monospace
  telemetry, heavy line rules, no rounded cards.
- **Data-state discipline:** the UI distinguishes *available / stale / unavailable /
  loading / not-reported* — it never coerces missing data to `0`.
- **Attribution over timestamps:** metrics show *"TVL data powered by DeFiLlama"*
  rather than monitoring-style *"2m ago"* readouts.
