# C2I2A — Conference Platform

Official website of **C2I2A** (Colloque International sur l'Intelligence Artificielle et ses Applications / International Conference on Artificial Intelligence and its Applications), organized by **HEEC** — École des Hautes Études Économiques, Commerciales et d'Ingénierie, Marrakech.

Multi-edition platform: every year is an "edition", past editions stay accessible under `/archive`, and **everything is editable from the admin panel** (`/admin`) — no code changes needed.

## Stack

| Layer        | Tech                                                        |
| ------------ | ----------------------------------------------------------- |
| Framework    | Next.js 16 (App Router) + TypeScript + React 19             |
| CMS / Admin  | Payload CMS 3 (runs inside the Next.js app at `/admin`)     |
| Database     | Neon Postgres (via `@payloadcms/db-postgres`)               |
| Styling      | Tailwind CSS v4 + shadcn/ui + Framer Motion                 |
| i18n         | next-intl — French (default) + English                      |
| Emails       | Resend (via `@payloadcms/email-resend`)                     |
| Testing      | Playwright (e2e) + Vitest (integration)                     |
| Deploy       | Vercel                                                      |

## Quick start

### 1. Environment variables

Copy `.env.example` to `.env` and fill in:

- **`DATABASE_URL`** — create a free project at [neon.tech](https://neon.tech), copy the pooled connection string.
- **`PAYLOAD_SECRET`** — any random string (`openssl rand -hex 32`).
- **`RESEND_API_KEY`** — from [resend.com](https://resend.com) (free tier: 3 000 emails/month). Leave empty to run without emails.

### 2. Install & run

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /fr
```

### 3. Create the first admin user

Open [http://localhost:3000/admin](http://localhost:3000/admin) — Payload will prompt you to create the first user. Give that user the **admin** role afterwards (or it's set automatically for the first user).

### 4. Seed demo content (optional)

```bash
npm run seed
```

This creates the archived **2024 edition with its real program** (migrated from sciencesconf) and a fresh live edition for the current year.

## Scripts

| Command                  | Purpose                              |
| ------------------------ | ------------------------------------ |
| `npm run dev`            | Dev server (Turbopack)               |
| `npm run build`          | Production build                     |
| `npm run seed`           | Seed database (idempotent)           |
| `npm run generate:types` | Regenerate `src/payload-types.ts`    |
| `npm run test:e2e`       | Playwright e2e tests                 |
| `npm run test:int`       | Vitest integration tests             |
| `npm run lint`           | ESLint                               |

## Project structure

```
src/
├── app/
│   ├── (frontend)/[locale]/   # public site (fr/en)
│   └── (payload)/             # /admin panel + /api (auto-generated)
├── collections/               # 14 Payload collections (all FR/EN localized)
├── globals/SiteSettings.ts    # global site settings
├── access/                    # role-based access helpers
├── i18n/                      # next-intl routing & config
├── seed/                      # database seed (2024 archive data)
├── components/ui/             # shadcn/ui components
└── payload.config.ts          # Payload configuration
messages/{fr,en}.json          # UI translations
tests/e2e/                     # Playwright tests
```

## Content model (managed in /admin)

`Editions` (one per year, status draft/live/archived) ← everything links to an edition:
`Sessions`, `Speakers`, `Rooms`, `Pages`, `Important Dates`, `Committees`, `Sponsors`, `Gallery Items` · workflow: `Registrations`, `Submissions` (+ `Submission Files`) · admin: `Users`, `Media`.

## Deployment

Push to GitHub → import in Vercel → add env vars (`DATABASE_URL`, `PAYLOAD_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SERVER_URL`) → deploy. Neon integrates with Vercel natively.
