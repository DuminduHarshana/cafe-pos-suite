# ============================================================
# LILLY'S RESTAURANT & CAFE — RAILWAY DEPLOYMENT GUIDE
# ============================================================

## Overview

Railway provides a fully managed cloud platform. You'll deploy:
1. **PostgreSQL** database (Railway managed)
2. **Next.js app** (built from your Dockerfile)

---

## Prerequisites

- [ ] GitHub account
- [ ] Railway account → https://railway.app (sign up free)
- [ ] Git repo pushed to GitHub (see Step 1)

---

## Step 1 — Push to GitHub

```bash
cd /Users/duminduharshana/.gemini/antigravity/scratch/cafe-pos-suite

# Create a repo at https://github.com/new  (name: lilly-pos)
# Then:
git remote add origin https://github.com/YOUR_USERNAME/lilly-pos.git
git push -u origin main
```

---

## Step 2 — Create Railway Project

1. Go to https://railway.app → **New Project**
2. Click **"Deploy from GitHub repo"**
3. Authorize Railway to access your GitHub account
4. Select `lilly-pos` repository → click **Deploy**

Railway will auto-detect the `Dockerfile` and start building.

---

## Step 3 — Add PostgreSQL Database

1. Inside your Railway project → click **"+ New Service"**
2. Select **"Database" → "PostgreSQL"**
3. Railway provisions a free PostgreSQL instance instantly
4. Click the Postgres service → go to **"Variables"** tab
5. Copy the **`DATABASE_URL`** value shown there

---

## Step 4 — Set Environment Variables on the App Service

1. Click your **app service** (not the Postgres one)
2. Go to **"Variables"** tab → click **"+ New Variable"**
3. Add these variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Paste the PostgreSQL `DATABASE_URL` from Step 3 |
| `NODE_ENV` | `production` |
| `NEXT_TELEMETRY_DISABLED` | `1` |
| `NEXTAUTH_SECRET` | Generate: `openssl rand -base64 32` (paste result) |

> **Tip:** Railway also lets you click "Add Reference" to link the Postgres
> service's `DATABASE_URL` directly — no copy-paste needed.

---

## Step 5 — Set the Schema for Production

The app needs to use the **PostgreSQL schema** in production. Railway's
Dockerfile already handles this — it runs `prisma migrate deploy` on startup
using the `DATABASE_URL` you set above.

No manual schema switching needed.

---

## Step 6 — Trigger a Redeploy

After setting variables:
1. Railway → your app service → **"Deployments"** tab
2. Click **"Redeploy"** on the latest build
3. Watch the build logs — you should see:
   ```
   ✓ Prisma migrate deploy — 1 migration applied
   ✓ Ready on http://0.0.0.0:3000
   ```

---

## Step 7 — Seed Demo Data (Optional)

After the first successful deploy, seed Lilly's demo menu/staff/tables:

1. Railway → your app service → **"Settings"** → scroll to **"Deploy"**
2. Temporarily set **Start Command** to:
   ```
   npx tsx prisma/seed.ts && node ./node_modules/next/dist/bin/next start -p $PORT
   ```
3. Redeploy → once seeded, revert Start Command back to empty (uses Dockerfile CMD)

OR connect directly via Railway CLI:
```bash
npm install -g @railway/cli
railway login
railway link          # select your project
railway run npx tsx prisma/seed.ts
```

---

## Step 8 — Get Your Live URL

1. Railway → app service → **"Settings"** → **"Domains"**
2. Click **"Generate Domain"** → you'll get a URL like:
   ```
   https://lilly-pos-production.up.railway.app
   ```
3. Your POS is live! Add it to home screen on iPhone/Android as a PWA.

---

## Custom Domain (Optional)

1. Railway → Domains → **"Add Custom Domain"**
2. Enter `pos.lillysrestaurant.com` (or whatever you own)
3. Add the CNAME record Railway shows you in your DNS provider
4. Done — SSL is automatic

---

## Staff PINs (Demo Seed)

| Staff | PIN | Role |
|-------|-----|------|
| Julian Vance | `1111` | Admin |
| Mateo Silva | `3333` | Barista |
| Chloe Bennett | `4444` | Cashier |

---

## Printer Setup on Live App

After deploy, open the app → click the **printer icon** (top right):
- **Network/LAN printer:** Enter IP + port 9100
- **USB:** Requires HTTPS origin (Railway provides this automatically)
- **System Print:** Works on any OS via browser print dialog

---

## Environment Variables Reference

```env
# Required
DATABASE_URL=postgresql://...     # From Railway Postgres service
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Optional
NEXTAUTH_SECRET=...               # Random 32-byte base64 string
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Build fails: `prisma generate` error | Make sure `prisma/schema.postgres.prisma` exists in repo |
| App crashes: `DATABASE_URL not set` | Check Variables tab — Railway must have `DATABASE_URL` |
| Blank page after deploy | Check Deploy logs for JS errors; verify `NODE_ENV=production` |
| Migrations fail | Ensure `prisma/migrations/` folder is committed to git |
| Port binding error | Railway injects `$PORT` automatically; Dockerfile uses it correctly |
