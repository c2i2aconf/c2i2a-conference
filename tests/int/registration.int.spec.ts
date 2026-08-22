import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest'

// registerAction reads request headers for optional user linking
vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}))

import { registerAction } from '@/lib/actions/register'

let payload: Payload
let createdEditionId: number | null = null
let createdRegistrationIds: number[] = []

function form(overrides: Record<string, string> = {}) {
  const data = new FormData()
  data.set('firstName', 'Test')
  data.set('lastName', 'User')
  data.set('email', `reg-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`)
  for (const [key, value] of Object.entries(overrides)) data.set(key, value)
  return data
}

describe('anonymous registration', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // never send real email from tests
    vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)

    const { docs } = await payload.find({
      collection: 'editions',
      where: { editionStatus: { equals: 'live' } },
      limit: 1,
      overrideAccess: true,
    })
    if (docs.length === 0) {
      const edition = await payload.create({
        collection: 'editions',
        data: {
          year: 2099,
          title: 'Integration test edition',
          startDate: '2099-06-01T00:00:00Z',
          endDate: '2099-06-03T00:00:00Z',
          editionStatus: 'live',
        },
        overrideAccess: true,
      })
      createdEditionId = edition.id
    }
  })

  it('registers an anonymous visitor and rejects duplicate emails', async () => {
    const formData = form()
    const email = String(formData.get('email'))

    // Before the overrideAccess fix on the duplicate check this returned
    // server_error for every anonymous request (Forbidden on the find)
    const first = await registerAction(formData, 'fr')
    expect(first).toEqual({ success: true })

    const { docs } = await payload.find({
      collection: 'registrations',
      where: { email: { equals: email } },
      overrideAccess: true,
    })
    createdRegistrationIds = docs.map((doc) => doc.id)
    expect(docs).toHaveLength(1)
    expect(docs[0].status).toBe('confirmed')

    const second = await registerAction(form({ email }), 'fr')
    expect(second).toEqual({ success: false, error: 'duplicate_email' })
  })

  it('validates required fields before touching the database', async () => {
    const result = await registerAction(form({ email: 'not-an-email' }), 'fr')
    expect(result).toEqual({ success: false, error: 'missing_fields' })
  })

  afterAll(async () => {
    for (const id of createdRegistrationIds) {
      await payload.delete({ collection: 'registrations', id, overrideAccess: true })
    }
    if (createdEditionId !== null) {
      await payload.delete({ collection: 'editions', id: createdEditionId, overrideAccess: true })
    }
  })
})
