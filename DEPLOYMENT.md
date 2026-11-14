# ============================================================
# LILLY'S RESTAURANT & CAFE — VERCEL DEPLOYMENT GUIDE
# ============================================================

## Why Vercel?
- **Free Hobby plan** — no trial, no expiry
- Native Next.js support (made by the same team)
- Automatic HTTPS + global CDN
- Zero-config deployments from GitHub

---

## Architecture on Vercel

```
GitHub repo ──push──▶ Vercel (Next.js app)
                           │
                    DATABASE_URL
                           │
                     Neon Postgres ◀── free tier, 0.5 GB
```

> Vercel itself has no built-in persistent database, so we use
> **Neon** — a serverless Postgres with a generous free tier.

---

## Step 1 — Get a Free Postgres Database (Neon)

1. Go to **https://neon.tech** → sign up free (GitHub login works)
2. Click **"New Project"** → name it `lilly-pos`
3. Choose region closest to you → **Create**
4. On the dashboard, click **"Connection string"**
5. Copy the full string — it looks like:
   ```
   postgresql://neondb_owner:AbCdEfG@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
6. Keep this tab open — you'll paste it into Vercel in Step 4.

---

## Step 2 — Push Code to GitHub

```bash
cd /Users/duminduharshana/.gemini/antigravity/scratch/cafe-pos-suite

# 1. Create a repo at https://github.com/new  (name: lilly-pos)
# 2. Then:
git remote add origin https://github.com/YOUR_USERNAME/lilly-pos.git
git push -u origin main
```

---

## Step 3 — Import to Vercel

1. Go to **https://vercel.com** → sign up / log in (GitHub login)
2. Click **"Add New Project"**
3. Click **"Import"** next to your `lilly-pos` repo
4. Vercel auto-detects **Next.js** ✅
5. Under **"Build & Development Settings"**, Vercel will use `vercel.json` automatically — no changes needed

---

## Step 4 — Add Environment Variables

Before clicking Deploy, scroll to **"Environment Variables"** and add:

| Name | Value |
|---|---|
| `DATABASE_URL` | Paste your Neon connection string from Step 1 |
| `NODE_ENV` | `production` |
| `NEXT_TELEMETRY_DISABLED` | `1` |

Then click **"Deploy"** 🚀

---

## Step 5 — Watch the Build

Build logs will show:
```
▶ Running build command: npm run vercel-build
✓ Switched to PostgreSQL schema
✓ Prisma Client generated
✓ 1 migration applied (20261113000000_init)
✓ Next.js compiled — 12 routes
✓ Build complete
```

First build takes ~2 minutes. Subsequent deploys: ~45 seconds.

---

## Step 6 — Seed Demo Data

After first successful deploy, seed Lilly's menu/staff/tables.

**Option A — Vercel CLI (easiest):**
```bash
npm install -g vercel
vercel login
vercel env pull .env.production.local   # pulls DATABASE_URL locally
npx tsx prisma/seed.ts                  # seeds via Neon remotely
```

**Option B — Neon SQL Editor:**
1. Go to **https://neon.tech** → your project → **"SQL Editor"**
2. Run the seed inserts manually (or ask me and I'll export a `.sql` seed file)

---

## Step 7 — Get Your Live URL

Vercel gives you:
```
https://lilly-pos.vercel.app
```

Or your own custom domain (see below).

**Add to home screen:** Open the URL on iPhone/Android → Share → "Add to Home Screen" — it installs as a PWA app icon 📱

---

## Custom Domain (Optional — Free)

1. Vercel → your project → **"Settings"** → **"Domains"**
2. Type your domain e.g. `pos.lillyscafe.com` → Add
3. Vercel shows you a CNAME record → add it in your DNS provider
4. SSL is automatic ✅

---

## Automatic Deploys

Every `git push` to `main` → Vercel redeploys automatically.
Every Pull Request → Vercel creates a preview URL for testing.

---

## Staff PINs (Demo Seed)

| Staff | PIN | Role |
|-------|-----|------|
| Julian Vance | `1111` | Admin |
| Mateo Silva | `3333` | Barista |
| Chloe Bennett | `4444` | Cashier |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Error: DATABASE_URL not set` | Re-check Env Vars in Vercel project settings |
| Build fails at `prisma migrate deploy` | Check Neon DB is active; verify connection string includes `?sslmode=require` |
| `PrismaClientInitializationError` | Make sure `serverComponentsExternalPackages` is in `next.config.mjs` |
| Slow cold starts | Normal for serverless — first request after idle wakes the function |
| `Module not found: prisma` | Vercel build runs `npm ci` — make sure `prisma` is in `dependencies` not `devDependencies` |

---

## Key Files Added for Vercel

| File | Purpose |
|---|---|
| `vercel.json` | Tells Vercel to use `npm run vercel-build` |
| `package.json` → `vercel-build` | Swaps schema → generates client → migrates → builds |
| `next.config.mjs` | `serverComponentsExternalPackages` for Prisma |
| `prisma/migrations/` | Migration files Prisma runs on first deploy |
| `.env.example` | Documents all required env vars |
