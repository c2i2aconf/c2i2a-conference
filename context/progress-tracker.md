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
- [x] Reviewed supplied historical `c2i2a.sciencesconf.org` link as a secondary archive source.
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

## In progress
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
