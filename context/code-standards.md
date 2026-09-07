# Code Standards — C2I2A / ICAIA Conference Platform

## General principles
- Prefer clarity over cleverness.
- Keep domain rules near the data boundary.
- Do not duplicate validation between multiple layers unless one layer is intentionally defensive.
- Avoid hardcoding edition-specific conference facts in components.
- Keep files focused; extract helpers when logic becomes domain-significant.
- Preserve existing formatting and lint rules.

## TypeScript
- Use strict types from Payload-generated types wherever possible.
- Avoid `any`; if unavoidable, isolate and document it.
- Prefer discriminated unions for workflow state.
- Reuse shared domain constants/types instead of repeating strings.
- Never manually edit `src/payload-types.ts`; regenerate it.

## Next.js / React
- Public pages live under `src/app/(frontend)/[locale]/`.
- Use `@/i18n/navigation` Link/redirect helpers for localized frontend navigation.
- Call `setRequestLocale(locale)` in localized pages/layouts as required by the current project convention.
- Prefer server components unless interaction requires a client component.
- Keep client component props small and serializable.
- Use `next/image` for CMS images.
- Do not fetch protected workflow data from the browser if it can be loaded server-side.

## Payload CMS
- One collection per file in `src/collections/`.
- Reuse access helpers from `src/access/index.ts`.
- Public content may be readable anonymously only when actually published.
- Workflow collection writes must validate business state at the Payload layer.
- `overrideAccess: true` is for deliberate trusted internal operations only; never use it to simplify portal-facing queries.
- When a collection change affects public pages, attach revalidation hooks.
- Add indexes for fields used frequently in filters/uniqueness rules.

## Content modeling
Prefer structured data over large rich-text blobs when the UI or workflow needs to reason about the information.

Examples that should be structured:
- edition dates
- thematic axes
- paper type
- participant fee category
- committee type
- partner type
- submission status
- review status

Rich text is appropriate for narrative content such as the scientific rationale or general presentation.

## Access-control review checklist
For every collection touched, answer:
1. Who can create?
2. Who can read?
3. Who can update?
4. Who can delete?
5. Which fields have stronger restrictions?
6. Can a direct REST request bypass a rule enforced in a server action?
7. Can user A access user B's record/file?
8. Can anonymous users retrieve drafts or private files?

## Forms and validation
- Normalize user input server-side.
- Validate required fields and domain formats server-side.
- Validate uploaded file type by content/signature when feasible, not just extension.
- Enforce size limits at both request and upload layers.
- Return stable error codes/messages suitable for localization.
- Protect duplicate-sensitive flows with database constraints or an atomic strategy where practical.

## Date/time
- Keep conference day semantics timezone-safe.
- Reuse `src/lib/dates.ts` for day-only display.
- Do not introduce browser-local timezone shifts for conference calendar dates.
- Validate textual time fields as `HH:MM` if they remain strings.

## Localization
- UI strings belong in `messages/fr.json` / `messages/en.json`.
- CMS content should use Payload localized fields.
- Never place one language's user-visible copy inline in a shared component unless it is a proper name.
- Interface locale and manuscript language are distinct concepts.

## Email
- Use React Email templates.
- Do not expose internal reviewer information in author-facing email unless explicitly intended.
- Critical workflow email should eventually be retryable/durable.
- Never make successful database state depend on an unreliable external email call unless the transaction strategy is explicitly designed for it.

## Security-sensitive code
Changes involving auth, access, uploads, drafts, session cookies, magic links or reviewer workflow require tests for denial cases, not just success.

Do not log:
- passwords
- raw magic-link tokens in production
- private submission contents
- secrets

## CSS / UI
- Tailwind v4 CSS-first.
- Reuse existing theme tokens from `globals.css`.
- Reuse components from `src/components/ui` before creating new primitives.
- Respect dark mode and reduced-motion preferences.
- Keep keyboard focus visible.
- Use semantic HTML and appropriate labels.

## Testing expectations
For meaningful changes, run or add:
- `npm run lint`
- `npx tsc --noEmit`
- `npm run test:int`
- targeted `npm run test:e2e`
- `npm run build`

Security/workflow tests should include direct Payload/API operations when the feature is accessible through Payload REST/GraphQL.

## Schema-change checklist
1. Edit collection/global.
2. Regenerate types: `npm run generate:types`.
3. Generate migration: `npm run migrate:create`.
4. Review migration.
5. Add/update tests.
6. Run typecheck/test/build.
7. Commit code + generated types + migration together.

## Commit style
Short, imperative and scoped. Examples:
- `fix draft access`
- `import 2025 edition`
- `add submission axes`
- `harden magic link cleanup`

Avoid commits that mix architecture hardening, data imports and visual redesign unless they are inseparable.
