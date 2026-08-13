# AGENTS.md — C2I2A Conference Platform

Guidance for AI agents working in this repo.

## What this is

Conference website for **C2I2A** (HEEC Marrakech). Multi-edition (yearly archives), bilingual (fr default + en), fully admin-managed via Payload CMS. No content should ever be hardcoded — everything editable in `/admin`.

## Commands

- Dev: `npm run dev` · Build: `npm run build` · Types: `npm run generate:types` (run after changing any collection!) · Seed: `npm run seed` · Tests: `npm run test:e2e`, `npm run test:int` · Lint: `npm run lint` · TS check: `npx tsc --noEmit`

## Architecture rules

- **Payload lives inside Next.js**: admin at `/admin`, REST at `/api`, GraphQL at `/api/graphql`. Never create conflicting routes.
- **IDs are numbers** (Postgres). Relationship fields accept `number | Doc`.
- **Localization**: every content field has `localized: true`. Frontend queries must pass `locale` + `fallbackLocale: 'fr'`. Payload locales: `fr`, `en`.
- **Access control**: use helpers from `src/access/index.ts` (`anyone`, `isAdmin`, `isAdminOrEditor`, `isAdminOrReviewer`, `isAdminReviewerOrAuthor`, `isAdminOrSelf`). Content collections are publicly readable; workflow collections (submissions, registrations) are restricted.
- **Frontend routing**: all public pages live in `src/app/(frontend)/[locale]/`. Use `Link`/`redirect` from `@/i18n/navigation` (never `next/link` directly). Call `setRequestLocale(locale)` in every page/layout.
- **Middleware** (`src/middleware.ts`) handles locale routing and excludes `admin|api|graphql|_next|static`. Keep those exclusions when editing the matcher.
- **Styling**: Tailwind v4 CSS-first; theme tokens in `src/app/(frontend)/globals.css` (HEEC royal blue primary + Moroccan gold accent, dark mode via `.dark`). shadcn components go in `src/components/ui/` (`components.json` already configured).
- **DB not always available in dev**: public pages must degrade gracefully when `DATABASE_URL` is a placeholder (see try/catch in `[locale]/page.tsx`).

## Gotchas

- After editing collections: run `npm run generate:types`, otherwise TS errors in unrelated files.
- `resendAdapter` is only enabled when `RESEND_API_KEY` is set (see `payload.config.ts`) — keep the conditional spread.
- Playwright `webServer` runs `npm run dev`; tests hit `http://localhost:3000`.
- Windows shell is PowerShell 5.1: no `&&`, use `; if ($?) {}` instead.

## Conventions

- Collections: one file per collection in `src/collections/`, `CollectionConfig`, admin `group` = `Content | Program | Workflow | Admin`.
- Seed data is idempotent — check existence before creating.
- Commit style: concise, imperative ("add sessions collection").
