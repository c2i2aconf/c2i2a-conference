# AI Workflow Rules — C2I2A / ICAIA Conference Platform

## Purpose
This file tells any AI coding agent how to work in this repository without repeatedly rediscovering the project or making unsafe assumptions.

## Read order before changing code
1. `AGENTS.md`
2. `context/project_overview.md`
3. `context/technical-architecture.md`
4. `context/current-ticket.md`
5. `context/progress-tracker.md`
6. `context/code-standards.md`
7. `context/attendy-ui-specification.md` for UI work
8. The exact source files related to the ticket

Do not begin implementation before reading the current ticket and the relevant domain model.

## Source-of-truth hierarchy
When conference facts conflict, use this order and do not silently reconcile disagreements:
1. Latest official organizer document supplied for the edition.
2. Explicit organizer/teacher correction recorded in `current-ticket.md`.
3. Official SciencesConf edition website.
4. Existing Payload CMS data / seed data.
5. Existing UI copy.

Record unresolved conflicts in `current-ticket.md` under **Blockers / decisions needed**.

### Known source conflict
The ICAIA'27 argumentaire body and calendar state **15 May 2027**, while the poster image on its first page states **22 May 2027**. Do not choose one date until the organizer confirms it.

## Product rules
- This is a real conference platform, not a static school demo.
- The CMS is the source of conference content. Do not hardcode edition-specific content into React pages.
- Public content must support yearly editions and archives.
- French is the default website language; English is supported.
- ICAIA'27 submission rules accept French, English, and Arabic manuscripts. That is a workflow requirement even if the public interface remains FR/EN unless explicitly expanded.
- Private workflow data must stay behind Payload access control.
- Never expose submission files through public blob URLs.
- Never trust client-side validation as the only validation.
- Business invariants must hold through Payload REST/GraphQL/Local API, not only through Next.js server actions.

## Security rules
Before merging changes touching auth, submissions, registration, uploads, drafts, or users:
- Verify authorization at the collection/access/hook layer.
- Check direct REST/GraphQL access cannot bypass the UI/server action.
- Test owner isolation with at least two users.
- Test anonymous access separately.
- Keep admin/editor/reviewer accounts password-only unless the product explicitly changes.
- Keep magic-link tokens hashed, short-lived, single-use, and non-enumerating.
- Use `getServerURL()` for canonical auth/email URLs; never trust request host/origin headers.
- Ensure draft content is not publicly readable.

## Database and migration rules
- Payload/Postgres IDs are numeric.
- After schema changes: `npm run generate:types`.
- Generate a migration for every persistent schema change: `npm run migrate:create`.
- Commit generated migrations and updated types.
- Never rely on dev schema push as the production migration strategy.
- Never run tests against a production database. Test execution must use an explicit test database/Neon branch.

## Implementation workflow
For each ticket:
1. Restate acceptance criteria in `current-ticket.md`.
2. Inspect affected collections, access helpers, server actions, pages, tests, and migrations.
3. Implement the smallest coherent vertical slice.
4. Add or update tests at the same time.
5. Run: lint → typecheck → integration tests → targeted E2E → build.
6. Update `progress-tracker.md` with completed work, remaining risks, and next action.
7. Keep commits concise and scoped.

## AI usage optimization
Use context files instead of asking the agent to re-analyze the whole repository every time.

Preferred prompt pattern:
> Read `AGENTS.md` and every file in `context/`. Work only on the current ticket. First inspect the affected code, then propose a short implementation plan, implement it, run relevant checks, and update `context/progress-tracker.md`. Do not change unrelated code.

For a new task, replace `context/current-ticket.md`; do not rewrite the other context files unless architecture/product facts changed.

## Definition of done
A task is not done because the UI looks correct. It is done when:
- Acceptance criteria are met.
- Direct API paths obey the same rules as the UI.
- Types and migrations match the schema.
- Tests cover success and important abuse/failure paths.
- No private data is exposed.
- Bilingual content still works.
- Mobile and desktop layouts remain usable.
- `progress-tracker.md` is current.
