# Current Ticket — Registration Payment Proof and Invitation Letters

## Status

IMPLEMENTED AND VERIFIED — awaiting owner review; not committed or pushed.

## Scope and constraints

Extend merged registration, peer-review and revision/camera-ready architecture with participant registration, CMS fee selection, private proof review, and explicit organizer invitation issuance. A paper is not required for every participant. Keep 2027 registration disabled and all conference facts unchanged. Apply migrations only to guarded TEST_DATABASE_URL / conference-tests. No production migrations, resets, commits or pushes.

## Capability mapping

| Capability | Existing architecture | Smallest safe extension |
| --- | --- | --- |
| Registration | Email-first free records, magic-link linking, confirmed/cancelled state | Preserve legacy free editions; authenticated ownership for configured fee editions |
| Opening | Organizer-controlled edition.registrationEnabled | Reuse gate without opening 2027 |
| Fees | Edition-unique conference-details.registrationFees | Freeze selected code, label, amount, offered currency, source details and exemption flag |
| Duplicates | Email/edition hook check | Database-unique active person/edition and normalized email/edition keys |
| Proofs | SubmissionFiles validation and private Blob adapter | Separate immutable sequential uploads; owner/organizer access with no reviewer inheritance |
| Payment state | None | not-submitted → submitted → verified/rejected; replacement only after rejection |
| Exemptions | CMS fee.exempt | No amount/currency or fake payment; explicit independent organizer approval |
| Invitations | No renderer or issuance model | Versioned organizer-authored draft/issued text record with recipient and eligibility audit |
| Portal | Registrations plus merged author workflows | Fee form when opened, proof history/upload/review comments, issued invitation text |
| API boundaries | Payload access and hooks | Owner-only uploads, admin/editor review/issuance, transaction locks and terminal-state checks |

## Implemented rules

- Fee workflows activate from configured fee categories or paymentRequired, not a hardcoded year. Legacy free/email-first flows and magic-link linking remain compatible.
- Fee registration identity, owner, edition and snapshot are immutable. CMS fee edits cannot rewrite historical obligations. No amount-paid field exists.
- Exempt category selection is a claim until an independent admin/editor approves it. Amount/currency stay null; fake proof uploads are denied.
- Proof files get random server filenames and private storage prefixes. Submitted/verified files cannot be replaced; rejected files remain in history. Verification/rejection is final per proof, timestamped and attributed. Rejection requires a participant-safe comment.
- Registration-row transaction locks serialize proof creation/review, cancellation and invitation issuance. Terminal proof/letter states are reread after locking. Disabling transactions fails closed.
- Issuance requires explicit independent admin/editor action, confirmed scoped fee registration, invitation availability in edition details, and verified payment or approved exemption. Acceptance alone and unconfigured legacy obligations never silently qualify.
- Letter records store organizer-written text, recipient name/email snapshot, registration/user/edition, status, issuer/time, eligibility basis and verified-proof reference. Internal notes and drafts stay private to organizers. Issued records are immutable; normal API deletion is disabled. Cancellation after issuance is blocked pending a future revocation workflow.
- No official wording, signatures, seals, names, logos, banking details, payment methods, deadlines, tax/passport fields or legal statements were invented.

## File policy

No verified payment-proof format rule exists. Added optional conference-details.paymentProofFormats (PDF/JPEG/PNG), with no default. Existing 2027 uploads remain unavailable until organizers configure it. The 4 MB maximum reuses the application's technical ceiling; it is not asserted as a conference rule. MIME/signature and actual-byte-size checks run in Payload; image processing also parses the image. Private downloads reuse the existing access-controlled Blob adapter.

## Schema and migration

- Registrations: nullable fee/source snapshot, exemption approval audit, active identity uniqueness keys, version history.
- New payment-proofs and invitation-letters collections with versions.
- ConferenceDetails: optional accepted proof formats.
- Migration: 20260912_115433_registration_payment_invitations (.ts, .json and index).
- Reviewed additive up migration, fixed generated down foreign-key order and backfilled legacy active identity keys without inventing fees. Existing duplicates deliberately block unique indexes for organizer reconciliation, never deletion.
- Applied only to guarded TEST_DATABASE_URL with PAYLOAD_TEST_ENV=true and schema push disabled. No reset or production migration.

## Verification

- All 18 payment/invitation tests passed in full runs, including REST/GraphQL/Local API attacks, PNG/JPEG policy, alternate currency and concurrency.
- Final full integration run passed: 9 files / 66 tests, exit 0, in 1152.99 seconds on 2026-09-13. Earlier import timeouts were resolved by calibrating their allowances against successful isolated retries (2025: 84 seconds; 2027: 161 seconds).
- The double-import tests use 180 seconds for 2025 and 360 seconds for 2027 to accommodate observed runtime variability; no assertions were weakened.
- Temporary import timing instrumentation and verification scripts were removed after verification.
- Payload types, lint, TypeScript, production build (39 static pages) and git diff --check passed.
- HTTP 200 and heading/content checks passed for /fr, /en, /fr/archive/2024, /en/archive/2024, /fr/archive/2025 and /en/archive/2025. Anonymous /en/account redirects to sign-in.
- A read-only test-database check confirmed 2027 registration and submission gates remain disabled.

## Deferred and remaining risks

- PDF rendering, official templates and downloadable PDF artifacts. Issued text is durable and shown in the account portal; no unaudited page-load generation.
- Payments/gateways, bank reconciliation, invoices/tax receipts, journal submission, reviewer changes, redesign and durable email outbox.
- No new emails; existing email infrastructure unchanged.
- Organizers must configure proof formats before uploads are usable. 2027 registration remains closed.
- Post-issuance revocation/amendment and post-verification corrections need explicit future workflows.
- Trusted server code can deliberately override Payload read access. Portal operations always use overrideAccess:false; mutation hooks additionally reject unauthenticated/unauthorized financial and issuance writes even with Local API overrideAccess:true.
- Existing active duplicates on a deployment database require reconciliation before unique indexes apply.
- Owner review required before commit or push.

## Files changed

- .gitignore
- context/current-ticket.md
- context/progress-tracker.md
- messages/en.json
- messages/fr.json
- src/access/index.ts
- src/app/(frontend)/[locale]/account/page.tsx
- src/app/(frontend)/[locale]/registration/page.tsx
- src/collections/ConferenceDetails.ts
- src/collections/InvitationLetters.ts
- src/collections/PaymentProofs.ts
- src/collections/Registrations.ts
- src/components/sections/PaymentProofForm.tsx
- src/components/sections/RegistrationForm.tsx
- src/lib/actions/payment-proof.ts
- src/lib/actions/register.ts
- src/lib/private-vercel-blob.ts
- src/lib/registration-workflow.ts
- src/migrations/20260912_115433_registration_payment_invitations.json
- src/migrations/20260912_115433_registration_payment_invitations.ts
- src/migrations/index.ts
- src/payload-types.ts
- src/payload.config.ts
- tests/int/historical-archive-import.int.spec.ts
- tests/int/payment-invitations.int.spec.ts
- tests/int/workflow.int.spec.ts
