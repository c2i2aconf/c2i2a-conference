# C2I2A — Vision, History & Roadmap

> Living document. Consult it to understand **why** the project exists, **what** has been
> built, and **where** it is going. Updated whenever the direction or scope changes.

---

## 1 · Vision

Build the official website of **C2I2A** (Colloque International sur l'Intelligence
Artificielle et ses Applications), organized by **HEEC Marrakech** — a site that:

- **Looks like a real, modern conference site** — striking hero, countdown, keynote
  speakers, key dates, partners, gallery, venue — comparable to established academic
  conference sites.
- **Is multi-edition** — every year is an "edition"; past editions stay browsable under
  `/archive/[year]` with their full program.
- **Is 100% admin-managed** — organizers edit everything from `/admin` (Payload CMS);
  no content is hardcoded, no developer needed year to year.
- **Is bilingual** — French (default) + English, every content field localized.
- **Handles the full workflow** — free attendee registration, author paper submission
  with PDF upload, reviewer accept/reject, email notifications (Resend).
- **Performs and degrades gracefully** — SSG where possible, and public pages still
  render when the database is unreachable.

## 2 · Design language

- **Brand**: HEEC deep royal blue (primary) + warm Moroccan gold (accent).
- **Typography**: Inter (body) + Space Grotesk (display).
- **Tone**: clean, academic, premium. Generous whitespace, eyebrow labels, gold
  dividers, subtle scroll-reveal motion. **No zellige/ethnic pattern motifs** —
  the identity is institutional, not folkloric.
- **Dark mode** supported throughout (`.dark` tokens in `globals.css`).

## 3 · History — what has been done

| Date       | Change                                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-19 | **Scaffold** (`3b3eda6`) — Next.js 16 + Payload CMS 3 + next-intl (fr/en) + Tailwind v4 design system + 14 collections + seed script.                                                        |
| 2026-08-19 | **DB fixes** (`daeb856`) — Neon websocket driver; renamed edition status field (enum conflict).                                                                                              |
| 2026-08-20 | **Public pages** (`62c3771`) — program, dates, speakers, archive (real 2024 program migrated from sciencesconf), registration, gallery, sponsors, committees.                                |
| 2026-08-20 | **Lint fixes** (`89f6819`) — repo-wide linting errors and warnings.                                                                                                                          |
| 2026-08-20 | **Polish pass 1** (`8ee131b`) — hooks-order fix in register action, remaining lint warnings, `next/image` for media.                                                                         |
| 2026-08-20 | **Test infra** (`847c81a`) — raised Vitest hook timeout so full-app `getPayload` boot fits; all suites green (lint · tsc · build · e2e · int).                                               |
| 2026-08-20 | **Launch hardening** (uncommitted) — completed the visual roadmap, portal security, controlled submissions, localized email, private storage, SEO, migrations, and production configuration. |
| 2026-08-21 | **Production launch** — provisioned Neon and private Vercel Blob, applied migrations and seed data, deployed `c2i2a-conference`, and verified the live bilingual platform.                    |

## 4 · Current state

- The complete bilingual public site, yearly archives, CMS-created navigation and pages,
  portal authentication, registration, submission, account, and reviewer workflows are implemented.
- Production infrastructure is encoded through private Blob storage, committed migrations,
  environment validation, SEO handlers, and a migration-first Vercel build command.

## 5 · Roadmap — future changes

### Phase A — "Stunning & functional" (complete)

- [x] **Design foundation** — gradient/glow hero utilities, gold-gradient text,
      `Reveal` (scroll-reveal), `Countdown`, `AnimatedCounter`, `SectionHeading`,
      shadcn `Sheet`.
- [x] **Chrome** — working mobile drawer, scroll-aware header, animated active-link,
      rich footer (contact + socials from Site Settings).
- [x] **Homepage** — photo hero + overlay (graceful gradient fallback), countdown,
      about + animated stats, keynote speakers, key-dates preview, sponsors wall,
      gallery strip, venue teaser.
- [x] **New pages** — `/about`, `/access` (venue + map), `/contact`.
- [x] **Magic-link auth** — passwordless sign-in (Resend email, dev-mode fallback),
      `/auth/login`, `/auth/verify`, `/account` (profile + my registrations/submissions),
      auto-linking registrations by email.
- [x] **Submission flow** — gated `/submission` form (title, abstract, PDF → private
      `submission-files`), fixes the 404.
- [x] **Polish** — uniform page-hero band on all content pages, per-page metadata,
      extended e2e smoke tests.

### Phase B — production readiness (implementation complete; live deployment pending)

- [x] Abstract deadline countdown on `/submission`; auto-close after deadline.
- [x] Reviewer workspace in `/admin`, restricted to status and review notes.
- [x] Localized email templates with `@react-email/components`.
- [x] OG images per edition; localized sitemap and restricted robots rules.
- [x] Deploy to Vercel + Neon (README documents the steps).
- [x] Migrate `middleware.ts` → `proxy.ts` for Next.js 16.

## 6 · How to consult / update this file

- **Check section 5** to see what's planned vs done (boxes ticked as work lands).
- **Add a row to section 3** for every notable change (mirror the commit message).
- Keep section 2 honest: if the visual identity changes, update it here first.
