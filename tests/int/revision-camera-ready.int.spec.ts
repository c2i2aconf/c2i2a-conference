import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { POST as graphqlPost } from '@/app/(payload)/api/graphql/route'
import { POST as restPost } from '@/app/(payload)/api/[...slug]/route'
import config from '@/payload.config'
import type {
  ReviewerAssignment,
  RevisionRound,
  Submission,
  SubmissionFile,
  User,
} from '@/payload-types'

import { createMinimalPDFBuffer, createPublishedLiveEdition } from '../helpers/securityFixtures'

let payload: Payload
let admin: User
let editor: User
let authorA: User
let authorB: User
let reviewerA: User
let reviewerB: User
let reviewerC: User
let editionA: number
let editionB: number
let submissionA: Submission
let submissionB: Submission
let originalA: SubmissionFile
let revisionRoundA: RevisionRound
let revisionFileA: SubmissionFile
let originalReviewA: ReviewerAssignment
let originalSendEmail: Payload['sendEmail']

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const created = {
  assignments: [] as number[],
  editions: [] as number[],
  files: [] as number[],
  revisionRounds: [] as number[],
  submissions: [] as number[],
  users: [] as number[],
}

function api(path: string, init?: RequestInit) {
  return new Request(`http://localhost/api/${path}`, init)
}

async function createUser(role: User['role']) {
  const user = await payload.create({
    collection: 'users',
    data: {
      email: `${role}-${suffix}-${created.users.length}@example.com`,
      password: 'revision-workflow-test-password',
      role,
    },
    overrideAccess: true,
  })
  created.users.push(user.id)
  return user
}

async function upload(
  author: User,
  data: {
    kind: 'original-review' | 'revision' | 'camera-ready'
    revisionRound?: number
    submission?: number
  },
) {
  const pdf = createMinimalPDFBuffer()
  const file = await payload.create({
    collection: 'submission-files',
    data: { author: author.id, ...data },
    file: {
      data: pdf,
      mimetype: 'application/pdf',
      name: `${data.kind}-${suffix}-${created.files.length}.pdf`,
      size: pdf.length,
    },
    overrideAccess: data.kind === 'original-review',
    user: author,
  })
  created.files.push(file.id)
  return file
}

async function createSubmission(author: User, edition: number, label: string) {
  const original = await upload(author, { kind: 'original-review' })
  const submission = await payload.create({
    collection: 'submissions',
    data: {
      abstract: `Abstract ${label}`,
      author: author.id,
      edition,
      file: original.id,
      locale: 'en',
      reviewState: 'unassigned',
      status: 'pending',
      title: `Revision workflow paper ${label}`,
    },
    overrideAccess: true,
  })
  created.submissions.push(submission.id)
  return { original, submission }
}

async function completePrimaryReview(
  submission: Submission,
  reviewer: User,
  reviewerNumber: '1' | '2',
  recommendation: 'accept' | 'revision' = 'revision',
) {
  let assignment = await payload.create({
    collection: 'reviewer-assignments',
    depth: 0,
    data: {
      assignedAt: new Date().toISOString(),
      assignmentKey: 'server-managed',
      edition: typeof submission.edition === 'number' ? submission.edition : submission.edition.id,
      reviewer: reviewer.id,
      reviewerNumber,
      slotKey: 'server-managed',
      status: 'assigned',
      submission: submission.id,
    },
    overrideAccess: false,
    user: editor,
  })
  created.assignments.push(assignment.id)
  assignment = await payload.update({
    collection: 'reviewer-assignments',
    id: assignment.id,
    data: {
      authorComments: `Preserved report ${reviewerNumber} for ${submission.id}`,
      recommendation,
      status: 'completed',
    },
    overrideAccess: false,
    user: reviewer,
  })
  return assignment
}

async function prepareForDecision(submission: Submission) {
  const first = await completePrimaryReview(submission, reviewerA, '1')
  await completePrimaryReview(submission, reviewerB, '2')
  return first
}

async function requestRevision(
  submission: Submission,
  deadline = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
  actingUser = editor,
) {
  const round = await payload.create({
    collection: 'revision-rounds',
    depth: 0,
    data: {
      deadline,
      edition: typeof submission.edition === 'number' ? submission.edition : submission.edition.id,
      instructions: `Please revise submission ${submission.id}.`,
      requestedAt: new Date().toISOString(),
      requestedBy: actingUser.id,
      roundKey: 'server-managed',
      roundNumber: 99,
      status: 'open',
      submission: submission.id,
    },
    overrideAccess: false,
    user: actingUser,
  })
  created.revisionRounds.push(round.id)
  return round
}

describe('author revision rounds and camera-ready workflow', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    originalSendEmail = payload.sendEmail
    payload.sendEmail = (async () => undefined) as typeof payload.sendEmail
    admin = await createUser('admin')
    editor = await createUser('editor')
    authorA = await createUser('author')
    authorB = await createUser('author')
    reviewerA = await createUser('reviewer')
    reviewerB = await createUser('reviewer')
    reviewerC = await createUser('reviewer')
    const firstEdition = await createPublishedLiveEdition(payload, {
      title: `Revision edition A ${suffix}`,
      year: 900000 + Math.floor(Math.random() * 10000),
    })
    const secondEdition = await createPublishedLiveEdition(payload, {
      title: `Revision edition B ${suffix}`,
      year: 910000 + Math.floor(Math.random() * 10000),
    })
    editionA = firstEdition.id
    editionB = secondEdition.id
    created.editions.push(editionA, editionB)
    const first = await createSubmission(authorA, editionA, 'A')
    originalA = first.original
    submissionA = first.submission
    submissionB = (await createSubmission(authorB, editionB, 'B')).submission
    originalReviewA = await prepareForDecision(submissionA)
  })

  it('allows an editor to request a revision and exposes it only to the owning author', async () => {
    revisionRoundA = await requestRevision(submissionA)
    expect(revisionRoundA).toMatchObject({
      edition: editionA,
      roundNumber: 1,
      status: 'open',
      submission: submissionA.id,
    })
    expect(revisionRoundA.requestedBy).toBe(editor.id)
    expect(
      await payload.findByID({
        collection: 'submissions',
        id: submissionA.id,
        depth: 0,
        overrideAccess: true,
      }),
    ).toMatchObject({ status: 'revision-required' })

    const own = await payload.find({
      collection: 'revision-rounds',
      overrideAccess: false,
      user: authorA,
      where: { id: { equals: revisionRoundA.id } },
    })
    expect(own.docs).toHaveLength(1)
    expect(own.docs[0]).not.toHaveProperty('requestedBy')
    const unrelated = await payload.find({
      collection: 'revision-rounds',
      overrideAccess: false,
      user: authorB,
      where: { id: { equals: revisionRoundA.id } },
    })
    expect(unrelated.docs).toHaveLength(0)
  })

  it('rejects reviewer requests, author self-acceptance, and direct API bypasses', async () => {
    await expect(
      payload.create({
        collection: 'revision-rounds',
        data: {
          edition: editionB,
          instructions: 'Reviewer self-request.',
          requestedAt: new Date().toISOString(),
          requestedBy: reviewerC.id,
          roundKey: 'invalid',
          roundNumber: 1,
          status: 'open',
          submission: submissionB.id,
        },
        overrideAccess: false,
        user: reviewerC,
      }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'submissions',
        id: submissionB.id,
        data: { status: 'accepted' },
        overrideAccess: false,
        user: authorB,
      }),
    ).rejects.toThrow()

    const authorLogin = await payload.login({
      collection: 'users',
      data: { email: authorB.email, password: 'revision-workflow-test-password' },
    })
    const rest = await restPost(
      api('revision-rounds', {
        method: 'POST',
        headers: {
          Authorization: `JWT ${authorLogin.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          edition: editionB,
          instructions: 'Direct REST self-request.',
          submission: submissionB.id,
        }),
      }),
      { params: Promise.resolve({ slug: ['revision-rounds'] }) },
    )
    expect(rest.status).toBe(403)

    const graphql = await graphqlPost(
      api('graphql', {
        method: 'POST',
        headers: {
          Authorization: `JWT ${authorLogin.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation { updateSubmission(id: ${submissionB.id}, data: { status: accepted }) { id status } }`,
        }),
      }),
    )
    const body = await graphql.json()
    expect(body.data?.updateSubmission ?? null).toBeNull()
    expect(body.errors).toBeDefined()
  })

  it('creates a new revision artifact without replacing the original or prior reports', async () => {
    const originalFileID =
      typeof submissionA.file === 'number' ? submissionA.file : submissionA.file.id
    const originalReport = await payload.findByID({
      collection: 'reviewer-assignments',
      id: originalReviewA.id,
      overrideAccess: true,
    })
    revisionFileA = await upload(authorA, {
      kind: 'revision',
      revisionRound: revisionRoundA.id,
      submission: submissionA.id,
    })
    expect(revisionFileA.id).not.toBe(originalFileID)
    expect(
      await payload.findByID({
        collection: 'submissions',
        id: submissionA.id,
        depth: 0,
        overrideAccess: true,
      }),
    ).toMatchObject({ file: originalFileID, reviewState: 'ready-for-decision', status: 'pending' })
    expect(
      await payload.findByID({
        collection: 'revision-rounds',
        id: revisionRoundA.id,
        depth: 0,
        overrideAccess: true,
      }),
    ).toMatchObject({ revisedManuscript: revisionFileA.id, status: 'submitted' })
    expect(
      await payload.findByID({
        collection: 'reviewer-assignments',
        id: originalReviewA.id,
        overrideAccess: true,
      }),
    ).toMatchObject({
      authorComments: originalReport.authorComments,
      recommendation: originalReport.recommendation,
      status: 'completed',
    })
  })

  it('rejects repeated and cross-submission revision uploads without adding history entries', async () => {
    const before = await payload.count({
      collection: 'submission-files',
      overrideAccess: true,
      where: { revisionRound: { equals: revisionRoundA.id } },
    })
    await expect(
      upload(authorA, {
        kind: 'revision',
        revisionRound: revisionRoundA.id,
        submission: submissionB.id,
      }),
    ).rejects.toThrow(/must match/i)
    await expect(
      upload(authorA, {
        kind: 'revision',
        revisionRound: revisionRoundA.id,
        submission: submissionA.id,
      }),
    ).rejects.toThrow(/already|not open/i)
    const after = await payload.count({
      collection: 'submission-files',
      overrideAccess: true,
      where: { revisionRound: { equals: revisionRoundA.id } },
    })
    expect(after.totalDocs).toBe(before.totalDocs)
  })

  it('rejects revision submission after its deadline and cross-edition rounds', async () => {
    const late = await createSubmission(authorB, editionB, 'late')
    await prepareForDecision(late.submission)
    await expect(
      payload.create({
        collection: 'revision-rounds',
        data: {
          deadline: new Date(Date.now() + 60_000).toISOString(),
          edition: editionA,
          instructions: 'Wrong edition.',
          requestedAt: new Date().toISOString(),
          requestedBy: editor.id,
          roundKey: 'invalid',
          roundNumber: 1,
          status: 'open',
          submission: late.submission.id,
        },
        overrideAccess: false,
        user: editor,
      }),
    ).rejects.toThrow(/edition must match/i)
    const lateRound = await requestRevision(late.submission, undefined, admin)
    const realDateNow = Date.now
    Date.now = () => realDateNow() + 8 * 24 * 60 * 60_000
    try {
      await expect(
        upload(authorB, {
          kind: 'revision',
          revisionRound: lateRound.id,
          submission: late.submission.id,
        }),
      ).rejects.toThrow(/not open/i)
    } finally {
      Date.now = realDateNow
    }
    await payload.update({
      collection: 'submissions',
      id: late.submission.id,
      data: { status: 'rejected' },
      overrideAccess: false,
      user: editor,
    })
    const closed = await payload.findByID({
      collection: 'revision-rounds',
      id: lateRound.id,
      overrideAccess: true,
    })
    expect(closed.status).toBe('closed')
    await expect(
      payload.update({
        collection: 'revision-rounds',
        id: lateRound.id,
        data: { status: 'open' },
        overrideAccess: false,
        user: authorB,
      }),
    ).rejects.toThrow()
  })

  it('scopes reviewer follow-up to an explicit revision round and exact revised file', async () => {
    const followUp = await payload.create({
      collection: 'reviewer-assignments',
      data: {
        assignedAt: new Date().toISOString(),
        assignmentKey: 'server-managed',
        edition: editionA,
        reviewer: reviewerC.id,
        reviewerNumber: '1',
        revisionRound: revisionRoundA.id,
        slotKey: 'server-managed',
        status: 'assigned',
        submission: submissionA.id,
      },
      overrideAccess: false,
      user: editor,
    })
    created.assignments.push(followUp.id)
    const secondFollowUp = await payload.create({
      collection: 'reviewer-assignments',
      data: {
        assignedAt: new Date().toISOString(),
        assignmentKey: 'server-managed',
        edition: editionA,
        reviewer: reviewerA.id,
        reviewerNumber: '2',
        revisionRound: revisionRoundA.id,
        slotKey: 'server-managed',
        status: 'assigned',
        submission: submissionA.id,
      },
      overrideAccess: false,
      user: editor,
    })
    created.assignments.push(secondFollowUp.id)
    await expect(
      payload.findByID({
        collection: 'submission-files',
        id: revisionFileA.id,
        overrideAccess: false,
        user: reviewerC,
      }),
    ).resolves.toMatchObject({ id: revisionFileA.id })
    await expect(
      payload.findByID({
        collection: 'submission-files',
        id: originalA.id,
        overrideAccess: false,
        user: reviewerC,
      }),
    ).rejects.toThrow()
    const reviewerSubmission = await payload.findByID({
      collection: 'submissions',
      id: submissionA.id,
      depth: 2,
      overrideAccess: false,
      user: reviewerC,
    })
    expect(reviewerSubmission).not.toHaveProperty('author')
    for (const [assignment, reviewer] of [
      [followUp, reviewerC],
      [secondFollowUp, reviewerA],
    ] as const) {
      await payload.update({
        collection: 'reviewer-assignments',
        id: assignment.id,
        data: {
          authorComments: 'The revised manuscript addresses the requested changes.',
          recommendation: 'accept',
          status: 'completed',
        },
        overrideAccess: false,
        user: reviewer,
      })
    }
    expect(
      await payload.findByID({
        collection: 'submissions',
        id: submissionA.id,
        depth: 0,
        overrideAccess: true,
      }),
    ).toMatchObject({ reviewState: 'ready-for-decision', status: 'pending' })
    await expect(
      payload.create({
        collection: 'reviewer-assignments',
        data: {
          assignedAt: new Date().toISOString(),
          assignmentKey: 'invalid',
          edition: editionB,
          reviewer: reviewerA.id,
          reviewerNumber: '2',
          revisionRound: revisionRoundA.id,
          slotKey: 'invalid',
          status: 'assigned',
          submission: submissionB.id,
        },
        overrideAccess: false,
        user: editor,
      }),
    ).rejects.toThrow()
  })

  it('gates camera-ready upload on final acceptance and owner role', async () => {
    await expect(
      upload(authorB, { kind: 'camera-ready', submission: submissionB.id }),
    ).rejects.toThrow(/acceptance/i)
    await expect(
      upload(authorB, { kind: 'camera-ready', submission: submissionA.id }),
    ).rejects.toThrow(/submission owner/i)
    await expect(
      upload(reviewerC, { kind: 'camera-ready', submission: submissionA.id }),
    ).rejects.toThrow()

    await payload.update({
      collection: 'submissions',
      id: submissionA.id,
      data: { status: 'accepted' },
      overrideAccess: false,
      user: editor,
    })
    const cameraReady = await upload(authorA, {
      kind: 'camera-ready',
      submission: submissionA.id,
    })
    expect(cameraReady.kind).toBe('camera-ready')
    expect(
      await payload.findByID({
        collection: 'submissions',
        id: submissionA.id,
        depth: 0,
        overrideAccess: true,
      }),
    ).toMatchObject({ cameraReadyFile: cameraReady.id, status: 'accepted' })
    await expect(
      payload.findByID({
        collection: 'submission-files',
        id: cameraReady.id,
        overrideAccess: false,
        user: authorB,
      }),
    ).rejects.toThrow()
    await expect(
      payload.findByID({
        collection: 'submission-files',
        id: cameraReady.id,
        overrideAccess: false,
        user: editor,
      }),
    ).resolves.toMatchObject({ id: cameraReady.id })
    await expect(
      payload.update({
        collection: 'submissions',
        id: submissionA.id,
        data: { status: 'rejected' },
        overrideAccess: false,
        user: editor,
      }),
    ).rejects.toThrow(/Invalid editorial workflow transition/i)
  })

  it('does not let reviewers set final workflow state', async () => {
    await expect(
      payload.update({
        collection: 'submissions',
        id: submissionB.id,
        data: { status: 'accepted' },
        overrideAccess: false,
        user: reviewerA,
      }),
    ).rejects.toThrow()
  })

  afterAll(async () => {
    payload.sendEmail = originalSendEmail
    for (const id of created.assignments.reverse()) {
      await payload.delete({ collection: 'reviewer-assignments', id, overrideAccess: true })
    }
    for (const id of created.revisionRounds.reverse()) {
      await payload.delete({ collection: 'revision-rounds', id, overrideAccess: true })
    }
    for (const id of created.submissions.reverse()) {
      await payload.delete({ collection: 'submissions', id, overrideAccess: true })
    }
    for (const id of created.files.reverse()) {
      await payload.delete({ collection: 'submission-files', id, overrideAccess: true })
    }
    for (const id of created.editions.reverse()) {
      await payload.delete({ collection: 'editions', id, overrideAccess: true })
    }
    for (const id of created.users.reverse()) {
      await payload.delete({ collection: 'users', id, overrideAccess: true })
    }
  })
})
