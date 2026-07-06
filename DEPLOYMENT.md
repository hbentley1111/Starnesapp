# Deploying the demo (Netlify frontend + Render API + Neon Postgres)

This is the **demo/staging** path — production stays client-owned AWS/Azure
via Terraform per SOLUTION_ARCHITECTURE §7.

> **Before real client data goes in:** this build has no login (Google SSO is
> build-plan task B1). Ship seed/sample data only until that lands.

## 1. Push to GitHub
```
git remote add origin https://github.com/<you>/starnes.git
git push -u origin main
```

## 2. Database — Neon (free Postgres 16 with pgvector)
neon.tech → new project → copy the connection string. That's `DATABASE_URL`.

## 3. API — Render (Docker web service)
1. render.com → **New → Web Service** → **Build and deploy from a Git repository** → pick the repo.
2. Settings:
   - **Language/Environment:** Docker
   - **Dockerfile Path:** `apps/api/Dockerfile` (context: repo root)
   - **Health Check Path** (Advanced): `/health`
   - **Instance:** Free is fine for a demo (sleeps after ~15 min idle; first hit wakes in ~30–60s — open the app a minute before presenting)
3. Environment variables:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Neon connection string |
   | `HITL_TOKEN_SIGNING_KEY` | `openssl rand -hex 32` output |
   | `NODE_ENV` | `production` |
   | `CORS_ALLOWLIST` | your Netlify URL — exact, no trailing slash |
   | `RENTCAST_API_KEY` | *(optional)* from rentcast.io — flips Property Search to live data |
   | `RENTCAST_MARKET_CITY` / `RENTCAST_MARKET_STATE` | *(optional)* default `Salisbury` / `NC` |

   Do **not** set `PORT` — Render injects it; the API binds `0.0.0.0` and reads it.
4. Create the service. The container runs migrations on boot. When live:
   `https://<api>.onrender.com/health` → `{"status":"ok"}`.
5. Seed demo data once (laptop, repo checked out, `npm install` done):
   ```
   DATABASE_URL="<neon-url>" npm run db:seed -w @starnes/api
   ```

## 4. Frontend — Netlify
1. Import the repo; `netlify.toml` handles the monorepo build.
2. Env var: `NEXT_PUBLIC_API_URL` = the Render URL (no trailing slash).
3. Deploy (env changes need a fresh deploy — use "Clear cache and deploy site" if stale).
4. Back on Render, set `CORS_ALLOWLIST` to the final Netlify URL if it changed.

## 5. Verify the loop
Netlify URL → Capture → "Messy call" sample → Run extraction → "2 need review"
→ Open review gate → the 55%-confidence transposed address is waiting there.
Property Search shows recent commercial sales (gold "Sample data" chip until a
RentCast key is set; green "Live · RentCast" after).

## Troubleshooting
- **CORS errors in the browser console** → `CORS_ALLOWLIST` doesn't exactly match the Netlify URL (protocol + no trailing slash).
- **Old UI after deploy** → Netlify "Clear cache and deploy site".
- **First request hangs ~40s** → Render free tier waking from sleep; $7/mo starter removes it.
