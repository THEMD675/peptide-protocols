# pptides

**Live:** [pptides.com](https://pptides.com) · **Repo:** [github.com/THEMD675/peptide-protocols](https://github.com/THEMD675/peptide-protocols)

The most comprehensive Arabic reference for therapeutic peptides — protocols, dose calculators, AI coach, and lab guides.

---

## Overview

pptides is an Arabic-first web app for therapeutic peptide education. It serves as a complete reference for peptide protocols, dosing, and safety — targeting Arabic-speaking practitioners and biohackers.

### Key Features

- **41+ peptides** with full protocols (dosing, cycles, side effects, evidence levels)
- **Dose calculator** with syringe unit conversion
- **AI coach** (DeepSeek-powered) for personalized protocol guidance
- **Lab guide** for pre/during/post bloodwork
- **Injection tracker** and community logs
- **Interaction checker** for peptide–drug interactions
- **Protocol wizard** for guided protocol building
- **Quiz** for peptide knowledge assessment
- **Blog** with educational content
- **PWA** — installable, works offline

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18, TypeScript, Vite 7 |
| Styling | Tailwind CSS 3, tailwind-merge, clsx |
| Routing | React Router 7 |
| Backend | Supabase (Auth, PostgreSQL, Edge Functions) |
| Payments | Stripe (subscriptions, SAR pricing) |
| Email | Resend (via Supabase Edge Functions) |
| AI Coach | DeepSeek (via Supabase Edge Function) |
| Error Tracking | Sentry |
| Analytics | GA4 (optional) |
| Bot Protection | Cloudflare Turnstile |
| Hosting | Vercel |
| PWA | vite-plugin-pwa + Workbox (injectManifest) |
| Charts | Recharts |
| Testing | Vitest + Testing Library |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                   Vercel                     │
│              (Static SPA Host)               │
├─────────────────────────────────────────────┤
│  React SPA (Vite build)                     │
│  ├─ Pages: Landing, Library, Dashboard, ... │
│  ├─ Contexts: Auth, Theme, Subscription     │
│  ├─ PWA: Service Worker (Workbox)           │
│  └─ Sentry + GA4 (client-side)             │
├─────────────────────────────────────────────┤
│              Supabase                        │
│  ├─ Auth (email, Google, magic link)        │
│  ├─ PostgreSQL (peptides, users, logs)      │
│  ├─ Edge Functions:                         │
│  │   ├─ ai-coach (DeepSeek)                │
│  │   ├─ stripe-webhook                     │
│  │   ├─ create-checkout / create-portal     │
│  │   ├─ send-welcome-email                 │
│  │   ├─ trial-reminder                     │
│  │   ├─ cancel-subscription                │
│  │   ├─ delete-account                     │
│  │   ├─ admin-stats                        │
│  │   ├─ inbound-email                      │
│  │   └─ health-check                       │
│  └─ Realtime (subscription status)         │
├─────────────────────────────────────────────┤
│  Stripe (payment processing)                │
│  Resend (transactional email)               │
│  Cloudflare Turnstile (bot protection)      │
└─────────────────────────────────────────────┘
```

### Bundle Strategy

Vite is configured with manual chunks for optimal loading:

- `vendor` — React, React DOM, React Router
- `supabase` — Supabase client
- `ui` — Lucide icons, Sonner toasts, Helmet
- `sentry` — Error tracking (lazy)
- Route-based code splitting for all pages

---

## Setup

### Prerequisites

- Node.js ≥ 18
- npm
- Vercel CLI (`npm i -g vercel`)

### Install & Run

```bash
git clone https://github.com/THEMD675/peptide-protocols.git
cd peptide-protocols
npm install
cp .env.example .env    # Fill in your values
npm run dev             # http://localhost:3000
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build (generates sitemap first) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check |
| `npm run type-check` | TypeScript type-check (no emit) |
| `npm run test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage |
| `npm run predeploy` | Type-check + build |
| `npm run deploy` | Deploy to Vercel production |
| `npm run deploy:preview` | Deploy preview to Vercel |
| `npm run verify-stripe` | Verify Stripe config locally |
| `npm run verify-health` | Hit health-check Edge Function |

---

## Environment Variables

### Frontend (VITE\_ prefix — exposed to browser)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous/public key |
| `VITE_VAPID_PUBLIC_KEY` | ✅ | VAPID key for push notifications |
| `VITE_SENTRY_DSN` | ✅ | Sentry DSN for error tracking |
| `VITE_TURNSTILE_SITE_KEY` | ✅ | Cloudflare Turnstile site key |
| `VITE_GA4_ID` | Optional | Google Analytics 4 measurement ID |

### CI/CD Secrets (GitHub Actions)

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel deploy token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

### Local Scripts Only

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | For `npm run verify-stripe` |
| `CRON_SECRET` | For `npm run verify-health` |

### Sentry Source Maps (CI only)

| Variable | Description |
|----------|-------------|
| `SENTRY_AUTH_TOKEN` | Sentry auth token |
| `SENTRY_ORG` | Sentry org slug (default: `pptides`) |
| `SENTRY_PROJECT` | Sentry project slug (default: `pptides-web`) |

> **Note:** Google Client ID for OAuth is hardcoded (it's a public value). All Supabase Edge Function secrets (Stripe, Resend, DeepSeek keys) are managed in the Supabase Dashboard, not in this repo.

---

## Deployment

### Automatic (CI/CD)

Every push to `main` triggers the GitHub Actions pipeline:

1. **Quality** — Lint → Type-check → Test (with coverage)
2. **Build** — Production build + bundle size report
3. **Deploy** — Vercel production deploy (main branch only)

Pull requests run quality + build checks without deploying.

### Manual

```bash
npm run predeploy       # type-check + build
npm run deploy          # production
npm run deploy:preview  # preview URL
```

### Vercel Configuration

- **Framework:** Vite (auto-detected)
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node.js:** 20.x
- **SPA routing:** All routes rewrite to `/index.html`
- **Security headers:** CSP, HSTS, X-Frame-Options, etc.
- **Caching:** Immutable for hashed assets, no-cache for service worker

---

## Project Structure

```
peptide-protocols/
├── .github/workflows/ci.yml   # CI/CD pipeline
├── public/                     # Static assets
├── src/
│   ├── components/             # Reusable UI components
│   ├── config/                 # App configuration
│   ├── contexts/               # React contexts (Auth, Theme, etc.)
│   ├── data/                   # Peptide data, interactions
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities (analytics, dose calc, etc.)
│   ├── pages/                  # Route pages
│   ├── test/                   # Test setup
│   ├── sw.ts                   # Service worker (Workbox)
│   ├── App.tsx                 # Root component + routes
│   └── main.tsx                # Entry point
├── supabase/
│   ├── functions/              # Edge Functions
│   ├── migrations/             # Database migrations
│   └── config.toml             # Supabase config
├── scripts/                    # Build/verify scripts
├── vercel.json                 # Vercel config (headers, rewrites)
├── vite.config.ts              # Vite + PWA + Sentry config
├── tailwind.config.ts          # Tailwind config
└── vitest.config.ts            # Test config
```

---

## Operational Docs

- [FOUNDER_RUNBOOK.md](./FOUNDER_RUNBOOK.md) — Day-to-day operational procedures
- [OPERATIONS.md](./OPERATIONS.md) — Deployment and infrastructure details
- [SOURCE_OF_TRUTH.md](./SOURCE_OF_TRUTH.md) — Canonical config and settings
- [DEPENDENCY_MAP.md](./DEPENDENCY_MAP.md) — Service dependencies
- [MANUAL_STEPS_RUNBOOK.md](./MANUAL_STEPS_RUNBOOK.md) — Manual setup steps
- [docs/SECRETS_INVENTORY.md](./docs/SECRETS_INVENTORY.md) — Full secrets reference

---

## العربية

### حول المشروع

pptides أشمل مرجع عربي للببتيدات العلاجية — بروتوكولات، حاسبة جرعات، مدرب ذكي، ودليل تحاليل.

### المميّزات

- أكثر من 41 ببتيد مع بروتوكولات كاملة
- حاسبة جرعات دقيقة مع وحدات السيرنج
- مدرب ذكي بالذكاء الاصطناعي
- دليل تحاليل مخبرية
- متتبّع حقن وسجل مجتمعي
- فاحص تفاعلات الببتيدات

### التطوير

```bash
npm install
cp .env.example .env
npm run dev
```

---

## License

UNLICENSED — Private repository.
