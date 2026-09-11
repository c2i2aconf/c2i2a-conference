# Current Ticket — ICAIA Peer Review Workflow

## Status

**IMPLEMENTED AND VERIFIED — awaiting owner review; not committed or pushed**

## Objective

Implement the smallest robust ICAIA workflow slice:

`submission → reviewer assignment → reviewer report → optional third reviewer → editorial decision`

The normal target is two independent reviews. A third reviewer is an explicit editor/admin assignment when the first two completed recommendations differ. The final decision remains an editor/admin action and may be acceptance, conditional revision, or rejection.

## Existing implementation mapped before schema work

| Required capability | Existing implementation | Smallest necessary change |
| --- | --- | --- |
| Reviewer identity/role | `users.role = reviewer`; reviewers can enter Payload admin | Reuse the role; validate assignment targets are reviewers |
| Assigned-submission isolation | Reviewers currently read every submission and private submission file | Scope reviewer reads to assignment-derived submission/file IDs |
| Independent reports | One submission-level `reviewNotes` field | Add one edition/submission/reviewer-scoped assignment record containing one independent report |
| Two reviews + optional third | ICAIA content records the policy, but workflow has no model | Add immutable reviewer slots 1–3; permit slot 3 only after two differing completed recommendations |
| Recommendations | Submission has only pending/accepted/rejected editorial status | Keep recommendations separate from the editorial decision and support accept/revision/reject |
| Disagreement | No workflow state | Derive and store an editor-visible review state without auto-deciding |
| Editorial decision | Reviewers currently update submission status directly | Restrict decisions to admins/editors and add conditional revision |
| Author feedback | `reviewNotes` is hidden in Payload but sent by decision email | Keep internal notes private; add author-safe editorial comments and completed anonymized reports |
| Author portal | Access-respecting submission query shows status only | Query only completed, author-owned reports and serialize an explicit safe DTO |
| API enforcement | Submission hooks protect author creation; review rules do not exist | Enforce assignment/report invariants in collection access and hooks for Local API, REST, and GraphQL |

## Acceptance criteria

- Admins/editors assign reviewer users to immutable edition/submission slots.
- Duplicate reviewer/submission and duplicate submission/slot assignments are rejected with unique database-backed keys.
- Assignments always inherit and validate the submission edition.
- Reviewers see only assigned submissions and their private files.
- Reviewers create/update only their own assigned report fields and cannot self-assign, alter protected submission fields, edit another report, or edit a completed report.
- Two primary reports remain independent; differing completed recommendations expose a third-review recommendation without deciding the paper.
- A third reviewer is never assigned automatically and is supported only after disagreement.
- Editorial status supports pending, conditional revision, acceptance, and rejection and remains admin/editor controlled.
- Authors can read only completed reports for their own submission, with reviewer identity, editor-only comments, assignment metadata, and other users' records removed by Payload field/collection access.
- Decision emails and portal rendering use only author-safe editorial comments and anonymized reports.
- Direct access paths and adversarial cases are covered by integration tests against `conference-tests`.
- Existing security tests and public/archive routes remain healthy.

## Explicitly deferred

- Revision-round document resubmission
- Camera-ready workflow
- Payment processing and payment-proof uploads
- Invitation-letter generation
- Automatic journal submission
- Public submission/registration activation
- Major public-site redesign or conference-content changes

## Safety constraints

- Use only `TEST_DATABASE_URL` / `conference-tests` for DB-backed verification.
- Do not run `migrate:fresh` without explicit permission.
- Do not reset or migrate production.
- Do not commit or push before owner review.

## Implementation result

- Added `reviewer-assignments` as the combined immutable assignment/independent-report record, scoped to edition, submission, reviewer, and reviewer slot.
- Added database-unique reviewer/submission and submission/slot keys, plus hook-level conflict messages and same-edition validation.
- Restricted reviewer submission and private-file reads to assignment-derived IDs.
- Restricted report updates to the assigned reviewer while the record is open and the submission remains undecided; completed reports are immutable to the reviewer.
- Added accept, revision/conditional acceptance, and reject recommendations without scientific scoring criteria.
- Added editor-visible review states: unassigned, in review, ready for decision, third review recommended, and third review in progress.
- Treats any difference between the first two completed categorical recommendations as material disagreement; this changes workflow state but never submission status.
- Allows slot 3 only after two completed, differing primary reports; no third reviewer or final decision is assigned automatically.
- Added `revision-required` as an editorial submission outcome and moved all final-decision writes from reviewers to admins/editors.
- Reclassified legacy `reviewNotes` as editor-only and added separate author-facing decision comments.
- Releases completed anonymized reports to the owning author only after an editorial outcome; the author portal renders a deliberately narrow safe DTO.
- Decision emails include only author-safe editorial comments and anonymized reports.
- Enabled Payload versions for assignment/report audit history and verified version endpoints preserve the same anonymity rules.

## Verification result

- Generated types: pass.
- Migration generated and reviewed: `20260910_171823_peer_review_workflow` (`.ts` + `.json`, registered in the migration index).
- Applied only that additive migration to the guarded `TEST_DATABASE_URL`; no reset or `migrate:fresh` was used.
- Targeted peer-review integration suite: 1 file / 8 tests passed, including Local API, REST, GraphQL, version-history, and email serialization checks.
- Full integration suite: 7 files / 39 tests passed.
- Lint: pass with zero warnings.
- TypeScript: pass.
- Production build against the guarded test database: pass, 39 static pages generated.
- Required public/archive routes: all six returned HTTP 200 (`/fr`, `/en`, and FR/EN archives for 2024 and 2025).
- `git diff --check`: pass.

## Remaining risks / follow-up

- Decision email delivery still has the pre-existing lack of a durable outbox/retry mechanism.
- “Material disagreement” currently means any difference among accept/revision/reject; organizers may later choose a narrower policy.
- Revision-round resubmission remains intentionally deferred, so `revision-required` is currently a decision/reporting state only.
- Payload reported a historical dev-schema marker in `conference-tests`; the reviewed migration was additive and applied successfully without reset or data deletion.
