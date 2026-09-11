import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import type { User } from '@/payload-types'
import { GET as restGet, POST as restPost } from '@/app/(payload)/api/[...slug]/route'
import { POST as graphqlPost } from '@/app/(payload)/api/graphql/route'
import { cleanupMagicLinks } from '@/lib/magic-link'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createMinimalPDFBuffer, createPublishedLiveEdition } from '../helpers/securityFixtures'

let payload: Payload
let admin: User
let authorA: User
let authorB: User
let openEditionID: number
const created = {
  editions: [] as number[],
  pages: [] as number[],
  registrations: [] as number[],
  submissions: [] as number[],
  files: [] as number[],
  magicLinks: [] as number[],
  users: [] as number[],
}

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const pdf = createMinimalPDFBuffer()

function api(path: string, init?: RequestInit) {
  return new Request(`http://localhost/api/${path}`, init)
}

async function createUser(role: User['role']) {
  const user = await payload.create({
    collection: 'users',
    data: {
      email: `${role}-${suffix}-${created.users.length}@example.com`,
      password: 'security-test-password',
      role,
    },
    overrideAccess: true,
  })
  created.users.push(user.id)
  return user
}

async function createPDF(author: User) {
  const file = await payload.create({
    collection: 'submission-files',
    data: { author: author.id },
    file: {
      data: pdf,
      mimetype: 'application/pdf',
      name: `security-${suffix}-${created.files.length}.pdf`,
      size: pdf.length,
    },
    overrideAccess: false,
    user: author,
  })
  created.files.push(file.id)
  return file
}

describe('security boundaries', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    admin = await createUser('admin')
    authorA = await createUser('author')
    authorB = await createUser('author')

    const edition = await createPublishedLiveEdition(payload, {
      year: 300000 + Math.floor(Math.random() * 100000),
      title: `Open security edition ${suffix}`,
    })
    openEditionID = edition.id
    created.editions.push(edition.id)
  })

  it('denies anonymous draft reads through REST, GraphQL, and access-respecting Local API', async () => {
    const draftEdition = await payload.create({
      collection: 'editions',
      data: {
        year: 400000 + Math.floor(Math.random() * 100000),
        title: `Secret draft edition ${suffix}`,
        startDate: '2100-01-01T00:00:00.000Z',
        endDate: '2100-01-02T00:00:00.000Z',
        editionStatus: 'draft',
      },
      draft: true,
      overrideAccess: true,
    })
    created.editions.push(draftEdition.id)
    const draftPage = await payload.create({
      collection: 'pages',
      data: {
        title: `Secret draft page ${suffix}`,
        slug: `secret-${suffix}`,
        edition: openEditionID,
      },
      draft: true,
      overrideAccess: true,
    })
    created.pages.push(draftPage.id)

    const local = await payload.find({
      collection: 'editions',
      where: { id: { equals: draftEdition.id } },
      overrideAccess: false,
    })
    expect(local.docs).toHaveLength(0)
    await expect(
      payload.findVersions({ collection: 'editions', overrideAccess: false }),
    ).rejects.toThrow()

    const rest = await restGet(api(`editions?where[id][equals]=${draftEdition.id}&draft=true`), {
      params: Promise.resolve({ slug: ['editions'] }),
    })
    expect(rest.status).toBe(200)
    expect((await rest.json()).docs).toHaveLength(0)

    const graphql = await graphqlPost(
      api('graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: `query { Pages(where: { id: { equals: ${draftPage.id} } }, draft: true) { docs { id title _status } } }`,
        }),
      }),
    )
    const graphqlBody = await graphql.json()
    expect(graphqlBody.errors).toBeUndefined()
    expect(graphqlBody.data.Pages.docs).toHaveLength(0)

    const adminView = await payload.findByID({
      collection: 'editions',
      id: draftEdition.id,
      overrideAccess: false,
      user: admin,
    })
    expect(adminView.id).toBe(draftEdition.id)
    const adminVersions = await payload.findVersions({
      collection: 'editions',
      overrideAccess: false,
      user: admin,
      where: { parent: { equals: draftEdition.id } },
    })
    expect(adminVersions.totalDocs).toBeGreaterThan(0)
  })

  it('denies the unlock operation to non-admins and allows admins', async () => {
    await payload.update({
      collection: 'users',
      id: authorB.id,
      data: {
        loginAttempts: 5,
        lockUntil: new Date(Date.now() + 60 * 60_000).toISOString(),
      },
      overrideAccess: true,
    })

    const authorLogin = await payload.login({
      collection: 'users',
      data: { email: authorA.email, password: 'security-test-password' },
    })
    const denied = await restPost(
      api('users/unlock', {
        method: 'POST',
        headers: {
          Authorization: `JWT ${authorLogin.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email: authorB.email }),
      }),
      { params: Promise.resolve({ slug: ['users', 'unlock'] }) },
    )
    expect(denied.status).toBe(403)

    const stillLocked = await payload.findByID({
      collection: 'users',
      id: authorB.id,
      overrideAccess: true,
      showHiddenFields: true,
    })
    expect(stillLocked.loginAttempts).toBe(5)
    expect(stillLocked.lockUntil).not.toBeNull()

    const adminLogin = await payload.login({
      collection: 'users',
      data: { email: admin.email, password: 'security-test-password' },
    })
    const allowed = await restPost(
      api('users/unlock', {
        method: 'POST',
        headers: {
          Authorization: `JWT ${adminLogin.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email: authorB.email }),
      }),
      { params: Promise.resolve({ slug: ['users', 'unlock'] }) },
    )
    expect(allowed.status).toBe(200)

    const unlocked = await payload.findByID({
      collection: 'users',
      id: authorB.id,
      overrideAccess: true,
      showHiddenFields: true,
    })
    expect(unlocked.loginAttempts).toBe(0)
    expect(unlocked.lockUntil).toBeNull()
  })

  it('enforces live-edition and duplicate registration rules on anonymous REST creation', async () => {
    const email = `registration-${suffix}@example.com`
    const body = {
      firstName: 'Direct',
      lastName: 'Registrant',
      email,
      locale: 'fr',
      edition: openEditionID,
      status: 'cancelled',
      checkedIn: true,
      user: authorA.id,
    }
    const first = await restPost(
      api('registrations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ slug: ['registrations'] }) },
    )
    expect(first.status).toBe(201)
    const registration = (await first.json()).doc
    created.registrations.push(registration.id)
    expect(registration).toMatchObject({ status: 'confirmed', checkedIn: false })
    expect(registration.user ?? null).toBeNull()

    const duplicate = await restPost(
      api('registrations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ slug: ['registrations'] }) },
    )
    expect(duplicate.status).toBe(409)

    const archived = await payload.create({
      collection: 'editions',
      data: {
        year: 500000 + Math.floor(Math.random() * 100000),
        title: `Archived security edition ${suffix}`,
        startDate: '2098-01-01T00:00:00.000Z',
        endDate: '2098-01-02T00:00:00.000Z',
        editionStatus: 'archived',
        _status: 'published',
      },
      draft: false,
      overrideAccess: true,
    })
    created.editions.push(archived.id)
    const wrongEdition = await restPost(
      api('registrations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, email: `archived-${email}`, edition: archived.id }),
      }),
      { params: Promise.resolve({ slug: ['registrations'] }) },
    )
    expect(wrongEdition.status).toBe(400)

    const graphqlBypass = await graphqlPost(
      api('graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: `mutation { createRegistration(data: { firstName: "Direct", lastName: "Registrant", email: "graphql-${email}", locale: fr, edition: ${archived.id} }) { id } }`,
        }),
      }),
    )
    const graphqlBypassBody = await graphqlBypass.json()
    expect(graphqlBypassBody.data?.createRegistration ?? null).toBeNull()
    expect(graphqlBypassBody.errors).toBeDefined()
  })

  it('isolates submission and file ownership and protects reviewer fields', async () => {
    const file = await createPDF(authorA)
    const submission = await payload.create({
      collection: 'submissions',
      depth: 0,
      data: {
        edition: openEditionID,
        author: authorB.id,
        title: 'Boundary paper',
        abstract: 'Boundary abstract',
        file: file.id,
        locale: 'fr',
        reviewState: 'unassigned',
        status: 'accepted',
        reviewNotes: 'Injected by author',
      },
      overrideAccess: false,
      user: authorA,
    })
    created.submissions.push(submission.id)
    expect(submission.author).toBe(authorA.id)
    expect(submission.status).toBe('pending')
    expect(submission.reviewNotes).toBeUndefined()

    await expect(
      payload.create({
        collection: 'submissions',
        data: {
          edition: openEditionID,
          author: authorB.id,
          title: 'Stolen file paper',
          abstract: "Must not attach another author's file",
          file: file.id,
          locale: 'fr',
          reviewState: 'unassigned',
          status: 'pending',
        },
        overrideAccess: false,
        user: authorB,
      }),
    ).rejects.toThrow()

    const otherUsersSubmissions = await payload.find({
      collection: 'submissions',
      where: { id: { equals: submission.id } },
      overrideAccess: false,
      user: authorB,
    })
    expect(otherUsersSubmissions.docs).toHaveLength(0)
    const otherUsersFiles = await payload.find({
      collection: 'submission-files',
      where: { id: { equals: file.id } },
      overrideAccess: false,
      user: authorB,
    })
    expect(otherUsersFiles.docs).toHaveLength(0)

    await expect(
      payload.update({
        collection: 'submissions',
        id: submission.id,
        data: { status: 'accepted', reviewNotes: 'Author edit' },
        overrideAccess: false,
        user: authorA,
      }),
    ).rejects.toThrow()

    const loginA = await payload.login({
      collection: 'users',
      data: { email: authorA.email, password: 'security-test-password' },
    })
    const loginB = await payload.login({
      collection: 'users',
      data: { email: authorB.email, password: 'security-test-password' },
    })
    const filename = file.filename
    expect(filename).toBeTypeOf('string')
    const ownerDownload = await restGet(
      api(`submission-files/file/${filename}`, {
        headers: { Authorization: `JWT ${loginA.token}` },
      }),
      { params: Promise.resolve({ slug: ['submission-files', 'file', filename!] }) },
    )
    expect(ownerDownload.status).toBe(200)
    const crossUserDownload = await restGet(
      api(`submission-files/file/${filename}`, {
        headers: { Authorization: `JWT ${loginB.token}` },
      }),
      { params: Promise.resolve({ slug: ['submission-files', 'file', filename!] }) },
    )
    expect([403, 404]).toContain(crossUserDownload.status)
  })

  it('rejects direct submission creation after the deadline', async () => {
    const file = await createPDF(authorA)
    await payload.update({
      collection: 'editions',
      id: openEditionID,
      data: { submissionDeadline: '2000-01-01T00:00:00.000Z' },
      draft: false,
      overrideAccess: true,
    })
    await expect(
      payload.create({
        collection: 'submissions',
        data: {
          edition: openEditionID,
          author: authorA.id,
          title: 'Late paper',
          abstract: 'Must be rejected',
          file: file.id,
          locale: 'fr',
          reviewState: 'unassigned',
          status: 'pending',
        },
        overrideAccess: false,
        user: authorA,
      }),
    ).rejects.toThrow('Submissions are closed.')
  })

  it('keeps an unconsumed seven-day link after 24 hours and cleans expired/old consumed links', async () => {
    const now = Date.parse('2090-01-03T00:00:00.000Z')
    const base = {
      tokenHash: 'a'.repeat(64),
      requestIpHash: 'b'.repeat(64),
      locale: 'fr' as const,
    }
    const valid = await payload.create({
      collection: 'magic-links',
      data: {
        ...base,
        email: `valid-${suffix}@example.com`,
        createdAt: new Date(now - 2 * 24 * 60 * 60_000).toISOString(),
        expiresAt: new Date(now + 5 * 24 * 60 * 60_000).toISOString(),
      },
      overrideAccess: true,
    })
    created.magicLinks.push(valid.id)
    const expired = await payload.create({
      collection: 'magic-links',
      data: {
        ...base,
        email: `expired-${suffix}@example.com`,
        tokenHash: 'c'.repeat(64),
        expiresAt: new Date(now - 1).toISOString(),
      },
      overrideAccess: true,
    })
    created.magicLinks.push(expired.id)
    const consumed = await payload.create({
      collection: 'magic-links',
      data: {
        ...base,
        email: `consumed-${suffix}@example.com`,
        tokenHash: 'd'.repeat(64),
        expiresAt: new Date(now + 5 * 24 * 60 * 60_000).toISOString(),
        consumedAt: new Date(now - 25 * 60 * 60_000).toISOString(),
      },
      overrideAccess: true,
    })
    created.magicLinks.push(consumed.id)

    await cleanupMagicLinks(payload, now)
    const remaining = await payload.find({
      collection: 'magic-links',
      where: { id: { in: [valid.id, expired.id, consumed.id] } },
      overrideAccess: true,
    })
    expect(remaining.docs.map((doc) => doc.id)).toEqual([valid.id])
  })

  afterAll(async () => {
    for (const id of created.submissions) {
      await payload.delete({ collection: 'submissions', id, overrideAccess: true })
    }
    for (const id of created.files) {
      await payload.delete({ collection: 'submission-files', id, overrideAccess: true })
    }
    for (const id of created.registrations) {
      await payload.delete({ collection: 'registrations', id, overrideAccess: true })
    }
    for (const id of created.pages) {
      await payload.delete({ collection: 'pages', id, overrideAccess: true })
    }
    await payload.delete({
      collection: 'magic-links',
      where: { id: { in: created.magicLinks } },
      overrideAccess: true,
    })
    for (const id of created.editions.reverse()) {
      await payload.delete({ collection: 'editions', id, overrideAccess: true })
    }
    for (const id of created.users) {
      await payload.delete({ collection: 'users', id, overrideAccess: true })
    }
  })
})
