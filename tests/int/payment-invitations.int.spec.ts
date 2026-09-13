import { getPayload, type Payload } from 'payload'
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest'
import config from '@/payload.config'
import { GET, POST, PATCH } from '@/app/(payload)/api/[...slug]/route'
import { POST as graphql } from '@/app/(payload)/api/graphql/route'
import type { PaymentProof, Registration, User } from '@/payload-types'
import { createMinimalPDFBuffer, createPublishedLiveEdition } from '../helpers/securityFixtures'
import sharp from 'sharp'

let payload: Payload
let owner: User, other: User, reviewer: User, editor: User
let edition: number, otherEdition: number, details: number
let registration: Registration, proof: PaymentProof, replacement: PaymentProof, exempt: Registration
let letterID: number
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
const users: number[] = [],
  registrations: number[] = [],
  proofs: number[] = [],
  letters: number[] = [],
  configs: number[] = []
const pdf = createMinimalPDFBuffer()

async function register(user = owner, overrides: Record<string, unknown> = {}) {
  const doc = await payload.create({
    collection: 'registrations',
    depth: 0,
    user,
    overrideAccess: false,
    data: {
      firstName: 'Participant',
      lastName: 'Test',
      email: user.email,
      user: user.id,
      edition,
      locale: 'en',
      status: 'confirmed',
      feeCategory: 'faculty',
      ...overrides,
    },
  })
  registrations.push(doc.id)
  return doc
}
async function upload(
  user = owner,
  registrationID = registration.id,
  overrides: Record<string, unknown> = {},
) {
  const doc = await payload.create({
    collection: 'payment-proofs',
    depth: 0,
    user,
    overrideAccess: false,
    data: {
      registration: registrationID,
      edition,
      user: user.id,
      sequence: 99,
      status: 'submitted',
      ...overrides,
    },
    file: { data: pdf, size: pdf.length, mimetype: 'application/pdf', name: 'receipt.pdf' },
  })
  proofs.push(doc.id)
  return doc
}
async function token(user: User) {
  return (
    await payload.login({
      collection: 'users',
      data: { email: user.email, password: 'payment-test-password' },
    })
  ).token
}
function request(path: string, auth?: string, body?: unknown, method = 'POST') {
  return new Request(`http://localhost/api/${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(auth ? { Authorization: `JWT ${auth}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

describe('registration payments and organizer invitations', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
    vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)
    const createUser = async (role: User['role']) => {
      const user = await payload.create({
        collection: 'users',
        overrideAccess: true,
        data: {
          email: `${role}-${users.length}-${suffix}@example.com`,
          password: 'payment-test-password',
          role,
        },
      })
      users.push(user.id)
      return user
    }
    owner = await createUser('author')
    other = await createUser('attendee')
    reviewer = await createUser('reviewer')
    editor = await createUser('editor')
    edition = (
      await createPublishedLiveEdition(payload, {
        title: 'Payment test',
        year: 1200000 + Math.floor(Math.random() * 100000),
      })
    ).id
    otherEdition = (
      await createPublishedLiveEdition(payload, {
        title: 'Other payment test',
        year: 1400000 + Math.floor(Math.random() * 100000),
      })
    ).id
    for (const editionID of [edition, otherEdition]) {
      const doc = await payload.create({
        collection: 'conference-details',
        overrideAccess: true,
        data: {
          edition: editionID,
          paymentRequired: true,
          paymentProofRequired: true,
          invitationLettersAvailable: true,
          paymentProofFormats: ['pdf', 'jpeg', 'png'],
          registrationFees: [
            { code: 'faculty', label: 'Faculty', amount: 1200, currency: 'MAD' },
            {
              code: 'remote',
              label: 'Remote',
              amount: 60,
              currency: 'EUR',
              alternateAmount: 600,
              alternateCurrency: 'MAD',
            },
            { code: 'invited', label: 'Invited', exempt: true },
          ],
        },
      })
      configs.push(doc.id)
    }
    details = configs[0]
  })

  it('creates an owner-scoped participant registration without requiring a paper', async () => {
    registration = await register()
    expect(registration).toMatchObject({
      user: owner.id,
      edition,
      feeCategory: 'faculty',
      feeAmount: 1200,
      feeCurrency: 'MAD',
      feeExempt: false,
      exemptionApproved: false,
    })
  })
  it('rejects duplicate edition/person registrations, including concurrent requests', async () => {
    await expect(register()).rejects.toThrow()
    const results = await Promise.allSettled([
      register(other, { edition: otherEdition }),
      register(other, { edition: otherEdition }),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
  })
  it('denies unrelated and reviewer reads and registering another participant', async () => {
    for (const user of [other, reviewer])
      await expect(
        payload.findByID({
          collection: 'registrations',
          id: registration.id,
          user,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    await expect(register(other, { email: owner.email, user: owner.id })).rejects.toThrow()
  })
  it('rejects unknown categories, wrong edition configurations and unsupported currencies', async () => {
    await expect(register(other, { feeCategory: 'invented' })).rejects.toThrow()
    await expect(register(other, { feeDetails: configs[1] })).rejects.toThrow()
    await expect(register(other, { feeCurrency: 'EUR' })).rejects.toThrow()
  })
  it('freezes fee snapshots across CMS changes and rejects owner edits or self-exemption', async () => {
    const source = await payload.findByID({
      collection: 'conference-details',
      id: details,
      overrideAccess: true,
    })
    await payload.update({
      collection: 'conference-details',
      id: details,
      overrideAccess: true,
      data: {
        registrationFees: source.registrationFees!.map((fee) =>
          fee.code === 'faculty' ? { ...fee, amount: 1300 } : fee,
        ),
      },
    })
    expect(
      (
        await payload.findByID({
          collection: 'registrations',
          id: registration.id,
          user: owner,
          overrideAccess: false,
        })
      ).feeAmount,
    ).toBe(1200)
    for (const user of [owner, editor])
      await expect(
        payload.update({
          collection: 'registrations',
          id: registration.id,
          user,
          overrideAccess: false,
          data: { feeAmount: 1, feeExempt: true },
        }),
      ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'registrations',
        id: registration.id,
        user: owner,
        overrideAccess: true,
        data: { exemptionApproved: true },
      }),
    ).rejects.toThrow()
  })
  it('uploads only as owner and rejects malformed, cross-edition and forged verified proof', async () => {
    await expect(
      payload.create({
        collection: 'invitation-letters',
        user: editor,
        overrideAccess: false,
        data: {
          registration: registration.id,
          user: owner.id,
          edition,
          status: 'issued',
          body: 'Premature invitation',
        },
      }),
    ).rejects.toThrow()
    await expect(upload(other)).rejects.toThrow()
    await expect(upload(reviewer)).rejects.toThrow()
    await expect(upload(owner, registration.id, { edition: otherEdition })).rejects.toThrow()
    await expect(upload(owner, registration.id, { status: 'verified' })).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'payment-proofs',
        user: owner,
        overrideAccess: false,
        data: {
          registration: registration.id,
          user: owner.id,
          edition,
          sequence: 1,
          status: 'submitted',
        },
        file: { data: Buffer.from('fake'), size: 4, mimetype: 'application/pdf', name: 'fake.pdf' },
      }),
    ).rejects.toThrow()
    proof = await upload()
    expect(proof).toMatchObject({ status: 'submitted', sequence: 1, user: owner.id, edition })
    await expect(upload()).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'invitation-letters',
        user: editor,
        overrideAccess: false,
        data: {
          registration: registration.id,
          user: owner.id,
          edition,
          status: 'issued',
          body: 'Unverified invitation',
        },
      }),
    ).rejects.toThrow()
  })
  it('keeps proof bytes private through REST and denies reviewer and unrelated Local API reads', async () => {
    const graph = await graphql(
      request('graphql', await token(other), {
        query: `query { PaymentProof(id: ${proof.id}) { id url } }`,
      }),
    )
    expect((await graph.json()).data?.PaymentProof ?? null).toBeNull()
    for (const user of [other, reviewer])
      await expect(
        payload.findByID({
          collection: 'payment-proofs',
          id: proof.id,
          user,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    const path = `payment-proofs/file/${proof.filename}`
    for (const user of [other, reviewer, null]) {
      const response = await GET(
        request(path, user ? await token(user) : undefined, undefined, 'GET'),
        { params: Promise.resolve({ slug: ['payment-proofs', 'file', proof.filename!] }) },
      )
      expect(response.status).toBeGreaterThanOrEqual(400)
    }
    const response = await GET(request(path, await token(owner), undefined, 'GET'), {
      params: Promise.resolve({ slug: ['payment-proofs', 'file', proof.filename!] }),
    })
    expect(response.status).toBe(200)
    expect(Buffer.from(await response.arrayBuffer())).toEqual(pdf)
    expect(
      (
        await payload.findByID({
          collection: 'payment-proofs',
          id: proof.id,
          user: editor,
          overrideAccess: false,
        })
      ).id,
    ).toBe(proof.id)
  })
  it('denies participant verification even with Local API access override', async () => {
    const graph = await graphql(
      request('graphql', await token(owner), {
        query: `mutation { updatePaymentProof(id: ${proof.id}, data: { status: verified }) { id status } }`,
      }),
    )
    expect((await graph.json()).errors).toBeDefined()
    for (const overrideAccess of [false, true])
      await expect(
        payload.update({
          collection: 'payment-proofs',
          id: proof.id,
          user: owner,
          overrideAccess,
          data: { status: 'verified' },
        }),
      ).rejects.toThrow()
    const response = await PATCH(
      request(`payment-proofs/${proof.id}`, await token(owner), { status: 'verified' }, 'PATCH'),
      { params: Promise.resolve({ slug: ['payment-proofs', String(proof.id)] }) },
    )
    expect(response.status).toBeGreaterThanOrEqual(400)
  })
  it('requires an author-safe rejection reason and preserves rejected history on replacement', async () => {
    await expect(
      payload.update({
        collection: 'payment-proofs',
        id: proof.id,
        user: editor,
        overrideAccess: false,
        data: { status: 'rejected' },
      }),
    ).rejects.toThrow()
    await payload.update({
      collection: 'payment-proofs',
      id: proof.id,
      user: editor,
      overrideAccess: false,
      data: { status: 'rejected', reviewComment: 'Please upload a readable receipt.' },
    })
    replacement = await upload()
    expect(replacement.sequence).toBe(2)
    expect(replacement.filename).not.toBe(proof.filename)
    const old = await payload.findByID({
      collection: 'payment-proofs',
      id: proof.id,
      user: owner,
      overrideAccess: false,
    })
    expect(old.status).toBe('rejected')
    await expect(
      payload.update({
        collection: 'payment-proofs',
        id: proof.id,
        user: editor,
        overrideAccess: false,
        data: { status: 'verified' },
      }),
    ).rejects.toThrow()
  })
  it('allows explicit organizer verification and prohibits replacement of approved proof', async () => {
    const verified = await payload.update({
      collection: 'payment-proofs',
      id: replacement.id,
      user: editor,
      overrideAccess: false,
      depth: 0,
      data: { status: 'verified' },
    })
    expect(verified).toMatchObject({
      status: 'verified',
      reviewedBy: editor.id,
      reviewedAt: expect.any(String),
    })
    await expect(upload()).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'payment-proofs',
        id: replacement.id,
        user: editor,
        overrideAccess: false,
        data: { reviewComment: 'rewrite' },
      }),
    ).rejects.toThrow()
  })
  it('represents exemptions without amounts or proofs and requires organizer approval', async () => {
    exempt = await register(other, {
      feeCategory: 'invited',
      exemptionApproved: true,
      feeExempt: true,
    })
    expect(exempt).toMatchObject({
      feeExempt: true,
      feeAmount: null,
      feeCurrency: null,
      exemptionApproved: false,
    })
    await expect(upload(other, exempt.id)).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'registrations',
        id: exempt.id,
        user: other,
        overrideAccess: false,
        data: { exemptionApproved: true },
      }),
    ).rejects.toThrow()
  })
  it('denies self-issuance and cross-edition invitation relationships through Local API and GraphQL', async () => {
    const data = {
      registration: registration.id,
      edition,
      user: owner.id,
      body: 'Organizer text',
      status: 'issued' as const,
    }
    for (const user of [owner, reviewer])
      await expect(
        payload.create({ collection: 'invitation-letters', data, user, overrideAccess: true }),
      ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'invitation-letters',
        data: { ...data, edition: otherEdition },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    const response = await graphql(
      request('graphql', await token(owner), {
        query: `mutation { createInvitationLetter(data: { registration: ${registration.id}, edition: ${edition}, user: ${owner.id}, body: "forged", status: issued }) { id } }`,
      }),
    )
    expect((await response.json()).errors).toBeDefined()
  })
  it('blocks issuance before exemption approval; drafts are private and eligibility is explicit', async () => {
    const data = {
      registration: exempt.id,
      edition,
      user: other.id,
      body: 'Approved organizer text',
      status: 'issued' as const,
    }
    await expect(
      payload.create({
        collection: 'invitation-letters',
        data,
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    const draft = await payload.create({
      collection: 'invitation-letters',
      data: { ...data, status: 'draft' },
      user: editor,
      overrideAccess: false,
    })
    letters.push(draft.id)
    await expect(
      payload.findByID({
        collection: 'invitation-letters',
        id: draft.id,
        user: other,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await payload.update({
      collection: 'registrations',
      id: exempt.id,
      user: editor,
      overrideAccess: false,
      data: { exemptionApproved: true },
    })
    const issued = await payload.update({
      collection: 'invitation-letters',
      id: draft.id,
      user: editor,
      overrideAccess: false,
      data: { status: 'issued' },
    })
    expect(issued.eligibilityBasis).toBe('exempt')
    expect(issued.verifiedProof).toBeNull()
  })
  it('issues immutable audited invitations belonging to the registration owner and edition', async () => {
    const letter = await payload.create({
      collection: 'invitation-letters',
      depth: 0,
      user: editor,
      overrideAccess: false,
      data: {
        registration: registration.id,
        user: owner.id,
        edition,
        status: 'issued',
        body: 'Organizer-approved invitation text.',
        organizerNote: 'Internal note',
      },
    })
    letters.push(letter.id)
    letterID = letter.id
    expect(letter).toMatchObject({
      registration: registration.id,
      user: owner.id,
      edition,
      issuedBy: editor.id,
      issuedAt: expect.any(String),
      eligibilityBasis: 'verified',
      verifiedProof: replacement.id,
    })
    await expect(
      payload.update({
        collection: 'invitation-letters',
        id: letter.id,
        user: editor,
        overrideAccess: false,
        data: { body: 'changed' },
      }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'registrations',
        id: registration.id,
        user: editor,
        overrideAccess: false,
        data: { status: 'cancelled' },
      }),
    ).rejects.toThrow()
  })
  it('protects invitation reads, internal notes and versions through REST, GraphQL and Local API', async () => {
    for (const user of [other, reviewer])
      await expect(
        payload.findByID({
          collection: 'invitation-letters',
          id: letterID,
          user,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    const own = await payload.findByID({
      collection: 'invitation-letters',
      id: letterID,
      user: owner,
      overrideAccess: false,
    })
    expect(own.organizerNote).toBeUndefined()
    await expect(
      payload.findVersions({
        collection: 'invitation-letters',
        user: owner,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    const response = await GET(
      request(`invitation-letters/${letterID}`, await token(other), undefined, 'GET'),
      { params: Promise.resolve({ slug: ['invitation-letters', String(letterID)] }) },
    )
    expect(response.status).toBeGreaterThanOrEqual(400)
    const result = await graphql(
      request('graphql', await token(other), {
        query: `query { InvitationLetter(id: ${letterID}) { id body } }`,
      }),
    )
    expect((await result.json()).data?.InvitationLetter ?? null).toBeNull()
  })
  it('denies anonymous fee registration and REST user spoofing without opening real editions', async () => {
    const data = {
      firstName: 'Spoof',
      lastName: 'User',
      email: owner.email,
      user: owner.id,
      edition,
      feeCategory: 'faculty',
    }
    for (const auth of [undefined, await token(other)]) {
      const response = await POST(request('registrations', auth, data), {
        params: Promise.resolve({ slug: ['registrations'] }),
      })
      expect(response.status).toBeGreaterThanOrEqual(400)
    }
  })

  it('uses the alternate CMS currency, fails closed without a file policy, and accepts configured PNG/JPEG', async () => {
    const remote = await register(owner, {
      edition: otherEdition,
      feeCategory: 'remote',
      feeCurrency: 'MAD',
    })
    expect(remote).toMatchObject({ feeAmount: 600, feeCurrency: 'MAD' })
    await payload.update({
      collection: 'conference-details',
      id: configs[1],
      user: editor,
      overrideAccess: false,
      data: { paymentProofFormats: [] },
    })
    await expect(upload(owner, remote.id, { edition: otherEdition })).rejects.toThrow()
    await payload.update({
      collection: 'conference-details',
      id: configs[1],
      user: editor,
      overrideAccess: false,
      data: { paymentProofFormats: ['png', 'jpeg'] },
    })
    for (const format of ['png', 'jpeg'] as const) {
      const bytes = await sharp({
        create: { width: 2, height: 2, channels: 3, background: '#fff' },
      })
        .toFormat(format)
        .toBuffer()
      const image = await payload.create({
        collection: 'payment-proofs',
        depth: 0,
        user: owner,
        overrideAccess: false,
        data: {
          registration: remote.id,
          edition: otherEdition,
          user: owner.id,
          sequence: 1,
          status: 'submitted',
        },
        file: {
          data: bytes,
          size: bytes.length,
          mimetype: `image/${format}`,
          name: `proof.${format}`,
        },
      })
      proofs.push(image.id)
      expect(image.status).toBe('submitted')
      await payload.update({
        collection: 'payment-proofs',
        id: image.id,
        user: editor,
        overrideAccess: false,
        data: { status: 'rejected', reviewComment: 'Test replacement' },
      })
    }
  })

  it('serializes concurrent proof review and disallows bypassing transactions or changing scope', async () => {
    const existing = await payload.find({
      collection: 'registrations',
      depth: 0,
      user: other,
      overrideAccess: false,
      where: { and: [{ user: { equals: other.id } }, { edition: { equals: otherEdition } }] },
    })
    const reg = existing.docs[0]
    await payload.update({
      collection: 'conference-details',
      id: configs[1],
      user: editor,
      overrideAccess: false,
      data: { paymentProofFormats: ['pdf'] },
    })
    const pending = await upload(other, reg.id, { edition: otherEdition })
    await expect(
      payload.update({
        collection: 'payment-proofs',
        id: pending.id,
        user: editor,
        overrideAccess: false,
        data: { registration: registration.id, status: 'verified' },
      }),
    ).rejects.toThrow()
    const results = await Promise.allSettled(
      ['verified', 'rejected'].map((status) =>
        payload.update({
          collection: 'payment-proofs',
          id: pending.id,
          user: editor,
          overrideAccess: false,
          data: { status: status as 'verified' | 'rejected', reviewComment: 'Test review' },
        }),
      ),
    )
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    await expect(
      payload.create({
        collection: 'payment-proofs',
        user: other,
        overrideAccess: true,
        disableTransaction: true,
        data: {
          registration: reg.id,
          edition: otherEdition,
          user: other.id,
          sequence: 2,
          status: 'submitted',
        },
        file: { data: pdf, size: pdf.length, mimetype: 'application/pdf', name: 'bypass.pdf' },
      }),
    ).rejects.toThrow()
  })

  afterAll(async () => {
    for (const id of letters)
      await payload.delete({ collection: 'invitation-letters', id, overrideAccess: true })
    for (const id of proofs)
      await payload.delete({ collection: 'payment-proofs', id, overrideAccess: true })
    for (const id of registrations)
      await payload.delete({ collection: 'registrations', id, overrideAccess: true })
    for (const id of configs)
      await payload.delete({ collection: 'conference-details', id, overrideAccess: true })
    for (const id of [edition, otherEdition])
      await payload.delete({ collection: 'editions', id, overrideAccess: true })
    for (const id of users) await payload.delete({ collection: 'users', id, overrideAccess: true })
    vi.restoreAllMocks()
  })
})
