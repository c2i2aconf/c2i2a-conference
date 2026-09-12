import { APIError, type PayloadRequest } from 'payload'

import { relationshipID } from '@/lib/workflow-boundary'

export const REVISION_TRANSITION_CONTEXT = 'revisionTransition'

export function isInternalRevisionTransition(req: PayloadRequest) {
  return req.context?.[REVISION_TRANSITION_CONTEXT] === true
}

export async function getLatestSubmittedRevisionRound(req: PayloadRequest, submissionID: number) {
  const result = await req.payload.find({
    collection: 'revision-rounds',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    sort: '-roundNumber',
    where: {
      and: [{ submission: { equals: submissionID } }, { status: { equals: 'submitted' } }],
    },
  })
  return result.docs[0] ?? null
}

export async function releaseCompletedReviews(req: PayloadRequest, submissionID: number) {
  await req.payload.update({
    collection: 'reviewer-assignments',
    data: { releasedToAuthorAt: new Date().toISOString() },
    context: { [REVISION_TRANSITION_CONTEXT]: true },
    overrideAccess: true,
    req,
    where: {
      and: [
        { submission: { equals: submissionID } },
        { status: { equals: 'completed' } },
        { releasedToAuthorAt: { exists: false } },
      ],
    },
  })
}

export async function validateRevisionRound({
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

  if (operation === 'update') {
    if (!isInternalRevisionTransition(req)) {
      throw new APIError(
        'Revision-round workflow fields are server-managed after the request is created.',
        403,
        undefined,
        true,
      )
    }
    return {
      ...data,
      deadline: originalDoc?.deadline,
      edition: originalDoc?.edition,
      instructions: originalDoc?.instructions,
      requestedAt: originalDoc?.requestedAt,
      requestedBy: originalDoc?.requestedBy,
      roundKey: originalDoc?.roundKey,
      roundNumber: originalDoc?.roundNumber,
      submission: originalDoc?.submission,
    }
  }

  const submissionID = relationshipID(data.submission)
  if (submissionID === null) {
    throw new APIError('A valid submission is required.', 400, undefined, true)
  }
  if (req.user?.role !== 'admin' && req.user?.role !== 'editor') {
    throw new APIError('Only editorial staff may request a revision.', 403, undefined, true)
  }

  const submission = await req.payload.findByID({
    collection: 'submissions',
    id: submissionID,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (submission.status !== 'pending' || submission.reviewState !== 'ready-for-decision') {
    throw new APIError(
      'A revision may be requested only after the current review round is ready for decision.',
      409,
      undefined,
      true,
    )
  }

  const instructions = typeof data.instructions === 'string' ? data.instructions.trim() : ''
  if (!instructions) {
    throw new APIError('Author-facing revision instructions are required.', 400, undefined, true)
  }

  let deadline: string | undefined
  if (data.deadline) {
    const timestamp = new Date(String(data.deadline)).getTime()
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
      throw new APIError('The revision deadline must be a valid future date.', 400, undefined, true)
    }
    deadline = new Date(timestamp).toISOString()
  }

  const editionID = relationshipID(submission.edition)
  const requestedEditionID = relationshipID(data.edition)
  if (editionID === null || (requestedEditionID !== null && requestedEditionID !== editionID)) {
    throw new APIError(
      'The revision round edition must match the submission edition.',
      400,
      undefined,
      true,
    )
  }

  const existing = await req.payload.find({
    collection: 'revision-rounds',
    depth: 0,
    overrideAccess: true,
    pagination: false,
    req,
    sort: '-roundNumber',
    where: { submission: { equals: submissionID } },
  })
  if (existing.docs.some((round) => round.status === 'open')) {
    throw new APIError('This submission already has an open revision round.', 409, undefined, true)
  }
  const roundNumber = (existing.docs[0]?.roundNumber ?? 0) + 1

  return {
    ...data,
    deadline,
    edition: editionID,
    instructions,
    requestedAt: new Date().toISOString(),
    requestedBy: req.user.id,
    resubmittedAt: undefined,
    revisedManuscript: undefined,
    roundKey: `${submissionID}:${roundNumber}`,
    roundNumber,
    status: 'open',
    submission: submissionID,
  }
}

export async function submitRevisionRound(req: PayloadRequest, roundID: number, fileID: number) {
  const round = await req.payload.findByID({
    collection: 'revision-rounds',
    id: roundID,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const submissionID = relationshipID(round.submission)
  if (submissionID === null) {
    throw new APIError('The revision round has no valid submission.', 409, undefined, true)
  }
  const resubmittedAt = new Date().toISOString()
  await req.payload.update({
    collection: 'revision-rounds',
    id: roundID,
    data: { revisedManuscript: fileID, resubmittedAt, status: 'submitted' },
    context: { [REVISION_TRANSITION_CONTEXT]: true },
    overrideAccess: true,
    req,
  })
  await req.payload.update({
    collection: 'submissions',
    id: submissionID,
    data: { reviewState: 'ready-for-decision', status: 'pending' },
    context: { [REVISION_TRANSITION_CONTEXT]: true },
    overrideAccess: true,
    req,
  })
}

export async function closeOpenRevisionRounds(req: PayloadRequest, submissionID: number) {
  const open = await req.payload.find({
    collection: 'revision-rounds',
    depth: 0,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [{ submission: { equals: submissionID } }, { status: { equals: 'open' } }],
    },
  })
  for (const round of open.docs) {
    await req.payload.update({
      collection: 'revision-rounds',
      id: round.id,
      data: { status: 'closed' },
      context: { [REVISION_TRANSITION_CONTEXT]: true },
      overrideAccess: true,
      req,
    })
  }
}
