import { APIError, type PayloadRequest } from 'payload'

import type { ReviewRecommendation } from '@/lib/workflow-policy'
import { reviewsMateriallyDisagree } from '@/lib/workflow-policy'
import { relationshipID } from '@/lib/workflow-boundary'
import {
  getLatestSubmittedRevisionRound,
  isInternalRevisionTransition,
  REVISION_TRANSITION_CONTEXT,
} from '@/lib/revision-workflow'

export type SubmissionReviewState =
  | 'unassigned'
  | 'in-review'
  | 'ready-for-decision'
  | 'third-review-recommended'
  | 'third-review-in-progress'

export async function recomputeSubmissionReviewState(req: PayloadRequest, submissionID: number) {
  const revisionRound = await getLatestSubmittedRevisionRound(req, submissionID)
  const assignments = await req.payload.find({
    collection: 'reviewer-assignments',
    depth: 0,
    overrideAccess: true,
    pagination: false,
    req,
    sort: 'reviewerNumber',
    where: {
      and: [
        { submission: { equals: submissionID } },
        revisionRound
          ? { revisionRound: { equals: revisionRound.id } }
          : { revisionRound: { exists: false } },
      ],
    },
  })

  const primary = assignments.docs.filter(
    (assignment) => assignment.reviewerNumber === '1' || assignment.reviewerNumber === '2',
  )
  const completedPrimary = primary.filter((assignment) => assignment.status === 'completed')
  const third = assignments.docs.find((assignment) => assignment.reviewerNumber === '3')

  let reviewState: SubmissionReviewState = assignments.docs.length ? 'in-review' : 'unassigned'
  if (completedPrimary.length === 2) {
    const disagree = reviewsMateriallyDisagree(
      completedPrimary.map((assignment) => assignment.recommendation as ReviewRecommendation),
    )
    if (!disagree || third?.status === 'completed') reviewState = 'ready-for-decision'
    else if (third) reviewState = 'third-review-in-progress'
    else reviewState = 'third-review-recommended'
  }

  await req.payload.update({
    collection: 'submissions',
    id: submissionID,
    data: { reviewState },
    context: { [REVISION_TRANSITION_CONTEXT]: true },
    overrideAccess: true,
    req,
  })

  return reviewState
}

export async function validateReviewAssignment({
  data,
  operation,
  originalDoc,
  req,
}: {
  data: Record<string, unknown> | undefined
  operation: 'create' | 'update'
  originalDoc?: Record<string, unknown>
  req: PayloadRequest
}) {
  if (!data) return data

  const submissionID = relationshipID(
    operation === 'create' ? data.submission : originalDoc?.submission,
  )
  const reviewerID = relationshipID(operation === 'create' ? data.reviewer : originalDoc?.reviewer)
  if (submissionID === null || reviewerID === null) {
    throw new APIError('A valid submission and reviewer are required.', 400, undefined, true)
  }

  const submission = await req.payload.findByID({
    collection: 'submissions',
    id: submissionID,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (operation === 'create' && submission.status !== 'pending') {
    throw new APIError(
      'Reviewers can be assigned only while editorial review is pending.',
      409,
      undefined,
      true,
    )
  }

  if (operation === 'create') {
    const reviewer = await req.payload.findByID({
      collection: 'users',
      id: reviewerID,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (reviewer.role !== 'reviewer') {
      throw new APIError('Assignments require a reviewer account.', 400, undefined, true)
    }

    const editionID = relationshipID(submission.edition)
    if (editionID === null) {
      throw new APIError('The submission must belong to an edition.', 400, undefined, true)
    }
    const requestedEditionID = relationshipID(data.edition)
    if (requestedEditionID !== null && requestedEditionID !== editionID) {
      throw new APIError(
        'The assignment edition must match the submission edition.',
        400,
        undefined,
        true,
      )
    }

    const latestRevisionRound = await getLatestSubmittedRevisionRound(req, submissionID)
    const requestedRevisionRoundID = relationshipID(data.revisionRound)
    if (latestRevisionRound) {
      if (requestedRevisionRoundID !== latestRevisionRound.id) {
        throw new APIError(
          'A follow-up assignment must explicitly reference the current submitted revision round.',
          400,
          undefined,
          true,
        )
      }
      if (
        relationshipID(latestRevisionRound.submission) !== submissionID ||
        relationshipID(latestRevisionRound.edition) !== editionID
      ) {
        throw new APIError(
          'The revision round must match the assignment submission and edition.',
          400,
          undefined,
          true,
        )
      }
    } else if (requestedRevisionRoundID !== null) {
      throw new APIError(
        'This submission has no submitted revision round to review.',
        400,
        undefined,
        true,
      )
    }

    const reviewerNumber = data.reviewerNumber
    if (reviewerNumber !== '1' && reviewerNumber !== '2' && reviewerNumber !== '3') {
      throw new APIError('Reviewer slot must be 1, 2, or 3.', 400, undefined, true)
    }

    const reviewScope = latestRevisionRound ? `revision-${latestRevisionRound.id}` : 'original'
    const duplicates = await req.payload.find({
      collection: 'reviewer-assignments',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
      where: {
        or: [
          { assignmentKey: { equals: `${submissionID}:${reviewScope}:${reviewerID}` } },
          { slotKey: { equals: `${submissionID}:${reviewScope}:${reviewerNumber}` } },
        ],
      },
    })
    if (duplicates.totalDocs > 0) {
      throw new APIError(
        'That reviewer or reviewer slot is already assigned to this submission.',
        409,
        undefined,
        true,
      )
    }

    if (reviewerNumber === '3') {
      const primaryReviews = await req.payload.find({
        collection: 'reviewer-assignments',
        depth: 0,
        overrideAccess: true,
        pagination: false,
        req,
        sort: 'reviewerNumber',
        where: {
          and: [
            { submission: { equals: submissionID } },
            latestRevisionRound
              ? { revisionRound: { equals: latestRevisionRound.id } }
              : { revisionRound: { exists: false } },
            { reviewerNumber: { in: ['1', '2'] } },
            { status: { equals: 'completed' } },
          ],
        },
      })
      const recommendations = primaryReviews.docs.map(
        (assignment) => assignment.recommendation as ReviewRecommendation,
      )
      if (primaryReviews.totalDocs !== 2 || !reviewsMateriallyDisagree(recommendations)) {
        throw new APIError(
          'A third reviewer requires two completed, differing primary reviews.',
          409,
          undefined,
          true,
        )
      }
    }

    return {
      ...data,
      assignedAt: new Date().toISOString(),
      assignmentKey: `${submissionID}:${reviewScope}:${reviewerID}`,
      authorComments: undefined,
      edition: editionID,
      editorComments: undefined,
      recommendation: undefined,
      releasedToAuthorAt: undefined,
      revisionRound: latestRevisionRound?.id,
      slotKey: `${submissionID}:${reviewScope}:${reviewerNumber}`,
      status: 'assigned',
      submittedAt: undefined,
    }
  }

  if (req.user?.role === 'reviewer') {
    if (submission.status !== 'pending') {
      throw new APIError('This review is closed after an editorial decision.', 409, undefined, true)
    }
    if (originalDoc?.status === 'completed') {
      throw new APIError(
        'A completed review cannot be edited by its reviewer.',
        409,
        undefined,
        true,
      )
    }
  }

  const status = data.status ?? originalDoc?.status
  const recommendation = data.recommendation ?? originalDoc?.recommendation
  const authorCommentsValue = data.authorComments ?? originalDoc?.authorComments
  const authorComments =
    typeof authorCommentsValue === 'string' ? authorCommentsValue.trim() : authorCommentsValue
  if (status === 'completed' && (!recommendation || !authorComments)) {
    throw new APIError(
      'A recommendation and anonymized author-facing report are required to complete a review.',
      400,
      undefined,
      true,
    )
  }

  return {
    ...data,
    assignedAt: originalDoc?.assignedAt,
    assignmentKey: originalDoc?.assignmentKey,
    authorComments,
    edition: originalDoc?.edition,
    reviewer: originalDoc?.reviewer,
    reviewerNumber: originalDoc?.reviewerNumber,
    releasedToAuthorAt: isInternalRevisionTransition(req)
      ? (data.releasedToAuthorAt ?? originalDoc?.releasedToAuthorAt)
      : originalDoc?.releasedToAuthorAt,
    revisionRound: originalDoc?.revisionRound,
    slotKey: originalDoc?.slotKey,
    submission: originalDoc?.submission,
    submittedAt:
      status === 'completed'
        ? originalDoc?.submittedAt || new Date().toISOString()
        : originalDoc?.submittedAt,
  }
}
