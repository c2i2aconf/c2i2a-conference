# Current Ticket — Durable Email Outbox and Retry Delivery

## Status

IMPLEMENTED AND VERIFIED on `feat/email-outbox` — awaiting owner review; not committed or pushed.

## Goal

Make existing transactional email delivery durable and auditable without redesigning registration, peer-review, revision, payment, invitation, or public UI workflows.

## Scope

- Add a durable DB-backed email outbox and enqueue email work within relevant business workflows.
- Define retry behavior, idempotency and duplicate-send prevention, delivery/failure audit state, and concurrency safety.
- Handle email content and PII safely.
- Add organizer/admin inspection or manual retry only where appropriate.
- Add the required migration and integration tests during implementation.

## Out of scope

- Redesigning existing workflows or public UI.
- Marketing, bulk email, newsletters, or conference-content changes.
- Payment gateways.

## Constraints

Preserve existing workflow behavior and authorization boundaries. Follow the repository migration, access-control, localization, and isolated-test-database rules.

## Result

- Added one Payload/Postgres `email-outbox` collection with unique business event keys, encrypted immutable provider snapshots, delivery metadata, leases, retry state, and manual-retry audit fields.
- Registration, submission receipt, magic-link, submission-decision, and revision-request producers now enqueue in the triggering Payload transaction. Provider calls occur only after commit or through the cron worker.
- Added `FOR UPDATE SKIP LOCKED` claims, 30-second leases, a 10-second provider timeout, lease-token guarded outcomes, expired-lease recovery, six attempts, jittered 1/5/15/60/240-minute delays, `Retry-After`, and stable Resend idempotency keys.
- Added 24-hour Resend ambiguity quarantine. Missing provider configuration does not claim jobs; permanent 4xx failures fail immediately; provider acceptance is the `sent` boundary.
- AES-256-GCM protects recipient, sender, subject, HTML, and bearer links with a dedicated 32-byte server key. Ciphertext is field-denied/hidden from normal Local API, REST, GraphQL, and admin reads and is scrubbed after send, cancellation, expiry, consumption, or supersession.
- Added admin-only metadata reads, blocked generic job writes, a dedicated audited admin retry route, and a `CRON_SECRET`-protected Vercel Cron-compatible worker route.
- Magic-link retries reuse the original encrypted token and expiry; consumption, expiry, and supersession cancel and scrub obsolete jobs. Existing generic responses and no-provider development link return remain intact without logging raw tokens.
- Submission transitions now take a row lock and reject stale concurrent decisions. Revision-round uniqueness and transaction rollback continue to prevent contradictory revision events.
- Payload types were regenerated. Additive migrations `20260913_194745_email_outbox` and `20260914_101006_email_outbox_token_marker` were generated and reviewed. The marker migration's exact additive `ALTER TABLE` was applied only to the guarded test database after Payload refused to record the normal migration without a potentially destructive dev-schema reconciliation; no fresh/reset or production migration was run.

## Hostile-audit remediation

- Worker invocations now claim one job immediately before each transport call. Every claim atomically rechecks the 24-hour provider-idempotency cutoff, current magic-link validity, attempt limit, lease expiry, cancellation state, and scheduling eligibility.
- A fresh pre-send check rejects expired/lost leases, newly obsolete tokens, and jobs that crossed the provider window. Outcome writes require the same still-active lease token and unexpired lease; lost outcomes are conservatively quarantined without overwriting a newer worker.
- Previously attempted pending jobs cannot bypass the Resend cutoff through manual retry. Expired sixth-attempt leases become `ambiguous` for administrator reconciliation and are never automatically resent.
- Relative `Retry-After` scheduling is based on provider-response completion time. HTTP-date values retain absolute-date behavior.
- Expired, consumed, deleted, and superseded magic-link jobs are cancelled and cryptographically scrubbed across every unsent state, including `failed` and `ambiguous`. Manual retry and worker claim both validate the underlying token without regenerating or extending it.
- Magic-link issuance uses a transaction-scoped PostgreSQL advisory lock keyed to the normalized email, preserving exactly one current token under concurrent requests.
- An outbox `afterRead` hook removes `encryptedMessage` from normal Payload document results even when Local API callers use `overrideAccess: true`; the worker and narrowly scoped tests use private SQL for ciphertext.
- AES-GCM decryption now requires the fixed 96-bit nonce and 128-bit authentication tag lengths, preventing envelope parameter downgrades.
- Added controlled coverage for uncommitted producer visibility, individually claimed batches, competing and stale workers, sixth-attempt crashes, cutoff-crossing pending/manual jobs, response-time `Retry-After`, token expiry/supersession/invalid manual retry, concurrent token issuance, Local/REST/GraphQL redaction, authenticated-envelope tampering, and contradictory decision/revision races.

## Final re-audit remediation

- The final pre-send decision now runs in a short database transaction and uses PostgreSQL `clock_timestamp()` while locking the claimed row. It atomically validates the active lease token, unexpired lease, provider-timeout reserve, provider-idempotency deadline, non-terminal state, encrypted snapshot, and current token validity. It returns the database-derived deadlines, and a final monotonic deadline check immediately before transport prevents intervening database waits from permitting a late send.
- Provider responses are fully handled before outcome persistence. Every success, failure, and retry update now compares both lease token and lease expiry against current database time; delayed body handling or persistence cannot let a stale worker record or count an outcome.
- Added immutable `requiresMagicLink` metadata. Token-bearing jobs remain identifiable when their relationship is null or the token row is deleted, and maintenance, claim, pre-send, and manual retry all require an existing valid, unconsumed, unexpired, unsuperseded token. Missing or obsolete tokens cancel and scrub the job, and retained consumed-token rows have their jobs cancelled before deletion.
- Replaced timing-based concurrency confidence with controlled barriers and observable PostgreSQL lock waits for producer visibility, pre-send deadline crossing, stale outcomes, advisory-locked magic-link issuance, and contradictory decision/revision transitions. The losing workflow transaction is asserted to leave neither its mutation nor notification; GraphQL redaction first asserts a successful expected response.

## Final migration/outcome remediation

- Provider outcomes now use a short transaction that first locks the exact outbox row. Only after acquiring that row lock does it evaluate the active lease token and expiry against PostgreSQL `clock_timestamp()`, then apply the fenced outcome while retaining the lock. A provider success that waited past lease expiry is rejected and is not counted.
- The token-marker migration now backfills first-schema rows proven token-bearing by a retained `magic_link_id`, the `magic-link` event type, or a registration-confirmation row carrying the link expiry field. Marked unsent rows whose token is missing, consumed, expired, or otherwise invalid are cancelled and scrubbed during upgrade; ordinary notifications remain unmarked and unchanged. Its down migration removes only the marker column and cannot restore deliberately scrubbed secrets.
- The upgrade path is exercised against transaction-local tables matching the first migration, covering valid magic-link mail, linked registration confirmation, ordinary mail, and missing-token magic-link/registration rows. Both the backfill and down-column removal are asserted.
- Remaining concurrency tests now capture the exact PostgreSQL backend PIDs. Pre-send and outcome tests prove their real SQL waits on a known row-lock holder before deadlines are re-evaluated. Magic-link issuance proves the second transaction is blocked by the first advisory-lock owner. Decision and revision transactions are traced through their PostgreSQL blocker chains to the transaction holding the exact submission row.

## Verification

- Earlier audit-remediation verification passed `tests/int/email-outbox.int.spec.ts` (12/12) and the directly affected submission/outbox, registration, peer-review, and revision/camera-ready suites (21/21), for 33/33 tests. After the final re-audit fixes, the affected email-outbox and revision/camera-ready suites passed once together: 2 files and 23/23 tests (`email-outbox` 14, `revision-camera-ready` 9).
- Final migration/outcome remediation verification passed the full affected suites once: `tests/int/email-outbox.int.spec.ts` 15/15 and `tests/int/revision-camera-ready.int.spec.ts` 9/9, for 24/24 tests. The exact contradictory-transition test also passed independently while its barrier was developed.
- The final outcome-lock regression was narrowed further and passed independently (1/1, with 15 skipped): the lock holder leaves the row unchanged, the actual outcome backend is proven blocked by that holder, PostgreSQL time naturally crosses the original valid lease deadline, and the worker then records/counts no success. The outbox file now contains 16 tests.
- Coverage includes rollback/post-commit behavior, transport failures, deduplication, concurrent/stale workers, retry limits and `Retry-After`, ambiguous outcomes, encryption/tampering, magic-link expiry/supersession, REST/GraphQL/admin authorization and privacy, existing workflow behavior, and absence of payment/invitation enqueueing.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` pass. The final build used process-scoped test-only outbox/cron values, generated 39 static pages, and included both internal outbox routes.
- No email was provider-accepted. The shared test bootstrap now always clears inherited `RESEND_API_KEY`; transport tests opt in with a fake key and mock at the HTTP boundary.
- The revised marker migration was validated through the isolated first-schema upgrade harness. It was not reapplied to the shared test schema because that schema already contains the marker column from the earlier guarded additive operation; no destructive reconciliation, fresh migration, or production migration was run.

## Remaining operational risks

- Configure independent production `EMAIL_OUTBOX_ENCRYPTION_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, and `CRON_SECRET`, and schedule the worker endpoint before deployment.
- Ambiguous outcomes older than Resend's 24-hour idempotency window intentionally require provider-side reconciliation and are never blindly resent.
- Key rotation and provider delivery/bounce webhooks are separate follow-up work; `sent` records provider acceptance only.
