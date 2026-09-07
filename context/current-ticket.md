# Current Ticket — Foundation + Real Conference Data Preparation

## Status
**IN PROGRESS — context foundation created; website/data update not yet implemented**

## Objective
Prepare the repository for efficient AI-assisted work and make the next implementation milestone focused on turning the existing site into a credible, real conference platform using authoritative 2025 historical data and the supplied ICAIA'27 argumentaire.

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

Secondary historical source supplied:
- `https://c2i2a.sciencesconf.org/`

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
