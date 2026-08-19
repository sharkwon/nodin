# NODIN Vercel Deployment Guide

## Architecture
- **Frontend**: Vite + React + Tailwind (static site)
- **Backend**: Express + TypeScript (serverless functions)
- Both deploy separately to Vercel

---

## Deploy Backend First

1. **Import the repo to Vercel**
   - Go to Vercel Dashboard → Add New → Project
   - Import `sharkwon/nodin`
   - **Root Directory**: `backend`
   - **Framework Preset**: Other
   - Build Command: `cd backend && pnpm install && pnpm exec tsc -p tsconfig.vercel.json`
   - Output Directory: `dist`
   - Install Command: `cd backend && pnpm install`

2. **Environment Variables** (in Vercel dashboard)
   ```
   NODE_VERSION=22
   PORT=3000
   API_PREFIX=/api
   CORS_ORIGIN=https://nodin-ktrb.vercel.app
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   ```

3. **Deploy** → Copy the deployed URL (e.g., `https://nodin-api.vercel.app`)

---

## Deploy Frontend

1. **Import the repo to Vercel** (same repo, new project)
   - Go to Vercel Dashboard → Add New → Project
   - Import `sharkwon/nodin`
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - Build Command: `cd frontend && pnpm install && pnpm build`
   - Output Directory: `dist`
   - Install Command: `cd frontend && pnpm install`

2. **Environment Variables** (in Vercel dashboard)
   ```
   NODE_VERSION=22
   ```

3. **Rewrite API to Backend**
   - In `vercel.json` (already configured), replace:
   ```json
   "destination": "https://nodin-5ogmigp4n-xyzzss.vercel.app/api/$1"
   ```
   - Or set via Vercel Dashboard → Settings → Rewrites

4. **Deploy** → Done!

---

## Cron Jobs

The backend `vercel.json` includes:
```json
"crons": [
  {
    "path": "/api/report/generate",
    "schedule": "*/5 * * * *"
  }
]
```

This runs every 5 minutes on the **backend** deployment.

---

## Local Development

```bash
# Terminal 1: Backend
cd backend && pnpm dev

# Terminal 2: Frontend
cd frontend && pnpm dev
```

Frontend proxies `/api/*` to `http://localhost:3000` via Vite config.

---

## Notes

- Frontend is deployed as static files (no server)
- Backend runs as serverless functions (max 30s duration)
- CORS: Set `CORS_ORIGIN` to your frontend URL in production
- The `vercel.ts` entry point exports the Express app for Vercel
- `tsconfig.vercel.json` compiles with `noEmit: false` for Vercel
