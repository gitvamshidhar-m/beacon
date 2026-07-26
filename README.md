---
title: Beacon
emoji: 📡
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# Beacon — Competitor Change Radar

Track strategic changes on competitor websites and get notified when their pricing, messaging, features, CTAs, or SEO shift.

## What it does

- **Add competitors** — enter any URL and Beacon starts monitoring it
- **Snapshot now** — fetch the page, extract 7 categories of marketing signals
- **Detect changes** — compare snapshots and classify what shifted (Pricing, Messaging, Feature, CTA, SEO, Navigation)
- **Visual diff** — see the full page before vs. after side-by-side
- **Field-level diff** — inline highlighted changes per signal field
- **Bot-resilient** — if auto-fetch is blocked, paste the HTML manually (Layer 2 fallback)

## Tech stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Database | Turso (libSQL) — SQLite-compatible, free tier |
| HTML parsing | Cheerio |
| Bot protection | Native fetch + polite headers + manual paste fallback |
| Diff engine | `diff` npm package |
| UI | Tailwind CSS + hand-built shadcn-style components |
| Icons | Lucide React |

## Getting started

### Prerequisites

- **Node.js 18+**
- npm 10+

### Install & run

```bash
git clone <your-repo-url> beacon
cd beacon
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### First use

1. Click **"Add competitor"**
2. Enter a competitor name, URL, and optional category
3. On the competitor detail page, click **"Snapshot now"**
4. Take another snapshot later — Beacon detects and classifies any changes

## Project structure

```
app/
├── layout.tsx              # Root layout with Navbar
├── page.tsx                # Dashboard (stats + competitor list + change feed)
├── providers.tsx           # Client provider wrapper
├── competitors/
│   ├── new/page.tsx        # Add competitor form
│   └── [id]/
│       ├── page.tsx        # Competitor detail (timeline + changes + actions)
│       └── changes/[changeId]/page.tsx  # Full diff view
└── api/
    ├── competitors/        # CRUD + snapshot + manual paste endpoints
    ├── snapshots/          # Get full snapshot (with HTML)
    ├── changes/            # List + detail
    └── stats/              # Aggregate counts

components/
├── ui/                     # Button, Card, Badge, Input, Textarea, Label, Separator
├── Navbar.tsx
├── SnapshotActions.tsx     # "Snapshot now" + status display
├── ChangeFeed.tsx          # List of detected changes
├── FieldDiffList.tsx       # Per-field inline highlighted diffs
├── VisualDiff.tsx          # Side-by-side iframe page comparison
├── ManualPastePanel.tsx    # Layer 2 fallback for bot-protected sites
├── SeverityBadge.tsx       # Change type + severity badges
└── DeleteCompetitorButton.tsx

lib/
├── db.ts                   # Turso (libSQL) schema, queries, mappers
├── types.ts                # All shared TypeScript types
├── utils.ts                # cn(), formatDate(), timeAgo()
├── signals.ts              # Cheerio signal extraction (7 categories)
├── differ.ts               # Snapshot comparison + classification
└── fetcher/
    ├── index.ts            # Strategy router (auto → detect → manual)
    ├── auto-fetch.ts       # Layer 1: polite headers + native fetch
    └── bot-detection.ts    # Challenge-page detection heuristics
```

## Deploying to Vercel (free)

### Prerequisites

- [Vercel account](https://vercel.com) (free tier — no card required)
- [Turso account](https://turso.tech) (free tier — 500 databases, 9GB storage)

### 1. Create a Turso database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create database
turso db create beacon

# Get the connection URL
turso db show beacon --url
# → libsql://beacon-your-org.turso.io

# Create an auth token
turso db tokens create beacon
# → eyJhbG...
```

### 2. Push code to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/beacon.git
git push -u origin main
```

### 3. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Vercel auto-detects Next.js — click **Deploy**
4. After deploy, go to **Settings → Environment Variables** and add:
   - `TURSO_DATABASE_URL` = `libsql://beacon-your-org.turso.io`
   - `TURSO_AUTH_TOKEN` = `eyJhbG...`
5. Redeploy to pick up the env vars

That's it. Your app is live at `https://your-project.vercel.app`.

### How it works

- Turso is a hosted SQLite database — same SQL, zero config
- Free tier gives you 500 databases with 9GB storage (more than enough)
- No `node:sqlite` or native modules needed — works in Vercel's serverless functions

## Signals tracked

| Signal | Source | Change category |
|--------|--------|-----------------|
| SEO Title | `<title>` | SEO |
| Meta Description | `meta[name=description]` | SEO |
| Headline | First `<h1>` | Messaging |
| Subheadings | `<h2>`, `<h3>` | Messaging |
| Pricing | `$` amounts near pricing context | Pricing |
| Features | `<li>` under feature headings | Feature |
| CTAs | Action-oriented buttons/links | CTA |
| Navigation | `<nav>` link labels | Navigation |

## Future upgrades

- **Auth** — NextAuth.js (GitHub/Google OAuth)
- **Billing** — Stripe integration
- **Auto-scheduling** — cron jobs for periodic snapshots (e.g. daily)
- **Headless browser** — Playwright + stealth for ~95% bot bypass
- **AI summaries** — LLM API to explain *why* a change matters
- **Email / webhook alerts** — notify when high-severity changes are detected
- **Pixel screenshots** — Puppeteer for true visual diffs (not just HTML rendering)

## License

MIT
