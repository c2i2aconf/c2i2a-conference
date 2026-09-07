# Codex / AI Prompts — C2I2A / ICAIA Conference Platform

These prompts are designed to reduce token waste and keep AI coding sessions scoped. Replace bracketed values before use.

## 1. Standard implementation prompt
> Read `AGENTS.md` and every file in `context/`, especially `context/current-ticket.md`. Inspect only the code relevant to the current ticket. Summarize the affected architecture in at most 10 bullets, propose a short implementation plan, then implement the ticket. Preserve Payload access control, FR/EN localization, migrations, private storage, and existing design language. Add tests for success and denial/failure paths. Run the relevant lint/type/test/build checks. Finally update `context/progress-tracker.md`. Do not change unrelated code.

## 2. Security hardening prompt
> Read `AGENTS.md`, `context/technical-architecture.md`, `context/code-standards.md`, and `context/current-ticket.md`. Audit the specified feature at every entry point: Next server actions, Payload REST, GraphQL, Local API, collection access, field access, hooks, file routes, and session/auth state. Identify bypasses before editing. Implement the smallest fix that makes the invariant true at the Payload boundary. Add adversarial integration tests proving unauthorized/anonymous/cross-user access fails. Update migrations/types if schema changes. Record the result in `context/progress-tracker.md`.

## 3. Edition import prompt
> Read all repository context first. Import edition [YEAR] from these authoritative sources: [SOURCES]. Do not invent missing facts. Create an idempotent import/seed path using structured Payload collections. Preserve localized FR/EN content where source material supports it. Archive historical editions; never mark an old registration/submission workflow as open. Add source comments/metadata where useful. Before implementation list every source conflict or missing field and put unresolved items in `context/current-ticket.md`. Do not hardcode edition content in React components.

## 4. ICAIA'27 schema-planning prompt
> Read `context/project_overview.md` and `context/technical-architecture.md`. Compare the current Payload model with the ICAIA'27 requirements recorded in context. Produce a migration-safe schema plan for thematic axes, contribution type, manuscript language, co-authors, staged files, reviewer assignments/reports, revision-required decisions, participant categories, and payment proof. Separate MVP requirements from later workflow. Do not implement until the plan identifies access rules, API invariants, migration impact, and test cases.

## 5. UI redesign prompt
> Read `context/attendy-ui-specification.md`, the current frontend components, and the CMS schema before changing UI. Improve [PAGE/FEATURE] while keeping the HEEC royal-blue/gold institutional design, dark mode, responsive behavior, accessibility, and CMS-driven content. Do not add hardcoded conference facts or placeholder speakers/partners. Prefer existing UI primitives. Keep server components by default and minimize client payload. Add/update Playwright coverage for the changed experience.

## 6. Bug-fix prompt
> Read project context and inspect the exact failing path. Reproduce or explain the bug from code before changing anything. Fix the root cause, not the visible symptom. Add a regression test that fails on the old behavior and passes after the fix. Avoid refactoring unrelated modules. Run targeted checks and update `context/progress-tracker.md` with cause, fix, and verification.

## 7. Review a proposed PR/diff
> Review this change against `AGENTS.md` and all `context/` rules. Focus on correctness, Payload access-control bypasses, data integrity, migrations/types, private file handling, FR/EN regressions, RSC/client boundaries, accessibility, and test coverage. Rank findings P0/P1/P2/P3. Do not praise routine code; prioritize actionable defects and missing guarantees.

## 8. Database/schema change prompt
> Before modifying any Payload collection/global, read the current generated types and migration history. Define the desired invariant and whether it belongs in field validation, collection access, hook, or database constraint/index. Implement schema + access/hook changes, regenerate `src/payload-types.ts`, generate/review a migration, and add integration tests. Ensure existing production data can migrate safely.

## 9. Test-writing prompt
> Add adversarial tests for [FEATURE]. Cover anonymous, correct owner, second user, reviewer/editor/admin where relevant, direct Payload Local API with `overrideAccess: false`, and HTTP REST/route behavior when practical. Test both allowed and denied field updates. Never create predictable test-admin credentials against an unspecified database; require the test environment guard.

## 10. Teacher/demo readiness prompt
> Review the application as if it will be demonstrated to a teacher tomorrow. Use the current context and real conference sources. Identify broken/placeholder/inconsistent visible states, incorrect edition data, dead CTAs, confusing workflow, mobile issues, and console/server errors. Rank only the changes that materially improve a 5–10 minute demonstration. Do not propose a rewrite.

## 11. End-of-session prompt
> Before stopping, update `context/progress-tracker.md`: what changed, files/schema/migrations touched, tests run and results, unresolved risks, source conflicts, and the single recommended next task. If the current ticket is complete, mark it complete without erasing its history.

## Token-efficient working rules
- Ask the agent to read context first, not “analyze the entire repo” every session.
- Keep one ticket active.
- Request targeted file inspection.
- Separate research/data-import tasks from UI work.
- Separate schema design from implementation when the workflow is large.
- Keep source conflicts visible; do not spend tokens repeatedly rediscovering them.
- Use `progress-tracker.md` as handoff state between sessions.
