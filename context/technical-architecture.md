# Technical Architecture — C2I2A / ICAIA Conference Platform

## Stack
- Next.js 16 App Router
- React 19
- TypeScript
- Payload CMS 3 embedded in Next.js
- PostgreSQL via Payload Postgres adapter + Neon serverless/WebSocket pool
- Vercel deployment
- Vercel Blob for durable private uploads
- Resend + React Email
- next-intl for FR/EN routing/content
- Tailwind CSS v4 + shadcn-style UI components
- Vitest integration tests
- Playwright E2E tests

## Runtime topology
One application serves both the public site and Payload:
- public site: `src/app/(frontend)/[locale]/...`
- Payload admin: `/admin`
- Payload REST: `/api`
- Payload GraphQL: `/api/graphql`
- locale routing proxy: `src/proxy.ts`

Avoid creating routes that conflict with Payload endpoints.

## Data model
### Content / programme
- `editions`
- `pages`
- `important-dates`
- `sessions`
- `speakers`
- `rooms`
- `committees`
- `sponsors`
- `gallery-items`
- `media`
- `site-settings` global

### Workflow
- `users`
- `registrations`
- `submissions`
- `submission-files`
- `magic-links`

## Roles
Current roles:
- `admin`
- `editor`
- `reviewer`
- `author`
- `attendee`

Current product reality: author and attendee are both portal-capable roles. Do not invent a new capability distinction until the product decision is explicit.

## Access-control architecture
Access helpers live in `src/access/index.ts`.

Important rule: access and business invariants must be safe through the generated Payload APIs, not only through UI routes/server actions.

Known hardening target:
- collections using Payload `versions.drafts` must explicitly restrict anonymous reads to published content.

## Authentication
### CMS users
Admins, editors and reviewers use Payload password login.

### Portal users
Authors/attendees use passwordless magic links.

Current magic-link design:
- token generated with secure random bytes
- only SHA-256 token hash stored
- IP used only through a secret-key HMAC for throttling
- elevated CMS roles do not receive magic links
- tokens single-use
- verification uses a conditional update to claim a token atomically
- successful verification signs a Payload-compatible JWT and sets `payload-token`

Known bug to fix:
- registration links are intended to live 7 days, but cleanup currently deletes links based on `createdAt < 24h`; cleanup should be expiry-based.

## Upload/storage architecture
### Public CMS images
Stored using the Vercel Blob adapter in production, served through Payload file routes. Publicly readable collection.

### Submission files
Separate `submission-files` collection. Private. Requests pass through Payload access control.

Current submission validation includes:
- authenticated portal account
- live edition lookup
- submission window check
- file size max 4 MB
- MIME check
- `%PDF-` signature check
- sanitized filename
- orphan cleanup when submission creation fails

Known future requirement from ICAIA'27:
- support DOCX in addition to PDF
- separate anonymized manuscript from author/cover metadata
- potentially multiple files/stages (abstract, full paper, corrected final version)

Do not extend file types until collection validation and storage access are updated together.

## Localization
- public routes: `/fr/...` and `/en/...`
- French default
- Payload localized content falls back to French
- all new conference content should be localized when appropriate
- manuscript language is separate from interface localization

ICAIA'27 accepts French, English and Arabic manuscripts. Do not confuse that with enabling an Arabic public-site locale.

## Public query layer
`src/lib/queries.ts` is the main server-side content query layer.

Good patterns to preserve:
- locale + `fallbackLocale: 'fr'`
- graceful failure when database is unavailable
- React `cache()` for repeated request-level queries
- selected/limited fields where possible
- RSC serialization minimized before passing data to client components

## Caching / revalidation
CMS content collections use hooks in `src/hooks/revalidateSite.ts` to trigger public-site revalidation. Public pages also use hourly ISR as a fallback.

When adding CMS-managed content, attach the appropriate revalidation hooks.

## Migrations
Current deployment builds use `npm run ci`, which runs migrations then `next build`.

Rules:
- every collection/global schema change requires regenerated Payload types
- persistent schema changes require a committed migration
- Preview and Production databases must be isolated by environment configuration
- test database must be isolated from production

## Seed data
`src/seed/index.ts` currently seeds:
- site settings
- archived 2024 edition and programme
- a generic current/live edition

The next data work should replace generic placeholder edition content with authoritative structured edition imports, especially 2025 and later 2027.

Seed/import scripts must be idempotent.

## Known architecture risks / debt
### P0
- Update Next.js/React dependency stack to currently patched versions before release.
- Restrict public reads of Payload draft-enabled collections.

### P1
- Business-rule bypass via direct Payload API writes where validation exists only in server actions.
- Magic-link cleanup uses creation age rather than expiry.
- Review notes are hidden from authors in Payload but included in decision emails; split internal notes from author-facing feedback.
- Decision email delivery has no durable retry/outbox.
- E2E test admin account uses predictable credentials against whichever DB is configured; require explicit test DB.

### P2
- Database/domain invariants need strengthening: registration uniqueness, one live edition, page slug uniqueness per edition, session time validation, same-edition relationships.
- Production storage/email requirements currently fail open instead of always failing deployment.
- Add committed GitHub CI workflow and production monitoring.

## Desired architecture direction
Keep the monolithic Next.js + Payload architecture. Improve boundaries and invariants instead of splitting services.

For future ICAIA'27 workflow expansion, likely schema additions include:
- thematic axes
- paper type
- manuscript language
- multiple submission stages/files
- co-authors and corresponding author
- reviewer assignments
- review reports
- decision state including revision-required
- registration category / fee
- payment status and proof

These should be introduced incrementally with migrations and tests, not as one large rewrite.
