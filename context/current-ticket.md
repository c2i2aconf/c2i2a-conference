# Current Ticket — Teacher/Demo Public UI Polish

## Status

**IMPLEMENTED AND VERIFIED — awaiting owner review; not committed**

## Objective

Polish the Payload-driven public conference site for a teacher/demo review while preserving the existing data model, security boundaries, workflows, migrations, and edition-scoped 2024/2025/2027 content.

## Scope completed

- Refined the shared academic visual language: typography hierarchy, section rhythm, restrained institutional cards, page heroes, focus treatment, and reduced-motion support.
- Reworked the current-edition homepage around edition-managed identity, edition number, theme, provisional working date, venue, organizers, call-for-papers CTA, registration state, thematic axes, and chronological upcoming dates.
- Kept the 15/22 May provenance note available on the detailed About view while preventing it from dominating the homepage.
- Improved call-for-papers scanning for all thematic axes and grouped the Payload-managed author, format, review, and publication requirements.
- Rebuilt the important-dates presentation as a chronological, responsive timeline driven by `important-dates` records.
- Made disabled registration intentional and informative while retaining the verified edition-managed fees and participation requirements.
- Improved committee grouping, contact cards, archive discoverability, and generic archived-edition detail sections.
- Simplified the desktop header, added a consistent call-for-papers action, fixed tablet/mobile navigation coverage, and strengthened the footer information architecture.
- Added localized FR/EN presentation copy only; no conference facts were added to translation files.

## Preserved constraints

- No collection, field, migration, auth, review, payment, or archive-data changes.
- No registration or submission workflow was enabled.
- No hardcoded 2024, 2025, or 2027 historical facts were introduced into React components.
- Historical archive pages remain generic and edition-driven.
- No commit or push until owner review.

## Verification completed

- Desktop visual review: FR homepage, call for papers, dates, registration; EN archive listing.
- Mobile visual review: FR homepage and mobile navigation at 390 px.
- All 20 targeted localized public routes returned HTTP 200 from the `conference-tests`-backed dev server, including the 2024 and 2025 archive details.
- Integration tests: 6 files / 31 tests passed.
- Lint, TypeScript, and production build passed.
- `git diff --check` and final worktree status recorded for review.

## Out of scope

- Data-model redesign
- Auth/security changes
- Reviewer, revision, payment, or invitation-letter workflow work
- Conference content corrections or additions
- New migrations
- Registration/submission activation
