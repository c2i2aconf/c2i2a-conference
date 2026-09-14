import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { User } from '@/payload-types'
import { submitPaper } from '@/lib/actions/submit'
import { createMinimalPDFBuffer, createPublishedLiveEdition } from '../helpers/securityFixtures'

const mocked = vi.hoisted(() => ({ requestHeaders: new Headers() }))
vi.mock('next/headers', () => ({ headers: async () => mocked.requestHeaders }))

let payload: Payload
let author: User
let editionID: number
const submissions: number[] = []
const files: number[] = []
const jobs: number[] = []
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`

function form(label: string) {
  const pdf = createMinimalPDFBuffer()
  const data = new FormData()
  data.set('title', `Outbox submission ${label}`)
  data.set('abstract', 'A focused integration-test abstract.')
  data.set('file', new File([pdf], `${label}.pdf`, { type: 'application/pdf' }))
  return data
}

describe('submission receipt outbox integration', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    author = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: `submission-outbox-${suffix}@example.com`,
        password: 'submission-outbox-test-password',
        role: 'author',
      },
    })
    const login = await payload.login({
      collection: 'users',
      data: { email: author.email, password: 'submission-outbox-test-password' },
    })
    mocked.requestHeaders = new Headers({ Authorization: `JWT ${login.token}` })
    editionID = (
      await createPublishedLiveEdition(payload, {
        title: `Submission outbox ${suffix}`,
        year: 1300000 + Math.floor(Math.random() * 100000),
      })
    ).id
  })

  it('creates the submission and receipt job together', async () => {
    expect(await submitPaper(form('success'), 'en')).toEqual({ success: true })
    const created = await payload.find({
      collection: 'submissions',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { and: [{ author: { equals: author.id } }, { edition: { equals: editionID } }] },
    })
    expect(created.docs).toHaveLength(1)
    submissions.push(created.docs[0].id)
    files.push(created.docs[0].file as number)
    const outbox = await payload.find({
      collection: 'email-outbox',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { eventKey: { equals: `submission-receipt:${created.docs[0].id}` } },
    })
    jobs.push(outbox.docs[0].id)
    expect(outbox.docs[0]).toMatchObject({ status: 'pending', eventType: 'submission-receipt' })
  })

  it('rolls back the submission and removes its uploaded file when enqueueing fails', async () => {
    const beforeFiles = await payload.count({
      collection: 'submission-files',
      overrideAccess: true,
      where: { author: { equals: author.id } },
    })
    const originalKey = process.env.EMAIL_OUTBOX_ENCRYPTION_KEY
    process.env.EMAIL_OUTBOX_ENCRYPTION_KEY = 'invalid-test-key'
    try {
      expect(await submitPaper(form('rollback'), 'en')).toEqual({
        success: false,
        error: 'server_error',
      })
    } finally {
      process.env.EMAIL_OUTBOX_ENCRYPTION_KEY = originalKey
    }
    const afterFiles = await payload.count({
      collection: 'submission-files',
      overrideAccess: true,
      where: { author: { equals: author.id } },
    })
    expect(afterFiles.totalDocs).toBe(beforeFiles.totalDocs)
    expect(
      (
        await payload.count({
          collection: 'submissions',
          overrideAccess: true,
          where: { title: { equals: 'Outbox submission rollback' } },
        })
      ).totalDocs,
    ).toBe(0)
  })

  afterAll(async () => {
    for (const id of jobs) await payload.delete({ collection: 'email-outbox', id, overrideAccess: true })
    for (const id of submissions) await payload.delete({ collection: 'submissions', id, overrideAccess: true })
    for (const id of files) await payload.delete({ collection: 'submission-files', id, overrideAccess: true })
    await payload.delete({ collection: 'editions', id: editionID, overrideAccess: true })
    await payload.delete({ collection: 'users', id: author.id, overrideAccess: true })
  })
})
