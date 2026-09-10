# Current Ticket — 2024/2025 Historical Accuracy Review

## Status

**IMPLEMENTED — awaiting owner review; not committed**

## Objective

Reconcile the 2024 and 2025 archives against their official SciencesConf sites. Official historical content takes precedence over legacy seed values, while every record and relationship remains edition-scoped and idempotent.

## Active acceptance criteria

- Correct and publish the 2024 archive from `c2i2a.sciencesconf.org`, including its Casablanca venue, theme, programme titles, affiliations, committees, and partners.
- Keep one archived, published 2025 edition with official localized identity, event date, venue, description, and important dates.
- Import speakers, partners, sessions, rooms, committees, and gallery items only when the official source is populated and internally consistent.
- Keep submissions disabled and do not expose historical calls to action as open.
- Make both imports idempotent and prevent cross-edition relationships.
- Preserve FR/EN routing and use official English content where available; use French fallback where the official English page is untranslated.
- Verify `/fr/archive/2024`, `/en/archive/2024`, `/fr/archive/2025`, and `/en/archive/2025` against the isolated `TEST_DATABASE_URL` where practical.
- Run lint, TypeScript, integration tests, build, `git diff --check`, and `git status`.

## Immediate deliverables

### A. Context system

Create and maintain:

- `context/ai-workflow-rules.md`
- `context/attendy-ui-specification.md`
- `context/code-standards.md`
- `context/codex-prompts.md`
- `context/current-ticket.md`
- `context/progress-tracker.md`
- `context/project_overview.md`
- `context/technical-architecture.md`

### B. Next implementation milestone

Do **not** start a broad redesign yet. The next code ticket should be:

**“Teacher/demo readiness: harden critical boundaries and import the real 2025 edition.”**

Recommended order:

1. dependency security update
2. fix public draft access
3. move workflow invariants to Payload boundary / close direct API bypasses
4. fix magic-link cleanup TTL bug
5. introduce mandatory test DB guard
6. import real 2025 edition data into the archive
7. polish visible archive/current-edition experience for the demo

## 2025 authoritative source

Primary supplied historical source:

- `https://icaia25.sciencesconf.org/`

Verified from the official source currently accessible:

- theme/title: **Intelligence Artificielle et ses Applications : IA pour un développement durable et inclusif**
- abstract deadline: **1 September 2025**
- acceptance notification: **25 September 2025**
- conference date: **18 October 2025**
- venue: **HEEC Marrakech**

Additional pages (programme, description, submission, committees, partners, gallery, contact) should be imported only where the official source can be retrieved/verified. Missing facts must remain missing rather than invented.

Authoritative 2024 historical source:

- `https://c2i2a.sciencesconf.org/`

Verified 2024 facts include the 1 June 2024 event at EIGSI Casablanca, the theme **Hydrogène vert et l’intelligence artificielle : Défis et opportunités**, twelve official programme slots, five rooms, twelve programme speakers, four French important-date records, two committees, and two partners.

The official 2024 French and English important-date pages conflict: the French page gives a 27 May extension and a 25–30 May acceptance window, while the English page gives 30 May for both. The import uses the default French page for the non-localized date fields.

The official 2024 gallery lists 61 image files without captions. They are not imported by this ticket because `gallery-items.image` requires a managed Payload Media upload and the current importer has no durable official-source URL/provenance field or bundled historical asset set. Do not replace those images with invented media.

## ICAIA'27 source

Uploaded organizer document: `Argumentaire_ICAIA27_V1.docx`.

Use it as the primary source for the future 2027 edition model/content.

Key source requirements already captured in `project_overview.md`:

- 15 thematic axes
- multiple contribution types
- FR/EN/AR manuscripts
- extended abstract + full paper stages
- PDF + DOCX
- anonymized manuscript + author cover information
- double review and third review on disagreement
- accepted / revision-required / rejected decisions
- participant categories and fees
- committee categories
- national/international partners and partner journals

## Blockers / decisions needed

### ICAIA 2025 programme date conflict

The official important-dates page identifies **18 October 2025** as the event date, but the official programme remains dated **21 June 2025** and the description still mentions an earlier **7 June 2025** postponement. Programme-derived sessions, rooms, and speaker links must remain unimported until an organizer source resolves which programme actually ran on 18 October.

### 1. ICAIA'27 date conflict — MUST CONFIRM

The supplied argumentaire contains two different event dates:

- cover poster: **22 May 2027**
- narrative + detailed calendar: **15 May 2027**

Do not publish a final 2027 date or countdown until confirmed.

### 2. 2027 website naming

Need organizer decision on primary public brand:

- C2I2A
- ICAIA'27
- or C2I2A as platform / ICAIA as edition brand

Current source document uses ICAIA'27 prominently.

### 3. Scope for teacher handoff

Before implementing the full 2027 workflow, decide whether the teacher demo requires:

- historical 2025 archive only
- a 2027 preview/call-for-papers page
- working submission workflow aligned to 2027 rules
- or all three

Default recommendation: **secure foundation + 2025 archive + accurate 2027 preview**, then expand workflow after the demo unless the teacher explicitly expects it.

## Acceptance criteria for the next code ticket

- No known critical dependency advisory remains unaddressed in the deployed stack.
- Anonymous users cannot retrieve Payload drafts.
- Direct Payload API calls cannot bypass registration/submission business invariants covered by the ticket.
- Magic-link cleanup does not delete unexpired 7-day registration links.
- Tests refuse to run against an unspecified/production database.
- 2025 exists as an archived Payload edition with verified title/theme/date/venue and any additional verified official data.
- Old 2025 registration/submission CTAs are not shown as open.
- FR/EN public archive pages render cleanly on desktop and mobile.
- Tests/typecheck/build pass for the changed scope.
- `progress-tracker.md` is updated.

## Out of scope until explicitly promoted

- payment gateway
- automated visa invitation letters
- full multi-reviewer assignment/scoring UI
- Arabic public website locale
- certificate generation
- journal API integrations
- full 2027 production launch

## Handoff instruction for the next AI session

Use this exact prompt:

> Read `AGENTS.md` and all files in `context/`. Work on `context/current-ticket.md`. First inspect the code relevant to P0/P1 hardening and the 2025 import. Give me a short plan grouped into security, data import, and demo polish. Do not implement 2027 workflow expansion yet unless I explicitly approve it.
