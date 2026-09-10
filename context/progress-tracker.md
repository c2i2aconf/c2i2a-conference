# Progress Tracker — C2I2A / ICAIA Conference Platform

## Current phase

**Foundation hardening + authoritative conference data integration**

## Completed

### Repository / architecture analysis

- [x] Reviewed repository architecture, Payload collections, auth, registration, submission, storage, queries, migrations, tests, deployment and frontend structure.
- [x] Compared implementation against `AGENTS.md`, `README.md` and `VISION.md` intent.
- [x] Identified strong existing architecture worth preserving: embedded Payload/Next app, centralized access helpers, localized data model, private submission storage, query layer and migration-first deployment.

### Security / reliability findings documented

- [x] Current dependency stack requires a security update before release.
- [x] Draft-enabled public collections need published-only anonymous access.
- [x] Some workflow rules exist only in Next server actions and can be bypassed through direct Payload APIs.
- [x] Magic-link cleanup can delete unexpired 7-day registration links after 24 hours.
- [x] Reviewer `reviewNotes` confidentiality conflicts with author-facing email behavior.
- [x] Decision emails are not durably retryable.
- [x] E2E test admin credentials need mandatory isolated test database protection.
- [x] Production storage/email capability validation should be stricter.
- [x] Domain invariants need stronger validation/constraints over time.

### Real conference source review

- [x] Reviewed supplied 2025 SciencesConf URL.
- [x] Verified 2025 theme/title, important dates and HEEC Marrakech venue from the official site.
- [x] Reviewed supplied historical `c2i2a.sciencesconf.org` link as the authoritative 2024 archive source.
- [x] Reviewed uploaded `Argumentaire_ICAIA27_V1.docx` and extracted product/workflow requirements.
- [x] Recorded ICAIA'27 15-axis scientific scope.
- [x] Recorded real submission requirements, review process, registration fees, committees, partners and key dates.
- [x] Flagged the official 2027 date conflict: cover says 22 May; body/calendar say 15 May.

### Context foundation

- [x] `context/ai-workflow-rules.md`
- [x] `context/project_overview.md`
- [x] `context/technical-architecture.md`
- [x] `context/code-standards.md`
- [x] `context/attendy-ui-specification.md`
- [x] `context/codex-prompts.md`
- [x] `context/current-ticket.md`
- [x] `context/progress-tracker.md`

### Repository cleanup — 2026-09-08

- [x] Audited tracked source, components, imports, dependencies, configuration, documentation, generated files and ignored local artifacts.
- [x] Removed duplicated nested VS Code configuration and completed `.zcode` session plans; added ignore rules to prevent recurrence.
- [x] Removed the unused `isAuthenticated` access helper after confirming it had no consumers.
- [x] Removed the unused `@testing-library/react` development dependency and its lockfile entry.
- [x] Consolidated `.gitignore` entries while explicitly preserving `.env.example`.
- [x] Removed an inert Playwright template line and corrected stale README references to Framer Motion and magic-link lifetimes.
- [x] Cleared ignored Next.js, Playwright and browser-tooling build artifacts before verification.
- [x] Verification: lint, TypeScript and production build pass. The 10 database-independent integration tests pass; two database-backed suites cannot start because the configured remote Neon database is unreachable and is not identified as an isolated test database, so they were not retried outside the sandbox.
- [x] Intentionally kept uncertain tooling/configuration candidates (`opencode.json`, `.yarnrc`, the `devsafe` script, `@payloadcms/ui`, Payload `custom.scss`) for a separate owner-confirmed cleanup.

### Isolated test database guard — 2026-09-08
- [x] Added mandatory `TEST_DATABASE_URL` validation shared by Vitest, Playwright, Payload and the E2E admin seeder.
- [x] Payload selects `TEST_DATABASE_URL` only in an explicitly activated test runtime; normal development and production continue to use `DATABASE_URL`.
- [x] Test startup rejects missing, malformed, placeholder, production-environment, exact-match and same-endpoint pooled/direct database configurations.
- [x] Playwright starts its own guarded dev server and cannot reuse a normal development server.
- [x] Added focused guard tests and documented isolated Neon branch setup in `.env.example` and `README.md`.
- [x] Guard verification: 6 focused tests pass; unconfigured `npm run test:int` and Playwright config loading both abort before Payload startup with the explicit missing-`TEST_DATABASE_URL` safety error.
- [x] Quality verification: lint and TypeScript pass. Production build passes with Neon network access; its sandboxed attempt compiled but could not reach the configured normal database during prerender.
- [ ] Full DB-backed integration/E2E execution awaits an owner-configured isolated `TEST_DATABASE_URL`; no normal database was used as a fallback.

## In progress

### ICAIA 2025 historical archive import — 2026-09-09

- [x] Re-verified the official SciencesConf identity/theme, abstract deadline (1 Sep 2025), acceptance notification (25 Sep 2025), event date (18 Oct 2025), HEEC Marrakech venue, bilingual description, Prof. Mohammed Youssfi profile, and FST/ENSA partners.
- [x] Recorded the unresolved official-source conflict: the important-dates page says 18 Oct 2025, while the programme remains dated 21 Jun 2025 and the description references an earlier 7 Jun postponement.
- [x] Added an idempotent, edition-scoped 2025 import that creates or updates one published archived edition, three important dates, one independently verified speaker, and two partners; submissions remain disabled.
- [x] Intentionally omitted 2025 sessions and rooms because of the programme-date conflict, and omitted committees/gallery because their official pages contain no records.
- [x] Added official FR/EN edition, date, description, and speaker content. Partner descriptions use the existing French fallback because the official EN sponsor page retains French copy.
- [x] Expanded the archive detail page to render the edition description, event date, venue, important dates, verified speakers, and partners, while omitting an empty programme section.
- [x] Added an integration regression that runs the 2025 import repeatedly and snapshots the 2024 edition dates, important dates, session IDs, speaker IDs, room IDs, and every session-to-room/session-to-speaker relationship before and after.
- [x] Corrected future creation of the existing 2024 seed to set published status explicitly; the guarded existing-record branch still skips 2024 and never overwrites it.
- [x] Initialized the isolated `conference-tests` branch with the repository's existing 2024 regression seed and the 2025 import; no production database was mutated.
- [x] Route verification against `TEST_DATABASE_URL`: `/fr/archive/2024`, `/en/archive/2024`, `/fr/archive/2025`, and `/en/archive/2025` all return HTTP 200 with the expected localized archive content.
- [x] 2024 regression result: the captured dates, edition/session/speaker/room IDs, and session-to-room/session-to-speaker relationships remain exactly equivalent across repeated 2025 imports; the fixture contains 12 sessions, 12 speakers, and 5 rooms.
- [x] Verification passes: `npm run lint`, `npx tsc --noEmit`, `npm run test:int` (6 files, 28 tests), `npm run build`, and `git diff --check`.
- [x] No collection schema changed; Payload types and migrations were not generated.
- [ ] Owner review is required before commit or push.

### 2024/2025 historical accuracy review — 2026-09-09

- [x] Re-audited both official SciencesConf sites and treated them as authoritative over the legacy seed.
- [x] Corrected the 2024 venue from Marrakech to EIGSI Casablanca and replaced the generic theme with the official green-hydrogen/AI theme.
- [x] Replaced the skip-only 2024 seed with an edition-scoped update-or-create importer that explicitly publishes the archived edition and disables submissions.
- [x] Reconciled all 12 official 2024 programme slots, their times, five rooms, twelve programme speakers, room links, and speaker links. Added the six omitted French parallel-session titles and official localized titles where the English programme supplies them.
- [x] Added source-backed affiliations for nine 2024 programme speakers and biographies for the two named conference speakers; left unsupported affiliations absent.
- [x] Reconciled the four French important-date records and their official English labels. Recorded the unresolved localization conflict: FR gives a 27 May extension and 25–30 May acceptance window, while EN gives 30 May for both.
- [x] Imported the 35-member scientific committee, 14-member organization committee, two junior organization members, and the two official partners.
- [x] Audited 61 official 2024 gallery files. They remain intentionally absent because the current gallery model requires managed Payload Media uploads and has no durable official-source URL/provenance field; no images or captions were invented.
- [x] Reconfirmed Prof. Mohammed Youssfi from the official 2025 description (profile, ENSET/Hassan II affiliation, “Prompt Engineering”) and programme (matching plenary). Kept him while continuing to omit the date-conflicted 2025 programme and rooms.
- [x] Extended the generic archive page to render date ranges/notes, speaker affiliations, and edition committees without hardcoded year-specific facts.
- [x] Added integration coverage for repeated 2024 and 2025 imports, stable IDs/counts, official localized/fallback content, and absence of cross-edition relationships.
- [x] Targeted `conference-tests` verification passes: 4 historical archive integration tests.
- [x] Verified all four archive routes against `conference-tests`; each returns HTTP 200 and contains its own expected edition content.
- [x] Final verification passes: `npm run lint`, `npx tsc --noEmit`, `npm run test:int` (6 files, 30 tests), `npm run build`, and `git diff --check`.
- [ ] Owner review is required before commit or push.

### Security hardening — 2026-09-08

- [x] Verified the reported issues in the current implementation before editing: unconditional public draft reads; Local API frontend reads using the access-bypassing default; direct registration bypasses for edition/duplicates/server-owned fields; direct submission/upload bypasses for the live window, deadline, ownership and PDF signature; and age-based magic-link deletion.
- [x] Upgraded Next.js 16.3.0 → 16.3.4, React/React DOM 19.2.6 → 19.2.8, Sharp 0.34.2 → 0.35.4, eslint-config-next 16.3.0 → 16.3.4, and Vitest 4.0.18 → 4.1.11. Payload packages remain at the latest compatible 3.88.0.
- [x] Updated the Node engine from `>=20.9.0` to `^20.19.0 || ^22.13.0 || >=24.0.0`, matching the installed Vite/Vitest/ESLint toolchain while explicitly preserving the Vercel Node 24 runtime.
- [x] Restricted draft document reads to published content for non-admin/editor users, restricted version history to admins/editors, and made frontend edition/page Local API queries respect access control.
- [x] Mitigated Payload CVE-2026-11779 by restricting the users collection unlock operation to admins while no patched Payload release exists.
- [x] Moved registration normalization, required-field/email validation, published live-edition validation, duplicate detection, ownership linking, and server-owned status/check-in enforcement into collection hooks.
- [x] Moved submission/open-window/deadline checks, forced author ownership/pending status, cross-user file rejection, private-file ownership, size/MIME/signature validation into collection hooks/access.
- [x] Replaced age-based magic-link cleanup with immediate expiry cleanup plus 24-hour retention for consumed records.
- [x] Restored the fail-closed isolated test-database infrastructure based on `TEST_DATABASE_URL`; Vitest and Playwright now both abort before running when it is absent or unsafe, and DB suites no longer use `skipIf`.
- [x] Added adversarial REST, GraphQL and access-respecting Local API tests for drafts, version history, registration bypasses, ownership isolation, workflow fields, closed deadlines, private file downloads, and long-TTL cleanup.
- [x] Added direct REST unlock-operation coverage proving a non-admin receives 403 without clearing the target lock and an admin can clear it.
- [x] No persistent schema fields/indexes changed; no Payload types or migration were generated.
- [x] Verification: lint, TypeScript, and the production build pass. Both `npm run test:int` and `npm run test:e2e` fail with the explicit isolated-database safety error because `TEST_DATABASE_URL` is not configured; no DB security test was skipped or executed against the application database.
- [ ] DB-backed functional and adversarial tests, including the unlock-operation regression, remain unexecuted until an isolated `TEST_DATABASE_URL` is configured.
- [ ] The verification host is running Node 22.12.0, below the newly documented supported floor of Node 22.13.0; CI/deployment should use Node 20.19+ or 22.13+ even though the checks completed successfully here.
- [ ] Remaining dependency audit findings: Payload 3.88.0 remains advisory-flagged despite the explicit unlock mitigation; Payload's Postgres migration-tool chain retains an upstream-unfixed esbuild development-server advisory. No high or critical audit findings remain.
- [ ] Registration duplicate protection is hook-based and still has a narrow concurrent-request race until a migration-safe compound database constraint is designed after existing-data review.

### Context branch / review

- [ ] Review context files for final wording.
- [ ] Merge context foundation into `main` after approval.

## Next recommended implementation ticket

**Teacher/demo readiness: harden critical boundaries + import real 2025 edition.**

Suggested implementation sequence:

1. dependency security update
2. Payload draft access hardening
3. direct API workflow invariant hardening
4. magic-link cleanup fix
5. isolated test DB guard
6. real 2025 edition import
7. archive/current-page demo polish

## 2025 import status

### Verified

- [x] Official source URL captured
- [x] Theme/title captured
- [x] Abstract deadline captured: 1 Sep 2025
- [x] Acceptance notification captured: 25 Sep 2025
- [x] Event date captured: 18 Oct 2025
- [x] Venue captured: HEEC Marrakech

### Still to retrieve/verify before import where possible

- [ ] Full conference description
- [ ] Programme
- [ ] Submission rules
- [ ] Registration details
- [ ] Scientific committee
- [ ] Organizing committee
- [ ] Partners
- [ ] Gallery
- [ ] Contact details

If a SciencesConf page is unavailable, do not invent its content. Import the verified subset and leave a follow-up item.

## ICAIA'27 modeling status

### Source facts understood

- [x] conference identity/theme
- [x] 15 axes
- [x] paper types
- [x] FR/EN/AR manuscript acceptance
- [x] extended abstract/full-paper structure
- [x] anonymized review manuscript requirement
- [x] PDF + DOCX requirement
- [x] double-review process
- [x] revision-required decision state
- [x] author-facing anonymized reports
- [x] participant categories and fees
- [x] committee categories
- [x] national/international partners
- [x] partner journals

### Not implemented yet

- [ ] thematic-axis collection/field
- [ ] contribution type
- [ ] manuscript language separate from UI locale
- [ ] co-author/corresponding-author model
- [ ] staged abstract/full/final files
- [ ] DOCX upload validation
- [ ] reviewer assignment + reports
- [ ] revision-required state
- [ ] participant fee category
- [ ] payment/proof workflow
- [ ] visa invitation request workflow

## Decisions waiting on owner/organizer

- [ ] Confirm ICAIA'27 date: 15 May or 22 May 2027.
- [ ] Confirm public naming relationship between C2I2A and ICAIA'27.
- [ ] Confirm teacher-demo scope: archive only, 2027 preview, or working 2027 submission workflow.
- [ ] Confirm which 2027 fees/workflow details are approved for public release versus draft argumentaire content.

## Quality gates for each future session

- [ ] current ticket read before coding
- [ ] relevant access/API boundary inspected
- [ ] no hardcoded edition content introduced
- [ ] migration/types updated for schema changes
- [ ] relevant integration/E2E tests added
- [ ] lint/typecheck/tests/build run
- [ ] this tracker updated

## Last handoff summary

The project does not need a rewrite. The next highest-value work is to make the existing foundation safer and populate it with authoritative real conference data. Once that foundation is clean, expand toward the ICAIA'27 real workflow incrementally rather than implementing all new requirements in one pass.
