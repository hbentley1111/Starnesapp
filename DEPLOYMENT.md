# Getting a live demo up (Git + Netlify)

Netlify hosts the frontend only. The API and database need a server host.
This is the **demo/staging** path — production stays client-owned AWS/Azure
via Terraform per SOLUTION_ARCHITECTURE §7.

> **Before you deploy real data:** the API has no login yet (Google SSO is
> build-plan task B1). Ship seed/demo data only until that lands.

## 1. Push to GitHub
```
cd starnes
git remote add origin https://github.com/<you>/starnes.git
git push -u origin main
```
(The repo already has an initial commit — see `git log`.)

## 2. Database — Neon (free Postgres 16 with pgvector)
1. neon.tech → new project → copy the connection string (DATABASE_URL).
2. Neon has pgvector available; the migration enables it automatically.

## 3. API — Render (or Railway / Fly.io)
1. render.com → New → Web Service → connect the GitHub repo.
2. Runtime: **Docker**, Dockerfile path: `apps/api/Dockerfile`, context: repo root.
3. Environment variables:
   - `DATABASE_URL` — from Neon
   - `HITL_TOKEN_SIGNING_KEY` — long random string (`openssl rand -hex 32`)
   - `PORT` — `3001`
   - `CORS_ALLOWLIST` — your Netlify URL, e.g. `https://starnes-demo.netlify.app` (add it after step 4)
4. Deploy. The container runs migrations on boot, then serves.
5. Seed demo data once (from your laptop):
   `DATABASE_URL=<neon-url> npm run db:seed -w @starnes/api`

## 4. Frontend — Netlify
1. app.netlify.com → Add new site → Import from GitHub → pick the repo.
2. `netlify.toml` sets base to `apps/web` and the Next.js runtime — accept defaults.
3. Environment variable: `NEXT_PUBLIC_API_URL` = your Render URL (no trailing slash).
4. Deploy, then go back to Render and set `CORS_ALLOWLIST` to the Netlify URL.

## 5. Check the loop
Open the Netlify URL → Approvals → approve the pending Dana draft. In Neon's
SQL editor: `SELECT * FROM approval_decision;` — you should see the decision
with its single-use dispatch token, and a matching `audit_log` row.

## Not on Netlify (by design)
Redis/BullMQ workers, Fireflies webhooks, Google OAuth, and the extraction
queue arrive with the C-block integrations and need the server host (or the
real Terraform environment) — none of it belongs on a static/frontend host.
