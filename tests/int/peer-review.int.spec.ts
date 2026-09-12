import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { GET as restGet } from '@/app/(payload)/api/[...slug]/route'
import { POST as graphqlPost } from '@/app/(payload)/api/graphql/route'
import config from '@/payload.config'
import type { ReviewerAssignment, Submission, User } from '@/payload-types'

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
let assignmentA: ReviewerAssignment
let assignmentB: ReviewerAssignment

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const created = {
  assignments: [] as number[],
  editions: [] as number[],
  files: [] as number[],
  submissions: [] as number[],
  revisionRounds: [] as number[],
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
      password: 'peer-review-test-password',
      role,
    },
    overrideAccess: true,
  })
  created.users.push(user.id)
  return user
}

async function createSubmission(author: User, edition: number, label: string) {
  const pdf = createMinimalPDFBuffer()
  const file = await payload.create({
    collection: 'submission-files',
    data: { author: author.id, kind: 'original-review' },
    file: {
      data: pdf,
      mimetype: 'application/pdf',
      name: `peer-review-${suffix}-${label}.pdf`,
      size: pdf.length,
    },
    overrideAccess: true,
  })
  created.files.push(file.id)
  const submission = await payload.create({
    collection: 'submissions',
    data: {
      abstract: `Abstract ${label}`,
      author: author.id,
      edition,
      file: file.id,
      locale: 'en',
      reviewState: 'unassigned',
      status: 'pending',
      title: `Peer review paper ${label}`,
    },
    overrideAccess: true,
  })
  created.submissions.push(submission.id)
  return submission
}

async function assign(
  actingUser: User,
  reviewer: User,
  reviewerNumber: '1' | '2' | '3',
  submission = submissionA,
  edition = editionA,
) {
  const assignment = await payload.create({
    collection: 'reviewer-assignments',
    depth: 0,
    data: {
      assignedAt: new Date().toISOString(),
      assignmentKey: 'server-managed',
      edition,
      reviewer: reviewer.id,
      reviewerNumber,
      slotKey: 'server-managed',
      status: 'assigned',
      submission: submission.id,
    },
    overrideAccess: false,
    user: actingUser,
  })
  created.assignments.push(assignment.id)
  return assignment
}

describe('ICAIA peer-review workflow', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    admin = await createUser('admin')
    editor = await createUser('editor')
    authorA = await createUser('author')
    authorB = await createUser('author')
    reviewerA = await createUser('reviewer')
    reviewerB = await createUser('reviewer')
    reviewerC = await createUser('reviewer')

    const firstEdition = await createPublishedLiveEdition(payload, {
      title: `Peer review edition A ${suffix}`,
      year: 700000 + Math.floor(Math.random() * 10000),
    })
    const secondEdition = await createPublishedLiveEdition(payload, {
      title: `Peer review edition B ${suffix}`,
      year: 800000 + Math.floor(Math.random() * 10000),
    })
    editionA = firstEdition.id
    editionB = secondEdition.id
    created.editions.push(editionA, editionB)
    submissionA = await createSubmission(authorA, editionA, 'A')
    submissionB = await createSubmission(authorB, editionB, 'B')
  })

  it('allows admins and editors to assign reviewer slots', async () => {
    assignmentA = await assign(admin, reviewerA, '1')
    assignmentB = await assign(editor, reviewerB, '2')

    expect(assignmentA).toMatchObject({
      edition: editionA,
      reviewer: reviewerA.id,
      reviewerNumber: '1',
      status: 'assigned',
      submission: submissionA.id,
    })
    expect(assignmentB.reviewer).toBe(reviewerB.id)

    const assignableUsers = await payload.find({
      collection: 'users',
      overrideAccess: false,
      pagination: false,
      user: editor,
    })
    expect(assignableUsers.docs.map((user) => user.id)).toEqual(
      expect.arrayContaining([editor.id, reviewerA.id, reviewerB.id, reviewerC.id]),
    )
    expect(assignableUsers.docs.map((user) => user.id)).not.toContain(authorA.id)

    const updatedSubmission = await payload.findByID({
      collection: 'submissions',
      id: submissionA.id,
      overrideAccess: true,
    })
    expect(updatedSubmission.reviewState).toBe('in-review')
  })

  it('rejects duplicate reviewers, duplicate slots, cross-edition assignments, and self-assignment', async () => {
    await expect(assign(editor, reviewerA, '2')).rejects.toThrow(/already assigned/i)
    await expect(assign(editor, reviewerC, '2')).rejects.toThrow(/already assigned/i)
    await expect(assign(editor, reviewerC, '1', submissionA, editionB)).rejects.toThrow(
      /must match the submission edition/i,
    )
    await expect(assign(reviewerC, reviewerC, '1', submissionB, editionB)).rejects.toThrow()
  })

  it('lets a reviewer read only the assigned submission and private file', async () => {
    const assigned = await payload.find({
      collection: 'submissions',
      overrideAccess: false,
      user: reviewerA,
    })
    expect(assigned.docs.map((doc) => doc.id)).toContain(submissionA.id)
    expect(assigned.docs.map((doc) => doc.id)).not.toContain(submissionB.id)

    const assignedFileID =
      typeof submissionA.file === 'number' ? submissionA.file : submissionA.file.id
    const unassignedFileID =
      typeof submissionB.file === 'number' ? submissionB.file : submissionB.file.id
    await expect(
      payload.findByID({
        collection: 'submission-files',
        id: assignedFileID,
        overrideAccess: false,
        user: reviewerA,
      }),
    ).resolves.toMatchObject({ id: assignedFileID })
    await expect(
      payload.findByID({
        collection: 'submission-files',
        id: unassignedFileID,
        overrideAccess: false,
        user: reviewerA,
      }),
    ).rejects.toThrow()
  })

  it('prevents reviewers from mutating protected submission fields or another report', async () => {
    await expect(
      payload.update({
        collection: 'submissions',
        id: submissionA.id,
        data: { author: reviewerA.id, status: 'accepted', title: 'Reviewer rewrite' },
        overrideAccess: false,
        user: reviewerA,
      }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'reviewer-assignments',
        id: assignmentB.id,
        data: { authorComments: 'Tampered report', recommendation: 'reject' },
        overrideAccess: false,
        user: reviewerA,
      }),
    ).rejects.toThrow()
    await expect(
      payload.findByID({
        collection: 'reviewer-assignments',
        id: assignmentB.id,
        overrideAccess: false,
        user: reviewerA,
      }),
    ).rejects.toThrow()
  })

  it('allows independent draft and completed reports, then detects disagreement without deciding', async () => {
    await payload.update({
      collection: 'reviewer-assignments',
      id: assignmentA.id,
      data: {
        authorComments: 'Strong contribution with minor presentational issues.',
        editorComments: 'This reviewer must not be able to write editor notes.',
        recommendation: 'accept',
      },
      overrideAccess: false,
      user: reviewerA,
    })
    assignmentA = await payload.update({
      collection: 'reviewer-assignments',
      id: assignmentA.id,
      data: { status: 'completed' },
      overrideAccess: false,
      user: reviewerA,
    })
    assignmentB = await payload.update({
      collection: 'reviewer-assignments',
      id: assignmentB.id,
      data: {
        authorComments: 'The argument needs material revision before acceptance.',
        editorComments: 'Private concern for the editorial team.',
        recommendation: 'revision',
        status: 'completed',
      },
      overrideAccess: false,
      user: reviewerB,
    })

    expect(assignmentA).toMatchObject({
      authorComments: 'Strong contribution with minor presentational issues.',
      recommendation: 'accept',
      status: 'completed',
    })
    expect(assignmentA.editorComments).toBeUndefined()
    expect(assignmentB).toMatchObject({
      authorComments: 'The argument needs material revision before acceptance.',
      recommendation: 'revision',
      status: 'completed',
    })
    expect(assignmentB.submittedAt).toBeTruthy()

    const submission = await payload.findByID({
      collection: 'submissions',
      id: submissionA.id,
      overrideAccess: true,
    })
    expect(submission).toMatchObject({
      reviewState: 'third-review-recommended',
      status: 'pending',
    })
    await expect(
      payload.update({
        collection: 'reviewer-assignments',
        id: assignmentA.id,
        data: { authorComments: 'Changed after completion' },
        overrideAccess: false,
        user: reviewerA,
      }),
    ).rejects.toThrow()
  })

  it('supports but never automatically creates a third-reviewer assignment', async () => {
    const before = await payload.find({
      collection: 'reviewer-assignments',
      overrideAccess: true,
      where: { submission: { equals: submissionA.id } },
    })
    expect(before.docs).toHaveLength(2)

    const third = await assign(editor, reviewerC, '3')
    expect(third).toMatchObject({ reviewer: reviewerC.id, reviewerNumber: '3', status: 'assigned' })
    expect(
      await payload.findByID({
        collection: 'submissions',
        id: submissionA.id,
        overrideAccess: true,
      }),
    ).toMatchObject({ reviewState: 'third-review-in-progress', status: 'pending' })

    await payload.update({
      collection: 'reviewer-assignments',
      id: third.id,
      data: {
        authorComments: 'A revision can resolve the remaining concerns.',
        recommendation: 'revision',
        status: 'completed',
      },
      overrideAccess: false,
      user: reviewerC,
    })
    expect(
      await payload.findByID({
        collection: 'submissions',
        id: submissionA.id,
        overrideAccess: true,
      }),
    ).toMatchObject({ reviewState: 'ready-for-decision', status: 'pending' })
  })

  it('keeps author responses anonymized through Local API, REST, and GraphQL', async () => {
    await payload.update({
      collection: 'reviewer-assignments',
      id: assignmentA.id,
      data: { editorComments: 'Identity-linked editor-only note.' },
      overrideAccess: false,
      user: editor,
    })

    const unreleased = await payload.find({
      collection: 'reviewer-assignments',
      overrideAccess: false,
      user: authorA,
      where: { submission: { equals: submissionA.id } },
    })
    expect(unreleased.docs).toHaveLength(0)

    const originalSendEmail = payload.sendEmail
    let sentHTML = ''
    payload.sendEmail = (async (options) => {
      sentHTML = typeof options.html === 'string' ? options.html : ''
    }) as typeof payload.sendEmail
    try {
      const revisionRound = await payload.create({
        collection: 'revision-rounds',
        data: {
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
          edition: editionA,
          instructions: 'Please address the reports before the final version.',
          requestedAt: new Date().toISOString(),
          requestedBy: editor.id,
          roundKey: 'server-managed',
          roundNumber: 1,
          status: 'open',
          submission: submissionA.id,
        },
        overrideAccess: false,
        user: editor,
      })
      created.revisionRounds.push(revisionRound.id)
    } finally {
      payload.sendEmail = originalSendEmail
    }
    expect(sentHTML).toContain('Strong contribution with minor presentational issues.')
    expect(sentHTML).toContain('A revision can resolve the remaining concerns.')
    expect(sentHTML).not.toContain('Identity-linked editor-only note.')
    expect(sentHTML).not.toContain(reviewerA.email)

    const local = await payload.find({
      collection: 'reviewer-assignments',
      depth: 2,
      overrideAccess: false,
      user: authorA,
      where: { submission: { equals: submissionA.id } },
    })
    expect(local.docs).toHaveLength(3)
    for (const review of local.docs) {
      expect(review.authorComments).toBeTruthy()
      expect(review).not.toHaveProperty('reviewer')
      expect(review).not.toHaveProperty('editorComments')
      expect(review).not.toHaveProperty('assignmentKey')
      expect(review).not.toHaveProperty('slotKey')
      expect(review).not.toHaveProperty('reviewerNumber')
      expect(review).not.toHaveProperty('edition')
    }
    const versions = await payload.findVersions({
      collection: 'reviewer-assignments',
      depth: 2,
      overrideAccess: false,
      user: authorA,
      where: { parent: { equals: assignmentA.id } },
    })
    expect(versions.docs.length).toBeGreaterThan(0)
    for (const version of versions.docs) {
      expect(version.version).not.toHaveProperty('reviewer')
      expect(version.version).not.toHaveProperty('editorComments')
      expect(version.version).not.toHaveProperty('assignmentKey')
      expect(version.version).not.toHaveProperty('slotKey')
    }
    const unrelatedAuthor = await payload.find({
      collection: 'reviewer-assignments',
      overrideAccess: false,
      user: authorB,
      where: { submission: { equals: submissionA.id } },
    })
    expect(unrelatedAuthor.docs).toHaveLength(0)

    const login = await payload.login({
      collection: 'users',
      data: { email: authorA.email, password: 'peer-review-test-password' },
    })
    const rest = await restGet(
      api(`reviewer-assignments?where[submission][equals]=${submissionA.id}&depth=2`, {
        headers: { Authorization: `JWT ${login.token}` },
      }),
      { params: Promise.resolve({ slug: ['reviewer-assignments'] }) },
    )
    expect(rest.status).toBe(200)
    const restDocs = (await rest.json()).docs as Array<Record<string, unknown>>
    expect(restDocs).toHaveLength(3)
    expect(JSON.stringify(restDocs)).not.toContain(reviewerA.email)
    expect(JSON.stringify(restDocs)).not.toContain('Identity-linked editor-only note.')
    expect(restDocs[0]).not.toHaveProperty('reviewer')
    const restVersions = await restGet(
      api(`reviewer-assignments/versions?where[parent][equals]=${assignmentA.id}&depth=2`, {
        headers: { Authorization: `JWT ${login.token}` },
      }),
      { params: Promise.resolve({ slug: ['reviewer-assignments', 'versions'] }) },
    )
    expect(restVersions.status).toBe(200)
    const restVersionBody = await restVersions.json()
    expect(JSON.stringify(restVersionBody)).not.toContain(reviewerA.email)
    expect(JSON.stringify(restVersionBody)).not.toContain('Identity-linked editor-only note.')

    const graphql = await graphqlPost(
      api('graphql', {
        method: 'POST',
        headers: {
          Authorization: `JWT ${login.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: `query { ReviewerAssignments(where: { submission: { equals: ${submissionA.id} } }) { docs { id recommendation authorComments reviewer { email } editorComments assignmentKey reviewerNumber edition { id } } } }`,
        }),
      }),
    )
    const graphqlBody = await graphql.json()
    const serialized = JSON.stringify(graphqlBody)
    expect(serialized).not.toContain(reviewerA.email)
    expect(serialized).not.toContain('Identity-linked editor-only note.')
    expect(graphqlBody.data?.ReviewerAssignments?.docs ?? []).toHaveLength(3)

    const authorSubmission = await payload.findByID({
      collection: 'submissions',
      id: submissionA.id,
      overrideAccess: false,
      user: authorA,
    })
    expect(authorSubmission.authorDecisionComments).toBeNull()
    expect(authorSubmission).not.toHaveProperty('reviewNotes')
    expect(authorSubmission).not.toHaveProperty('reviewState')
  })

  it('keeps the final decision editor-controlled and supports conditional acceptance', async () => {
    await expect(
      payload.update({
        collection: 'submissions',
        id: submissionA.id,
        data: { status: 'accepted' },
        overrideAccess: false,
        user: reviewerA,
      }),
    ).rejects.toThrow()
    expect(
      await payload.findByID({
        collection: 'submissions',
        id: submissionA.id,
        overrideAccess: true,
      }),
    ).toMatchObject({
      status: 'revision-required',
    })
  })

  afterAll(async () => {
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
