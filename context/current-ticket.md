# Current Ticket — Author Revision Rounds and Camera-Ready Resubmission

## Status

**IMPLEMENTED AND VERIFIED — awaiting owner review; not committed or pushed**

## Objective

Extend the merged peer-review workflow with the smallest robust continuation:

`review → revision requested → author resubmission → editorial/reviewer follow-up → final acceptance → camera-ready upload`

Historical manuscripts and completed reviewer reports must remain immutable/auditable. Public 2027 submission and registration gates remain disabled.

## Existing implementation mapped before schema work

| Required capability        | Existing implementation                                                            | Smallest necessary change                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Editorial revision outcome | `submissions.status = revision-required` is editor/admin-controlled                | Make revision requests explicit records and prohibit ambiguous direct state changes       |
| Historical review evidence | Immutable completed `reviewer-assignments` with versions                           | Preserve records and release state; scope follow-up assignments to a revision round       |
| Private manuscripts        | Owner-scoped, assignment-scoped `submission-files`, PDF signature/MIME/4 MB checks | Classify original/revision/camera-ready files and validate stage-specific ownership/state |
| Original manuscript        | Immutable `submissions.file` relation                                              | Keep it unchanged; every revision/final upload creates another file record                |
| Author portal              | Safe submissions and anonymized completed reports                                  | Add revision status/instructions/deadline and narrowly scoped upload controls             |
| Camera-ready               | Not modeled                                                                        | Add accepted-only final-file pointer/timestamp without changing prior manuscripts         |
| API invariants             | Collection access and hooks protect submissions/reviews                            | Extend hooks/access so Local API, REST, and GraphQL cannot bypass transitions             |

## Acceptance criteria

- Admin/editor can create an explicit revision round only after peer review is ready for an editorial decision.
- Only the owning author can upload one revision artifact while that round is open and before its optional deadline.
- Original and earlier revised files remain preserved; repeated upload cannot overwrite a historical artifact.
- Revision rounds record submission, edition, round number, requester, request date, optional deadline, author instructions, status, revised manuscript, and resubmission date.
- Resubmission returns the submission to editorial/reviewer follow-up without mutating earlier reports.
- Follow-up reviewer assignments explicitly reference the reviewed revision round; reviewers receive only files for their exact assignments.
- Final decisions remain editor/admin-only and invalid/terminal transitions are rejected at the Payload boundary.
- Camera-ready upload is available only to the owner of a finally accepted submission; other authors and reviewers cannot create/read/modify it.
- Editor/admin can inspect camera-ready files while original and revision manuscripts remain preserved.
- Author-facing portal state clearly communicates decision, released feedback, revision requirements/deadline/submission, final acceptance, and camera-ready availability/submission.
- Integration tests cover owner isolation, deadlines, history preservation, role denials, cross-edition/submission relations, report immutability, and direct Local API/REST/GraphQL paths.

## Explicitly deferred

- Payment processing and proof uploads
- Invitation letters
- Journal submission
- Automatic reviewer assignment
- Durable email retry/outbox
- Major public-site redesign
- Public activation of 2027 submissions or registration

## Safety constraints

- Use only guarded `TEST_DATABASE_URL` / `conference-tests` for DB-backed verification or migration application.
- Do not run `migrate:fresh` or delete test data without explicit permission.
- Never migrate or reset production.
- Do not commit or push before owner review.

## Implementation result

- Added explicit, edition/submission-scoped `revision-rounds` with server-managed round number, requester/request date, optional deadline, author-facing instructions, open/submitted/closed state, revised manuscript, resubmission date, unique round key, and Payload version history.
- Kept `submissions.file` as the immutable original anonymized review manuscript. Added only an accepted-stage camera-ready file pointer and submitted timestamp to `submissions`.
- Classified private `submission-files` as `original-review`, `revision`, or `camera-ready`. Revision/camera-ready records carry their submission and optional revision-round scope plus a unique stage key, so repeated/concurrent uploads cannot replace prior history.
- Kept PDF MIME/signature and 4 MB server-side validation for every stage. Camera-ready is intentionally a separately classified stage even though its current format/limit matches review manuscripts.
- Made normal submission-file updates/deletes unavailable through Payload APIs. Completed reviewer assignments also cannot be deleted through normal APIs.
- Added an explicit `revisionRound` relation to reviewer assignments. Follow-up uniqueness keys and review-state computation are round-scoped; original assignments were migrated to the explicit `original` scope.
- Persisted `releasedToAuthorAt` on completed reports when an editorial revision/final decision releases them. Earlier reports remain visible after resubmission without exposing draft/unreleased reports; legacy decided submissions are backfilled by the migration.
- Restricted reviewers to the exact original or revised manuscript associated with their assignment and hid author relationships from reviewer-visible submission/file records.
- Enforced state transitions at collection hooks: direct `revision-required` writes are rejected; creating a revision round performs the editorial transition; owner resubmission moves it back to pending/ready-for-editorial-follow-up; accepted/rejected are terminal; rejection can close an unsubmitted revision round.
- Added accepted-owner-only camera-ready upload. Pending, revision-required, rejected, unrelated-author, reviewer, editor, and anonymous upload paths are denied by collection access/hooks.
- Added narrow FR/EN account UI for revision instructions, deadline, state, historical reports, revision upload, final acceptance, and camera-ready upload/submission state.
- Added a best-effort bilingual revision-request email with deadline, instructions, released anonymized reports, and canonical account URL. Durable delivery/retry remains deferred.

## Verification result

- Payload types regenerated successfully.
- Migration generated/reviewed: `20260911_141111_revision_camera_ready_workflow` (`.ts` + `.json`, registered in the migration index).
- Migration `up` is additive and includes safe legacy assignment-key/report-release backfills. It was applied only to guarded `TEST_DATABASE_URL` / `conference-tests`; no reset or `migrate:fresh` was used.
- New revision/camera-ready integration suite: 1 file / 8 tests passed.
- Existing peer-review integration suite: 1 file / 8 tests passed.
- Full integration suite: 8 files / 48 tests passed.
- Lint: pass with zero warnings.
- TypeScript: pass.
- Production build against guarded test data: pass; 39 static pages generated.
- Required route regressions: HTTP 200 for `/fr`, `/en`, `/fr/archive/2024`, `/en/archive/2024`, `/fr/archive/2025`, and `/en/archive/2025`.
- Public 2027 submission/registration gates and historical/current conference content were not changed.

## Remaining risks / follow-up

- Email delivery remains best-effort with no durable outbox/retry, as explicitly deferred.
- Camera-ready currently uses the same PDF signature/MIME/4 MB requirements as review manuscripts; future organizer-approved final-format differences can be added to the explicit file kind without conflating stages.
- Revision instructions/deadlines are immutable after the request is created to preserve evidence; a future correction/amendment record could be added if organizers require post-request edits.
- The test database retains Payload's historical dev-schema marker; the reviewed additive migration was applied after the CLI warning without resetting or deleting test data.
- Owner review is required before any commit or push.
