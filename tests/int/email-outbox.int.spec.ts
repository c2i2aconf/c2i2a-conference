import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { User } from '@/payload-types'
import {
  decryptEmailMessage,
  enqueueEmail,
  processEmailOutbox,
  requestManualEmailRetry,
} from '@/lib/email-outbox'
import { cleanupMagicLinks, createMagicLink } from '@/lib/magic-link'
import { withPayloadTransaction } from '@/lib/payload-transaction'
import {
  downgradeEmailOutboxTokenMarker,
  upgradeEmailOutboxTokenMarker,
} from '@/migrations/20260914_101006_email_outbox_token_marker'
import { GET as runWorker } from '@/app/internal/email-outbox/run/route'
import { POST as retryEmail } from '@/app/internal/email-outbox/[id]/retry/route'
import {
  DELETE as payloadDelete,
  GET as payloadREST,
  PATCH as payloadPatch,
  POST as payloadPost,
} from '@/app/(payload)/api/[...slug]/route'
import { POST as payloadGraphQL } from '@/app/(payload)/api/graphql/route'

let payload: Payload
let admin: User
let author: User
const jobs: number[] = []
const links: number[] = []
const users: number[] = []
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
const originalResendKey = process.env.RESEND_API_KEY
const originalCronSecret = process.env.CRON_SECRET

const adapter = () => payload.db as unknown as PostgresAdapter
const event = (label: string) => `outbox-test:${suffix}:${label}`

async function createJob(label: string, expiresAt?: string) {
  const eventKey = event(label)
  const job = await withPayloadTransaction(payload, {}, (req) => enqueueEmail({
    req, eventKey, eventType: 'submission-receipt', messageExpiresAt: expiresAt,
    message: {
      to: `private-${suffix}@example.com`, subject: `Private subject ${suffix}`,
      html: `<p>Private body ${suffix}</p>`,
    },
  }))
  jobs.push(job.id)
  return { eventKey, job }
}

async function rawJob(id: number) {
  return (await adapter().pool.query('SELECT * FROM email_outbox WHERE id = $1', [id])).rows[0] as Record<string, unknown>
}

async function waitForDatabaseCondition(
  check: () => Promise<boolean>,
  message: string,
  timeoutMs = 10_000,
  pollIntervalMs = 0,
) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await check()) return
    await new Promise<void>((resolve) => {
      if (pollIntervalMs > 0) setTimeout(resolve, pollIntervalMs)
      else setImmediate(resolve)
    })
  }
  throw new Error(message)
}

async function waitForBackendBlockedBy(backendPID: number, blockerPID: number, message: string) {
  await waitForDatabaseCondition(async () => {
    const result = await adapter().pool.query<{ blocked: boolean }>(
      `SELECT wait_event_type = 'Lock' AND $2::int = ANY(pg_blocking_pids($1)) AS blocked
         FROM pg_stat_activity WHERE pid = $1`,
      [backendPID, blockerPID],
    )
    return result.rows[0]?.blocked === true
  }, message)
}

async function createMagicJob(label: string, email = `${label}-${suffix}@example.com`, ttlMinutes = 30) {
  return withPayloadTransaction(payload, {}, async (req) => {
    const link = await createMagicLink({ email, locale: 'en', ttlMinutes, requestHeaders: new Headers(), req })
    links.push(link.id)
    const eventKey = event(label)
    const job = await enqueueEmail({
      req, eventKey, eventType: 'magic-link', magicLink: link.id, messageExpiresAt: link.expiresAt,
      message: { to: email, subject: 'Magic', html: `<a href="${link.url}">link</a>` },
    })
    jobs.push(job.id)
    return { email, eventKey, job, link }
  })
}

describe('durable email outbox', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    admin = await payload.create({ collection: 'users', overrideAccess: true, data: {
      email: `outbox-admin-${suffix}@example.com`, password: 'outbox-test-password', role: 'admin',
    } })
    author = await payload.create({ collection: 'users', overrideAccess: true, data: {
      email: `outbox-author-${suffix}@example.com`, password: 'outbox-test-password', role: 'author',
    } })
    users.push(admin.id, author.id)
    process.env.RESEND_API_KEY = 'test-only-resend-key'
  })

  it('rolls back atomically and delivers only after commit', async () => {
    const rolledBackKey = event('rollback')
    await expect(withPayloadTransaction(payload, {}, async (req) => {
      await enqueueEmail({
        req, eventKey: rolledBackKey, eventType: 'submission-receipt',
        message: { to: 'rollback@example.com', subject: 'Rollback', html: '<p>rollback</p>' },
      })
      throw new Error('business mutation failed')
    })).rejects.toThrow('business mutation failed')
    expect((await payload.count({ collection: 'email-outbox', overrideAccess: true, where: { eventKey: { equals: rolledBackKey } } })).totalDocs).toBe(0)

    const fetchMock = vi.fn(async () => Response.json({ id: 'provider-after-commit' }))
    const committed = await createJob('after-commit')
    expect(fetchMock).not.toHaveBeenCalled()
    await processEmailOutbox(payload, { eventKey: committed.eventKey, fetchImpl: fetchMock })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await rawJob(committed.job.id)).toMatchObject({ status: 'sent', encrypted_message: null })

    const invisibleKey = event('uncommitted-invisible')
    let releaseTransaction!: () => void
    let enqueued!: () => void
    const transactionReady = new Promise<void>((resolve) => { enqueued = resolve })
    const release = new Promise<void>((resolve) => { releaseTransaction = resolve })
    const transaction = withPayloadTransaction(payload, {}, async (req) => {
      const job = await enqueueEmail({
        req, eventKey: invisibleKey, eventType: 'submission-receipt',
        message: { to: 'invisible@example.com', subject: 'Invisible', html: '<p>Invisible</p>' },
      })
      jobs.push(job.id)
      enqueued()
      await release
    })
    await transactionReady
    const invisibleFetch = vi.fn(async () => Response.json({ id: 'after-real-commit' }))
    let claimReached!: () => void
    let continueWorker!: () => void
    const reachedClaim = new Promise<void>((resolve) => { claimReached = resolve })
    const claimGate = new Promise<void>((resolve) => { continueWorker = resolve })
    let heldFirstClaim = false
    const worker = processEmailOutbox(payload, {
      eventKey: invisibleKey,
      fetchImpl: invisibleFetch,
      afterClaimAttempt: async (jobID) => {
        if (jobID === null && !heldFirstClaim) {
          heldFirstClaim = true
          claimReached()
          await claimGate
        }
      },
    })
    await reachedClaim
    expect(invisibleFetch).not.toHaveBeenCalled()
    releaseTransaction()
    await transaction
    continueWorker()
    await worker
    expect(invisibleFetch).toHaveBeenCalledTimes(1)
    expect(await rawJob(jobs.at(-1)!)).toMatchObject({ status: 'sent' })
  })

  it('deduplicates stable events and persists no plaintext PII or content', async () => {
    const first = await createJob('dedupe')
    const duplicate = await withPayloadTransaction(payload, {}, (req) => enqueueEmail({
      req, eventKey: first.eventKey, eventType: 'submission-receipt',
      message: { to: 'different@example.com', subject: 'Different', html: '<p>Different</p>' },
    }))
    expect(duplicate.id).toBe(first.job.id)
    const raw = await rawJob(first.job.id)
    expect(String(raw.encrypted_message)).not.toContain(`private-${suffix}@example.com`)
    expect(String(raw.encrypted_message)).not.toContain(`Private body ${suffix}`)
    expect(decryptEmailMessage(first.eventKey, String(raw.encrypted_message)).to).toBe(`private-${suffix}@example.com`)
    await adapter().pool.query(`UPDATE email_outbox SET status = 'failed' WHERE id = $1`, [first.job.id])
  })

  it('safely upgrades populated first-schema token jobs', async () => {
    await withPayloadTransaction(payload, {}, async (req) => {
      const transactionID = await req.transactionID
      const transaction = transactionID && adapter().sessions[transactionID]?.db
      if (!transaction) throw new Error('Expected a migration test transaction.')
      await transaction.execute(sql`
        CREATE TEMP TABLE magic_links (
          id integer PRIMARY KEY, consumed_at timestamptz, expires_at timestamptz NOT NULL
        ) ON COMMIT DROP;
        CREATE TEMP TABLE email_outbox (
          id integer PRIMARY KEY, event_key varchar NOT NULL, event_type varchar NOT NULL,
          status varchar NOT NULL, encrypted_message varchar, message_expires_at timestamptz,
          magic_link_id integer, cancelled_at timestamptz, lease_token varchar,
          lease_expires_at timestamptz, updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
        ) ON COMMIT DROP;
        INSERT INTO magic_links (id, expires_at) VALUES
          (101, clock_timestamp() + INTERVAL '30 minutes'),
          (102, clock_timestamp() + INTERVAL '7 days');
        INSERT INTO email_outbox (
          id, event_key, event_type, status, encrypted_message, message_expires_at, magic_link_id
        ) VALUES
          (1, 'magic-valid', 'magic-link', 'pending', 'cipher-1', clock_timestamp() + INTERVAL '30 minutes', 101),
          (2, 'registration-valid', 'registration-confirmation', 'pending', 'cipher-2', clock_timestamp() + INTERVAL '7 days', 102),
          (3, 'ordinary', 'submission-receipt', 'pending', 'cipher-3', NULL, NULL),
          (4, 'magic-missing', 'magic-link', 'failed', 'cipher-4', clock_timestamp() + INTERVAL '30 minutes', NULL),
          (5, 'registration-missing', 'registration-confirmation', 'pending', 'cipher-5', clock_timestamp() + INTERVAL '7 days', NULL);
      `)
      await upgradeEmailOutboxTokenMarker(transaction)
      const result = await transaction.execute(sql`
        SELECT event_key, requires_magic_link, status, encrypted_message
          FROM email_outbox ORDER BY id
      `)
      const upgraded = Array.isArray(result)
        ? result
        : ((result as { rows?: Array<Record<string, unknown>> }).rows ?? [])
      expect(upgraded).toEqual([
        expect.objectContaining({ event_key: 'magic-valid', requires_magic_link: true, status: 'pending', encrypted_message: 'cipher-1' }),
        expect.objectContaining({ event_key: 'registration-valid', requires_magic_link: true, status: 'pending', encrypted_message: 'cipher-2' }),
        expect.objectContaining({ event_key: 'ordinary', requires_magic_link: false, status: 'pending', encrypted_message: 'cipher-3' }),
        expect.objectContaining({ event_key: 'magic-missing', requires_magic_link: true, status: 'cancelled', encrypted_message: null }),
        expect.objectContaining({ event_key: 'registration-missing', requires_magic_link: true, status: 'cancelled', encrypted_message: null }),
      ])
      await downgradeEmailOutboxTokenMarker(transaction)
      const marker = await transaction.execute(sql`
        SELECT count(*)::int AS count FROM pg_attribute
         WHERE attrelid = 'email_outbox'::regclass AND attname = 'requires_magic_link' AND NOT attisdropped
      `)
      const markerRows = Array.isArray(marker)
        ? marker
        : (((marker as unknown) as { rows?: Array<{ count: number }> }).rows ?? [])
      expect(Number((markerRows[0] as { count: number }).count)).toBe(0)
    })
  })

  it('claims once across concurrent workers and recovers expired leases', async () => {
    const concurrent = await createJob('concurrent')
    const fetchMock = vi.fn(async () => Response.json({ id: 'one-provider-message' }))
    await Promise.all([
      processEmailOutbox(payload, { eventKey: concurrent.eventKey, fetchImpl: fetchMock }),
      processEmailOutbox(payload, { eventKey: concurrent.eventKey, fetchImpl: fetchMock }),
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const stale = await createJob('stale-lease')
    await adapter().pool.query(
      `UPDATE email_outbox SET status = 'processing', attempts = 1, lease_token = 'expired-worker',
       lease_expires_at = $1, first_attempt_at = $2 WHERE id = $3`,
      [new Date(Date.now() - 60_000), new Date(), stale.job.id],
    )
    await processEmailOutbox(payload, { eventKey: stale.eventKey, fetchImpl: async () => Response.json({ id: 'recovered' }) })
    expect(await rawJob(stale.job.id)).toMatchObject({ status: 'sent', attempts: '2' })
    expect((await adapter().pool.query(
      `UPDATE email_outbox SET status = 'failed' WHERE id = $1 AND lease_token = 'expired-worker'`, [stale.job.id],
    )).rowCount).toBe(0)
  })

  it('claims each batch job just-in-time and fences a real stale worker completion', async () => {
    const first = await createJob('serial-first')
    const second = await createJob('serial-second')
    let releaseFirst!: () => void
    let firstStarted!: () => void
    const started = new Promise<void>((resolve) => { firstStarted = resolve })
    const blocked = new Promise<Response>((resolve) => { releaseFirst = () => resolve(Response.json({ id: 'first' })) })
    const firstFetch = vi.fn(async () => {
      firstStarted()
      return blocked
    })
    const workerOne = processEmailOutbox(payload, {
      limit: 2, eventKeyPrefix: event('serial-'), fetchImpl: firstFetch,
    })
    await started
    expect(await rawJob(second.job.id)).toMatchObject({ status: 'pending', attempts: '0' })
    const secondFetch = vi.fn(async () => Response.json({ id: 'second' }))
    await processEmailOutbox(payload, { eventKey: second.eventKey, limit: 1, fetchImpl: secondFetch })
    expect(secondFetch).toHaveBeenCalledTimes(1)
    releaseFirst()
    await workerOne
    expect(firstFetch).toHaveBeenCalledTimes(1)
    expect(await rawJob(first.job.id)).toMatchObject({ status: 'sent' })
    expect(await rawJob(second.job.id)).toMatchObject({ status: 'sent' })

    const stale = await createJob('real-stale-completion')
    let releaseStale!: () => void
    let staleStarted!: () => void
    const staleReady = new Promise<void>((resolve) => { staleStarted = resolve })
    const staleResponse = new Promise<Response>((resolve) => {
      releaseStale = () => resolve(Response.json({ id: 'stale-provider-result' }))
    })
    const staleWorker = processEmailOutbox(payload, {
      eventKey: stale.eventKey,
      fetchImpl: async () => { staleStarted(); return staleResponse },
    })
    await staleReady
    await adapter().pool.query(
      `UPDATE email_outbox SET lease_expires_at = clock_timestamp() - INTERVAL '1 second' WHERE id = $1`,
      [stale.job.id],
    )
    await processEmailOutbox(payload, {
      eventKey: stale.eventKey,
      fetchImpl: async () => Response.json({ id: 'new-owner-result' }),
    })
    releaseStale()
    expect(await staleWorker).toMatchObject({ sent: 0 })
    expect(await rawJob(stale.job.id)).toMatchObject({ status: 'sent', provider_message_id: 'new-owner-result' })
  })

  it('uses fresh database deadlines immediately before transport', async () => {
    const crossedWindow = await createJob('pre-send-window-crossing')
    let validationReached!: () => void
    let releaseValidation!: () => void
    const reached = new Promise<void>((resolve) => { validationReached = resolve })
    const gate = new Promise<void>((resolve) => { releaseValidation = resolve })
    let eligibilityPID!: number
    let eligibilityStarted!: () => void
    const eligibilityAttempted = new Promise<void>((resolve) => { eligibilityStarted = resolve })
    const fetchMock = vi.fn()
    const worker = processEmailOutbox(payload, {
      eventKey: crossedWindow.eventKey,
      fetchImpl: fetchMock as typeof fetch,
      beforeSendEligibility: async () => {
        validationReached()
        await gate
      },
      beforeEligibilityLock: async (_jobID, backendPID) => {
        eligibilityPID = backendPID
        eligibilityStarted()
      },
    })
    await reached
    const lockClient = await adapter().pool.connect()
    await lockClient.query('BEGIN')
    const blockerPID = Number((await lockClient.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0].pid)
    await lockClient.query('SELECT id FROM email_outbox WHERE id = $1 FOR UPDATE', [crossedWindow.job.id])
    await lockClient.query(
      `UPDATE email_outbox SET first_attempt_at = clock_timestamp() - INTERVAL '24 hours 1 second' WHERE id = $1`,
      [crossedWindow.job.id],
    )
    releaseValidation()
    await eligibilityAttempted
    await waitForBackendBlockedBy(
      eligibilityPID, blockerPID, 'The real pre-send eligibility query did not block on its outbox row.',
    )
    await lockClient.query('COMMIT')
    lockClient.release()
    await worker
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await rawJob(crossedWindow.job.id)).toMatchObject({
      status: 'ambiguous', last_error_code: 'idempotency_window_expired',
    })

    const delayedAfterValidation = await createJob('pre-transport-deadline')
    let monotonic = 0
    const delayedFetch = vi.fn()
    await processEmailOutbox(payload, {
      eventKey: delayedAfterValidation.eventKey,
      fetchImpl: delayedFetch as typeof fetch,
      monotonicNow: () => monotonic,
      beforeTransport: async () => { monotonic = 60_000 },
    })
    expect(delayedFetch).not.toHaveBeenCalled()
  })

  it('rejects stale success after delayed response-body handling', async () => {
    const delayedBody = await createJob('delayed-response-body')
    let bodyReached!: () => void
    let releaseBody!: () => void
    const bodyStarted = new Promise<void>((resolve) => { bodyReached = resolve })
    const bodyGate = new Promise<void>((resolve) => { releaseBody = resolve })
    const bodyWorker = processEmailOutbox(payload, {
      eventKey: delayedBody.eventKey,
      fetchImpl: async () => ({
        ok: true,
        json: async () => {
          bodyReached()
          await bodyGate
          return { id: 'body-delayed-provider-result' }
        },
      }) as Response,
    })
    await bodyStarted
    await adapter().pool.query(
      `UPDATE email_outbox SET lease_expires_at = clock_timestamp() - INTERVAL '1 second' WHERE id = $1`,
      [delayedBody.job.id],
    )
    releaseBody()
    expect(await bodyWorker).toMatchObject({ sent: 0 })
    expect(await rawJob(delayedBody.job.id)).toMatchObject({ status: 'ambiguous' })
  })

  it('rechecks a naturally expired lease after waiting on the outcome row lock', async () => {
    const delayedPersist = await createJob('naturally-expired-outcome-lock')
    let persistReached!: () => void
    let releasePersist!: () => void
    const persistStarted = new Promise<void>((resolve) => { persistReached = resolve })
    const persistGate = new Promise<void>((resolve) => { releasePersist = resolve })
    let outcomePID!: number
    let outcomeLockStarted!: () => void
    const outcomeLockAttempted = new Promise<void>((resolve) => { outcomeLockStarted = resolve })
    const persistWorker = processEmailOutbox(payload, {
      eventKey: delayedPersist.eventKey,
      fetchImpl: async () => Response.json({ id: 'persist-delayed-provider-result' }),
      beforeOutcomePersist: async () => {
        persistReached()
        await persistGate
      },
      beforeOutcomeLock: async (_jobID, backendPID) => {
        outcomePID = backendPID
        outcomeLockStarted()
      },
    })
    await persistStarted
    const initialLease = await adapter().pool.query<{
      db_now: Date | string
      lease_expires_at: Date | string
    }>(
      `SELECT clock_timestamp() AS db_now, lease_expires_at
         FROM email_outbox WHERE id = $1`,
      [delayedPersist.job.id],
    )
    const originalLeaseDeadline = new Date(initialLease.rows[0].lease_expires_at)
    expect(originalLeaseDeadline.getTime()).toBeGreaterThan(
      new Date(initialLease.rows[0].db_now).getTime(),
    )
    const lockClient = await adapter().pool.connect()
    await lockClient.query('BEGIN')
    const blockerPID = Number((await lockClient.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0].pid)
    await lockClient.query('SELECT id FROM email_outbox WHERE id = $1 FOR UPDATE', [delayedPersist.job.id])
    releasePersist()
    await outcomeLockAttempted
    let interleavingError: unknown
    try {
      await waitForBackendBlockedBy(
        outcomePID, blockerPID, 'The real outcome transaction did not block on its outbox row.',
      )
      await waitForDatabaseCondition(async () => {
        const result = await adapter().pool.query<{ expired: boolean }>(
          'SELECT clock_timestamp() >= $1::timestamptz AS expired',
          [originalLeaseDeadline],
        )
        return result.rows[0]?.expired === true
      }, 'Database time did not cross the original lease deadline.', 45_000, 50)
    } catch (error) {
      interleavingError = error
    } finally {
      await lockClient.query('COMMIT')
      lockClient.release()
    }
    const result = await persistWorker
    if (interleavingError) throw interleavingError
    expect(result).toMatchObject({ sent: 0 })
    expect(await rawJob(delayedPersist.job.id)).toMatchObject({
      status: 'ambiguous', provider_message_id: null,
    })
  })

  it('retries temporary failures six times with identical payload and idempotency', async () => {
    const retrying = await createJob('retry-limit')
    const calls: Array<{ body: string | null; key: string | null }> = []
    const fetchMock = (async (_url: string | URL | Request, init?: RequestInit) => {
      calls.push({ body: String(init?.body ?? ''), key: new Headers(init?.headers).get('idempotency-key') })
      return new Response('', { status: 503 })
    }) as typeof fetch
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await processEmailOutbox(payload, {
        eventKey: retrying.eventKey, fetchImpl: fetchMock,
        random: () => 0.5,
      })
      if (attempt < 5) {
        await adapter().pool.query(
          `UPDATE email_outbox SET next_attempt_at = clock_timestamp() - INTERVAL '1 second' WHERE id = $1`,
          [retrying.job.id],
        )
      }
    }
    expect(calls).toHaveLength(6)
    expect(new Set(calls.map(({ body }) => body)).size).toBe(1)
    expect(new Set(calls.map(({ key }) => key)).size).toBe(1)
    expect(await rawJob(retrying.job.id)).toMatchObject({ status: 'failed', attempts: '6' })
  })

  it('respects Retry-After and does not claim without provider configuration', async () => {
    const retrying = await createJob('retry-after')
    const now = new Date('2031-01-01T00:00:00.000Z')
    await processEmailOutbox(payload, {
      eventKey: retrying.eventKey, now, random: () => 0.5,
      fetchImpl: async () => new Response('', { status: 429, headers: { 'Retry-After': '120' } }),
    })
    expect(new Date(String((await rawJob(retrying.job.id)).next_attempt_at)).getTime()).toBe(now.getTime() + 120_000)

    const completedLater = await createJob('retry-after-completion')
    let clockNow = new Date('2031-02-01T00:00:00.000Z')
    await processEmailOutbox(payload, {
      eventKey: completedLater.eventKey, clock: () => clockNow,
      fetchImpl: async () => {
        clockNow = new Date(clockNow.getTime() + 5_000)
        return new Response('', { status: 429, headers: { 'Retry-After': '120' } })
      },
    })
    expect(new Date(String((await rawJob(completedLater.job.id)).next_attempt_at)).getTime())
      .toBe(clockNow.getTime() + 120_000)

    const unconfigured = await createJob('missing-provider')
    delete process.env.RESEND_API_KEY
    expect(await processEmailOutbox(payload, { eventKey: unconfigured.eventKey })).toMatchObject({ unavailable: true, claimed: 0 })
    expect(await rawJob(unconfigured.job.id)).toMatchObject({ status: 'pending', attempts: '0' })
    process.env.RESEND_API_KEY = 'test-only-resend-key'

    const invalid = await createJob('permanent-invalid')
    await processEmailOutbox(payload, {
      eventKey: invalid.eventKey,
      fetchImpl: async () => new Response('', { status: 422 }),
    })
    expect(await rawJob(invalid.job.id)).toMatchObject({ status: 'failed', attempts: '1' })
  })

  it('quarantines ambiguity after 24 hours and detects ciphertext tampering', async () => {
    const ambiguous = await createJob('ambiguous')
    await adapter().pool.query(
      `UPDATE email_outbox SET status = 'retrying', attempts = 1, first_attempt_at = $1,
       next_attempt_at = $2 WHERE id = $3`,
      [new Date(Date.now() - 25 * 60 * 60_000), new Date(Date.now() - 1_000), ambiguous.job.id],
    )
    const fetchMock = vi.fn()
    await processEmailOutbox(payload, { eventKey: ambiguous.eventKey, fetchImpl: fetchMock as typeof fetch })
    expect(fetchMock).not.toHaveBeenCalled()
    expect((await rawJob(ambiguous.job.id)).status).toBe('ambiguous')

    const manual = await createJob('manual-window')
    const firstAttempt = new Date(Date.now() - 24 * 60 * 60_000 + 5_000)
    await adapter().pool.query(
      `UPDATE email_outbox SET status = 'failed', attempts = 1, first_attempt_at = $1 WHERE id = $2`,
      [firstAttempt, manual.job.id],
    )
    await requestManualEmailRetry(payload, {
      id: manual.job.id, userID: admin.id, reason: 'Verified temporary failure',
    })
    await adapter().pool.query(
      `UPDATE email_outbox SET first_attempt_at = clock_timestamp() - INTERVAL '24 hours 1 second' WHERE id = $1`,
      [manual.job.id],
    )
    await processEmailOutbox(payload, {
      eventKey: manual.eventKey,
      fetchImpl: fetchMock as typeof fetch,
    })
    expect(await rawJob(manual.job.id)).toMatchObject({ status: 'ambiguous', last_error_code: 'idempotency_window_expired' })

    const pending = await createJob('pending-window')
    await adapter().pool.query(
      `UPDATE email_outbox SET attempts = 1, first_attempt_at = $1 WHERE id = $2`,
      [new Date(Date.now() - 24 * 60 * 60_000 - 1_000), pending.job.id],
    )
    await processEmailOutbox(payload, {
      eventKey: pending.eventKey,
      fetchImpl: fetchMock as typeof fetch,
    })
    expect(await rawJob(pending.job.id)).toMatchObject({ status: 'ambiguous' })

    for (const part of ['data', 'tag', 'aad'] as const) {
      const tampered = await createJob(`tampered-${part}`)
      const raw = await rawJob(tampered.job.id)
      const envelope = JSON.parse(String(raw.encrypted_message)) as { v: number; iv: string; tag: string; data: string }
      if (part === 'aad') {
        await adapter().pool.query(`UPDATE email_outbox SET event_key = event_key || ':altered' WHERE id = $1`, [tampered.job.id])
        tampered.eventKey += ':altered'
      } else {
        const bytes = Buffer.from(envelope[part], 'base64')
        bytes[0] ^= 1
        envelope[part] = bytes.toString('base64')
        await adapter().pool.query(`UPDATE email_outbox SET encrypted_message = $1 WHERE id = $2`, [JSON.stringify(envelope), tampered.job.id])
      }
      await processEmailOutbox(payload, { eventKey: tampered.eventKey, fetchImpl: fetchMock as typeof fetch })
      expect(await rawJob(tampered.job.id)).toMatchObject({ status: 'failed', last_error_code: 'decrypt_failed' })
    }
  })

  it('quarantines an expired sixth-attempt lease without resending', async () => {
    const crashed = await createJob('sixth-crash')
    await adapter().pool.query(
      `UPDATE email_outbox SET status = 'processing', attempts = 6,
       first_attempt_at = clock_timestamp() - INTERVAL '1 minute',
       lease_token = 'dead-sixth-worker', lease_expires_at = clock_timestamp() - INTERVAL '1 second'
       WHERE id = $1`,
      [crashed.job.id],
    )
    const fetchMock = vi.fn()
    await processEmailOutbox(payload, { eventKey: crashed.eventKey, fetchImpl: fetchMock as typeof fetch })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await rawJob(crashed.job.id)).toMatchObject({ status: 'ambiguous', last_error_code: 'max_attempt_lease_expired' })
  })

  it('cancels and scrubs expired and superseded magic-link jobs', async () => {
    const expired = await createJob('expired', new Date(Date.now() - 1_000).toISOString())
    await processEmailOutbox(payload, { eventKey: expired.eventKey, fetchImpl: vi.fn() as typeof fetch })
    expect(await rawJob(expired.job.id)).toMatchObject({ status: 'cancelled', encrypted_message: null })

    const email = `superseded-${suffix}@example.com`
    const first = await withPayloadTransaction(payload, {}, async (req) => {
      const link = await createMagicLink({ email, locale: 'en', ttlMinutes: 30, requestHeaders: new Headers(), req })
      links.push(link.id)
      const job = await enqueueEmail({
        req, eventKey: event('magic-first'), eventType: 'magic-link', magicLink: link.id,
        messageExpiresAt: link.expiresAt,
        message: { to: email, subject: 'Magic', html: `<a href="${link.url}">link</a>` },
      })
      jobs.push(job.id)
      return job
    })
    await withPayloadTransaction(payload, {}, async (req) => {
      const link = await createMagicLink({ email, locale: 'en', ttlMinutes: 30, requestHeaders: new Headers(), req })
      links.push(link.id)
    })
    expect(await rawJob(first.id)).toMatchObject({ status: 'cancelled', encrypted_message: null })

    const failedExpired = await createMagicJob('failed-expired-token')
    await adapter().pool.query(`UPDATE email_outbox SET status = 'failed' WHERE id = $1`, [failedExpired.job.id])
    await adapter().pool.query(`UPDATE magic_links SET expires_at = $1 WHERE id = $2`, [new Date(Date.now() - 1_000), failedExpired.link.id])
    await processEmailOutbox(payload, { eventKey: failedExpired.eventKey, fetchImpl: vi.fn() as typeof fetch })
    expect(await rawJob(failedExpired.job.id)).toMatchObject({ status: 'cancelled', encrypted_message: null })

    const ambiguousSuperseded = await createMagicJob('ambiguous-superseded-token')
    await adapter().pool.query(`UPDATE email_outbox SET status = 'ambiguous' WHERE id = $1`, [ambiguousSuperseded.job.id])
    await withPayloadTransaction(payload, {}, async (req) => {
      const replacement = await createMagicLink({
        email: ambiguousSuperseded.email, locale: 'en', ttlMinutes: 30,
        requestHeaders: new Headers(), req,
      })
      links.push(replacement.id)
    })
    expect(await rawJob(ambiguousSuperseded.job.id)).toMatchObject({ status: 'cancelled', encrypted_message: null })

    for (const state of ['consumed', 'expired'] as const) {
      const forbidden = await createMagicJob(`manual-${state}`)
      await adapter().pool.query(`UPDATE email_outbox SET status = 'failed' WHERE id = $1`, [forbidden.job.id])
      await adapter().pool.query(
        state === 'consumed'
          ? `UPDATE magic_links SET consumed_at = NOW() WHERE id = $1`
          : `UPDATE magic_links SET expires_at = NOW() - INTERVAL '1 second' WHERE id = $1`,
        [forbidden.link.id],
      )
      await expect(requestManualEmailRetry(payload, {
        id: forbidden.job.id, userID: admin.id, reason: 'must be rejected',
      })).rejects.toThrow(/not eligible/i)
    }

    const missingToken = await createMagicJob('missing-token-record')
    await payload.delete({ collection: 'magic-links', id: missingToken.link.id, overrideAccess: true })
    links.splice(links.indexOf(missingToken.link.id), 1)
    await adapter().pool.query(`UPDATE email_outbox SET status = 'failed' WHERE id = $1`, [missingToken.job.id])
    await expect(requestManualEmailRetry(payload, {
      id: missingToken.job.id, userID: admin.id, reason: 'missing tokens are never retryable',
    })).rejects.toThrow(/not eligible/i)
    const missingFetch = vi.fn()
    await processEmailOutbox(payload, {
      eventKey: missingToken.eventKey, fetchImpl: missingFetch as typeof fetch,
    })
    expect(missingFetch).not.toHaveBeenCalled()
    expect(await rawJob(missingToken.job.id)).toMatchObject({
      requires_magic_link: true, magic_link_id: null, status: 'cancelled', encrypted_message: null,
    })

    const retainedConsumed = await createMagicJob('retained-consumed-token')
    const cleanupAt = Date.now()
    await adapter().pool.query(
      `UPDATE magic_links SET consumed_at = $1 WHERE id = $2`,
      [new Date(cleanupAt - 24 * 60 * 60_000 - 1_000), retainedConsumed.link.id],
    )
    await cleanupMagicLinks(payload, cleanupAt)
    const remainingLinks = await payload.find({
      collection: 'magic-links', depth: 0, pagination: false, overrideAccess: true,
      where: { id: { in: links } },
    })
    links.splice(0, links.length, ...remainingLinks.docs.map((link) => link.id))
    expect(await rawJob(retainedConsumed.job.id)).toMatchObject({ status: 'cancelled', encrypted_message: null })
  })

  it('serializes concurrent magic-link issuance to one current token', async () => {
    const email = `concurrent-magic-${suffix}@example.com`
    const issue = (
      label: string,
      hooks: {
        beforeLock?: (backendPID: number) => Promise<void>
        afterLock?: (backendPID: number) => Promise<void>
      } = {},
    ) => withPayloadTransaction(payload, {}, async (req) => {
      const link = await createMagicLink({
        email, locale: 'en', ttlMinutes: 30, requestHeaders: new Headers(), req, ...hooks,
      })
      links.push(link.id)
      const job = await enqueueEmail({
        req, eventKey: event(label), eventType: 'magic-link', magicLink: link.id,
        messageExpiresAt: link.expiresAt,
        message: { to: email, subject: 'Concurrent magic', html: `<a href="${link.url}">link</a>` },
      })
      jobs.push(job.id)
      return { job, link }
    })
    let firstPID!: number
    let secondPID!: number
    let firstLocked!: () => void
    let releaseFirst!: () => void
    const firstHasLock = new Promise<void>((resolve) => { firstLocked = resolve })
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve })
    const firstIssue = issue('concurrent-magic-a', {
      afterLock: async (backendPID) => { firstPID = backendPID; firstLocked(); await firstGate },
    })
    await firstHasLock
    let secondStarted!: () => void
    const secondAtLock = new Promise<void>((resolve) => { secondStarted = resolve })
    const secondIssue = issue('concurrent-magic-b', {
      beforeLock: async (backendPID) => { secondPID = backendPID; secondStarted() },
    })
    await secondAtLock
    await waitForBackendBlockedBy(
      secondPID, firstPID, 'The second magic-link transaction did not wait on the first transaction.',
    )
    releaseFirst()
    const issued = await Promise.all([firstIssue, secondIssue])
    const current = await payload.find({
      collection: 'magic-links', depth: 0, pagination: false, overrideAccess: true,
      where: { and: [{ email: { equals: email } }, { consumedAt: { exists: false } }] },
    })
    expect(current.docs).toHaveLength(1)
    const currentID = current.docs[0].id
    const obsolete = issued.find(({ link }) => link.id !== currentID)!
    expect(await rawJob(obsolete.job.id)).toMatchObject({ status: 'cancelled', encrypted_message: null })
  })

  it('rechecks token supersession between worker iterations', async () => {
    const first = await createJob('iteration-first')
    const token = await createMagicJob('iteration-token')
    const fetchMock = vi.fn(async () => {
      await withPayloadTransaction(payload, {}, async (req) => {
        const replacement = await createMagicLink({
          email: token.email, locale: 'en', ttlMinutes: 30, requestHeaders: new Headers(), req,
        })
        links.push(replacement.id)
      })
      return Response.json({ id: 'iteration-first-result' })
    })
    await processEmailOutbox(payload, {
      limit: 2, eventKeyPrefix: event('iteration-'), fetchImpl: fetchMock,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await rawJob(first.job.id)).toMatchObject({ status: 'sent' })
    expect(await rawJob(token.job.id)).toMatchObject({ status: 'cancelled', encrypted_message: null })
  })

  it('shows admin metadata only and secures generic and dedicated operations', async () => {
    const secured = await createJob('authorization')
    const visible = await payload.findByID({ collection: 'email-outbox', id: secured.job.id, user: admin, overrideAccess: false })
    expect(visible.encryptedMessage).toBeUndefined()
    const privilegedLocal = await payload.findByID({
      collection: 'email-outbox', id: secured.job.id, overrideAccess: true,
    })
    expect(privilegedLocal.id).toBe(secured.job.id)
    expect(privilegedLocal.encryptedMessage).toBeUndefined()
    await expect(payload.findByID({ collection: 'email-outbox', id: secured.job.id, user: author, overrideAccess: false })).rejects.toThrow()
    await expect(payload.create({
      collection: 'email-outbox', user: admin, overrideAccess: false,
      data: { eventKey: event('forged'), eventType: 'submission-receipt', status: 'pending', attempts: 0, nextAttemptAt: new Date().toISOString(), providerIdempotencyKey: event('forged-id'), requiresMagicLink: false },
    })).rejects.toThrow()

    process.env.CRON_SECRET = 'test-cron-secret'
    expect((await runWorker(new Request('http://localhost/internal/email-outbox/run'))).status).toBe(401)
    delete process.env.RESEND_API_KEY
    expect((await runWorker(new Request('http://localhost/internal/email-outbox/run', { headers: { Authorization: 'Bearer test-cron-secret' } }))).status).toBe(200)
    process.env.RESEND_API_KEY = 'test-only-resend-key'

    await adapter().pool.query(`UPDATE email_outbox SET status = 'failed' WHERE id = $1`, [secured.job.id])
    const login = await payload.login({ collection: 'users', data: { email: admin.email, password: 'outbox-test-password' } })
    const adminHeaders = { Authorization: `JWT ${login.token}` }
    for (const response of [
      await payloadPost(new Request('http://localhost/api/email-outbox', {
        method: 'POST', headers: { ...adminHeaders, 'content-type': 'application/json' },
        body: JSON.stringify({ eventKey: event('api-forged') }),
      }), { params: Promise.resolve({ slug: ['email-outbox'] }) }),
      await payloadPatch(new Request(`http://localhost/api/email-outbox/${secured.job.id}`, {
        method: 'PATCH', headers: { ...adminHeaders, 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      }), { params: Promise.resolve({ slug: ['email-outbox', String(secured.job.id)] }) }),
      await payloadDelete(new Request(`http://localhost/api/email-outbox/${secured.job.id}`, {
        method: 'DELETE', headers: adminHeaders,
      }), { params: Promise.resolve({ slug: ['email-outbox', String(secured.job.id)] }) }),
    ]) expect(response.status).toBeGreaterThanOrEqual(400)
    const rest = await payloadREST(
      new Request(`http://localhost/api/email-outbox/${secured.job.id}`, { headers: adminHeaders }),
      { params: Promise.resolve({ slug: ['email-outbox', String(secured.job.id)] }) },
    )
    const restBody = JSON.stringify(await rest.json())
    expect(rest.status).toBe(200)
    expect(restBody).toContain(secured.eventKey)
    expect(restBody).not.toContain('encryptedMessage')
    expect(restBody).not.toContain(`private-${suffix}@example.com`)
    const graph = await payloadGraphQL(new Request('http://localhost/api/graphql', {
      method: 'POST', headers: { ...adminHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ query: `query { EmailOutbox(id: ${secured.job.id}) { id eventKey status encryptedMessage } }` }),
    }))
    const graphBody = JSON.stringify(await graph.json())
    expect(graph.status).toBe(200)
    const graphResult = JSON.parse(graphBody) as {
      data?: { EmailOutbox?: { id?: number; eventKey?: string; status?: string; encryptedMessage?: string | null } }
      errors?: unknown
    }
    expect(graphResult.errors).toBeUndefined()
    expect(graphResult.data?.EmailOutbox).toMatchObject({ id: secured.job.id, eventKey: secured.eventKey })
    expect(graphResult.data?.EmailOutbox?.encryptedMessage).toBeNull()
    expect(graphBody).not.toContain(`private-${suffix}@example.com`)
    expect(graphBody).not.toContain(String((await rawJob(secured.job.id)).encrypted_message))

    const authorLogin = await payload.login({ collection: 'users', data: { email: author.email, password: 'outbox-test-password' } })
    expect((await retryEmail(new Request(`http://localhost/internal/email-outbox/${secured.job.id}/retry`, {
      method: 'POST', headers: { Authorization: `JWT ${authorLogin.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'forged' }),
    }), { params: Promise.resolve({ id: String(secured.job.id) }) })).status).toBe(403)
    const response = await retryEmail(new Request(`http://localhost/internal/email-outbox/${secured.job.id}/retry`, {
      method: 'POST', headers: { Authorization: `JWT ${login.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'Administrator verified the transient provider issue.' }),
    }), { params: Promise.resolve({ id: String(secured.job.id) }) })
    expect(response.status).toBe(202)
    expect(await rawJob(secured.job.id)).toMatchObject({ status: 'pending', manual_retry_by_id: admin.id })
  })

  afterAll(async () => {
    process.env.RESEND_API_KEY = originalResendKey
    process.env.CRON_SECRET = originalCronSecret
    for (const id of jobs.reverse()) await payload.delete({ collection: 'email-outbox', id, overrideAccess: true })
    for (const id of links.reverse()) await payload.delete({ collection: 'magic-links', id, overrideAccess: true })
    for (const id of users.reverse()) await payload.delete({ collection: 'users', id, overrideAccess: true })
  })
})
