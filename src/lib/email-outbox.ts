import crypto from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'

export const EMAIL_OUTBOX_MAX_ATTEMPTS = 6
export const EMAIL_OUTBOX_LEASE_MS = 30_000
export const EMAIL_OUTBOX_PROVIDER_TIMEOUT_MS = 10_000
export const PROVIDER_IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60_000

const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 4 * 60 * 60_000]

export type EmailEventType =
  | 'registration-confirmation'
  | 'submission-receipt'
  | 'magic-link'
  | 'submission-decision'
  | 'revision-request'

export type EmailMessage = { from?: string; to: string; subject: string; html: string }

type EnqueueEmailOptions = {
  req: PayloadRequest
  eventKey: string
  eventType: EmailEventType
  message: EmailMessage
  messageExpiresAt?: string
  magicLink?: number
}

type ClaimedJob = {
  id: number
  event_key: string
  attempts: number
  encrypted_message: string
  provider_idempotency_key: string
  first_attempt_at: Date | string | null
  lease_token: string
}

type SendEligibility = {
  db_now: Date | string
  lease_expires_at: Date | string
  provider_deadline: Date | string
  message_expires_at: Date | string | null
  token_expires_at: Date | string | null
  requires_magic_link: boolean
  magic_link_id: number | null
  token_consumed_at: Date | string | null
}

function encryptionKey(): Buffer {
  const configured = process.env.EMAIL_OUTBOX_ENCRYPTION_KEY?.trim()
  if (!configured) throw new Error('EMAIL_OUTBOX_ENCRYPTION_KEY is not configured.')
  const key = /^[a-f\d]{64}$/i.test(configured)
    ? Buffer.from(configured, 'hex')
    : Buffer.from(configured, 'base64')
  if (key.length !== 32) {
    throw new Error('EMAIL_OUTBOX_ENCRYPTION_KEY must decode to exactly 32 bytes.')
  }
  return key
}

export function encryptEmailMessage(eventKey: string, message: EmailMessage): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  cipher.setAAD(Buffer.from(eventKey))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(message), 'utf8'), cipher.final()])
  return JSON.stringify({
    v: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: ciphertext.toString('base64'),
  })
}

export function decryptEmailMessage(eventKey: string, value: string): EmailMessage {
  const envelope = JSON.parse(value) as { v: number; iv: string; tag: string; data: string }
  if (envelope.v !== 1) throw new Error('Unsupported encrypted email message version.')
  const iv = Buffer.from(envelope.iv, 'base64')
  const tag = Buffer.from(envelope.tag, 'base64')
  if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid encrypted email message envelope.')
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    iv,
    { authTagLength: 16 },
  )
  decipher.setAAD(Buffer.from(eventKey))
  decipher.setAuthTag(tag)
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(envelope.data, 'base64')),
      decipher.final(),
    ]).toString('utf8'),
  ) as EmailMessage
}

function configuredFrom(): string {
  const address = process.env.EMAIL_FROM?.trim() || 'noreply@c2i2a.vercel.app'
  const name = process.env.EMAIL_FROM_NAME?.trim()
  return name && !address.includes('<') ? `${name} <${address}>` : address
}

/** Must receive the same req as the business mutation so Payload shares its transaction. */
export async function enqueueEmail(options: EnqueueEmailOptions) {
  if (
    process.env.NODE_ENV !== 'production' &&
    !process.env.RESEND_API_KEY?.trim() &&
    !process.env.EMAIL_OUTBOX_ENCRYPTION_KEY?.trim()
  ) {
    return {
      id: 0,
      eventKey: options.eventKey,
      eventType: options.eventType,
      status: 'cancelled',
      attempts: 0,
      encryptedMessage: null,
    }
  }
  const transactionID = await options.req.transactionID
  const adapter = options.req.payload.db as unknown as PostgresAdapter
  const transaction = transactionID && adapter.sessions[transactionID]?.db
  if (!transaction) {
    throw new Error('Email outbox enqueue requires the triggering database transaction.')
  }
  const providerIdempotencyKey = crypto
    .createHash('sha256')
    .update(`c2i2a-email:${options.eventKey}`)
    .digest('hex')
  const message = { ...options.message, from: options.message.from || configuredFrom() }
  const now = new Date()
  const result = await (transaction as { execute: (query: unknown) => Promise<unknown> }).execute(sql`
    INSERT INTO email_outbox (
      event_key, event_type, status, attempts, next_attempt_at,
      provider_idempotency_key, encrypted_message, message_expires_at,
      requires_magic_link, magic_link_id, created_at, updated_at
    ) VALUES (
      ${options.eventKey}, ${options.eventType}::enum_email_outbox_event_type, 'pending', 0, ${now},
      ${providerIdempotencyKey}, ${encryptEmailMessage(options.eventKey, message)},
      ${options.messageExpiresAt ? new Date(options.messageExpiresAt) : null},
      ${options.magicLink !== undefined}, ${options.magicLink ?? null}, ${now}, ${now}
    )
    ON CONFLICT (event_key) DO UPDATE SET event_key = EXCLUDED.event_key
    RETURNING id, event_key, event_type, status, attempts, next_attempt_at,
      provider_idempotency_key, encrypted_message, message_expires_at, magic_link_id,
      created_at, updated_at
  `)
  const row = rows<{
    id: number
    event_key: string
    event_type: EmailEventType
    status: string
    attempts: number
    next_attempt_at: Date
    provider_idempotency_key: string
    encrypted_message: string
    message_expires_at: Date | null
    magic_link_id: number | null
    created_at: Date
    updated_at: Date
  }>(result)[0]
  if (!row) throw new Error('Email outbox enqueue returned no record.')
  return {
    id: row.id,
    eventKey: row.event_key,
    eventType: row.event_type,
    status: row.status,
    attempts: Number(row.attempts),
    nextAttemptAt: new Date(row.next_attempt_at).toISOString(),
    providerIdempotencyKey: row.provider_idempotency_key,
    encryptedMessage: row.encrypted_message,
    messageExpiresAt: row.message_expires_at
      ? new Date(row.message_expires_at).toISOString()
      : null,
    magicLink: row.magic_link_id,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

/** Cancels and cryptographically scrubs unsent messages containing an invalidated bearer token. */
export async function cancelMagicLinkEmails(req: PayloadRequest, magicLinkIDs: number[]) {
  if (!magicLinkIDs.length) return
  await req.payload.update({
    collection: 'email-outbox',
    where: {
      and: [
        { magicLink: { in: magicLinkIDs } },
        { status: { in: ['pending', 'retrying', 'processing', 'failed', 'ambiguous'] } },
      ],
    },
    data: {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      encryptedMessage: null,
      leaseToken: null,
      leaseExpiresAt: null,
    },
    overrideAccess: true,
    req,
  })
}

function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  return ((result as { rows?: T[] })?.rows ?? []) as T[]
}

async function maintenance(pool: PostgresAdapter['pool']) {
  await pool.query(
    `UPDATE email_outbox SET status = 'cancelled', cancelled_at = clock_timestamp(), encrypted_message = NULL,
       lease_token = NULL, lease_expires_at = NULL, updated_at = clock_timestamp()
     WHERE encrypted_message IS NOT NULL AND message_expires_at IS NOT NULL
       AND message_expires_at <= clock_timestamp()
       AND status IN ('pending', 'retrying', 'processing', 'failed', 'ambiguous')`,
  )
  await pool.query(
    `UPDATE email_outbox SET status = 'cancelled', cancelled_at = clock_timestamp(), encrypted_message = NULL,
       lease_token = NULL, lease_expires_at = NULL, updated_at = clock_timestamp()
     WHERE encrypted_message IS NOT NULL AND requires_magic_link = true
       AND status IN ('pending', 'retrying', 'processing', 'failed', 'ambiguous')
       AND NOT EXISTS (
         SELECT 1 FROM magic_links
          WHERE magic_links.id = email_outbox.magic_link_id
            AND magic_links.consumed_at IS NULL AND magic_links.expires_at > clock_timestamp()
       )`,
  )
  await pool.query(
    `UPDATE email_outbox SET status = 'ambiguous', lease_token = NULL, lease_expires_at = NULL,
       last_error_code = 'idempotency_window_expired',
       last_error = 'Delivery outcome requires administrator review.', updated_at = clock_timestamp()
     WHERE encrypted_message IS NOT NULL AND first_attempt_at IS NOT NULL
       AND first_attempt_at <= clock_timestamp() - INTERVAL '24 hours'
       AND (status IN ('pending', 'retrying')
         OR (status = 'processing' AND lease_expires_at <= clock_timestamp()))`,
  )
  await pool.query(
    `UPDATE email_outbox SET status = 'ambiguous', lease_token = NULL, lease_expires_at = NULL,
       last_error_code = 'max_attempt_lease_expired',
       last_error = 'Final delivery attempt expired without a recorded outcome; administrator review is required.',
       updated_at = clock_timestamp()
     WHERE encrypted_message IS NOT NULL AND status = 'processing'
       AND attempts >= $1 AND lease_expires_at <= clock_timestamp()`,
    [EMAIL_OUTBOX_MAX_ATTEMPTS],
  )
}

async function claimJob(
  pool: PostgresAdapter['pool'],
  eventKey?: string,
  eventKeyPrefix?: string,
) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query<ClaimedJob>(
      `WITH candidates AS (
         SELECT id FROM email_outbox
         WHERE encrypted_message IS NOT NULL AND attempts < $1
           AND ($2::varchar IS NULL OR event_key = $2)
           AND ($3::varchar IS NULL OR event_key LIKE $3)
           AND (first_attempt_at IS NULL OR first_attempt_at > clock_timestamp() - INTERVAL '24 hours')
           AND (requires_magic_link = false OR (magic_link_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM magic_links
              WHERE magic_links.id = email_outbox.magic_link_id
                AND magic_links.consumed_at IS NULL AND magic_links.expires_at > clock_timestamp()
           )))
           AND ((status IN ('pending', 'retrying') AND next_attempt_at <= clock_timestamp())
             OR (status = 'processing' AND lease_expires_at <= clock_timestamp()))
         ORDER BY next_attempt_at, id
         FOR UPDATE SKIP LOCKED LIMIT 1
       )
       UPDATE email_outbox AS jobs SET status = 'processing', attempts = jobs.attempts + 1,
         first_attempt_at = COALESCE(jobs.first_attempt_at, clock_timestamp()), last_attempt_at = clock_timestamp(),
         lease_token = md5(random()::text || clock_timestamp()::text || jobs.id::text),
         lease_expires_at = clock_timestamp() + ($4 * INTERVAL '1 millisecond'), updated_at = clock_timestamp()
       FROM candidates WHERE jobs.id = candidates.id
      RETURNING jobs.id, jobs.event_key, jobs.attempts, jobs.encrypted_message,
         jobs.provider_idempotency_key, jobs.first_attempt_at, jobs.lease_token`,
      [
        EMAIL_OUTBOX_MAX_ATTEMPTS,
        eventKey ?? null,
        eventKeyPrefix ? `${eventKeyPrefix}%` : null,
        EMAIL_OUTBOX_LEASE_MS,
      ],
    )
    await client.query('COMMIT')
    return rows<ClaimedJob>(result)[0] ?? null
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

function retryAfter(response: Response | undefined, now: Date): number | null {
  if (!response) return null
  const value = response.headers.get('retry-after')
  if (!value) return null
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - now.getTime()) : null
}

async function leasedUpdate(
  pool: PostgresAdapter['pool'],
  job: ClaimedJob,
  values: { status: string; next?: Date; code?: string; error?: string; providerID?: string; scrub?: boolean },
  beforeLock?: (jobID: number, backendPID: number) => Promise<void>,
) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const backendPID = Number((await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0].pid)
    await beforeLock?.(job.id, backendPID)
    await client.query('SELECT id FROM email_outbox WHERE id = $1 FOR UPDATE', [job.id])
    const lease = await client.query<{ eligible: boolean }>(
      `SELECT (status = 'processing' AND lease_token = $2 AND lease_expires_at > clock_timestamp()) AS eligible
         FROM email_outbox WHERE id = $1`,
      [job.id, job.lease_token],
    )
    if (lease.rows[0]?.eligible !== true) {
      await client.query('COMMIT')
      return false
    }
    const result = await client.query(
      `UPDATE email_outbox SET status = $1::enum_email_outbox_status, next_attempt_at = COALESCE($2, next_attempt_at),
         provider_message_id = $3, last_error_code = $4, last_error = $5,
         sent_at = CASE WHEN $1::text = 'sent' THEN clock_timestamp() ELSE sent_at END,
         encrypted_message = CASE WHEN $6 THEN NULL ELSE encrypted_message END,
         lease_token = NULL, lease_expires_at = NULL, updated_at = clock_timestamp()
       WHERE id = $7 AND status = 'processing' AND lease_token = $8
         AND lease_expires_at > clock_timestamp()
       RETURNING id`,
      [
        values.status,
        values.next ?? null,
        values.providerID ?? null,
        values.code ?? null,
        values.error ?? null,
        Boolean(values.scrub),
        job.id,
        job.lease_token,
      ],
    )
    await client.query('COMMIT')
    return rows(result).length === 1
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function validateSendEligibility(
  pool: PostgresAdapter['pool'],
  job: ClaimedJob,
  monotonicNow: () => number,
  beforeLock?: (jobID: number, backendPID: number) => Promise<void>,
) {
  const queryStarted = monotonicNow()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const backendPID = Number((await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0].pid)
    await beforeLock?.(job.id, backendPID)
    const result = await client.query<SendEligibility>(
      `SELECT clock_timestamp() AS db_now, jobs.lease_expires_at,
         jobs.first_attempt_at + INTERVAL '24 hours' AS provider_deadline,
         jobs.message_expires_at, jobs.requires_magic_link, jobs.magic_link_id,
         magic_links.expires_at AS token_expires_at, magic_links.consumed_at AS token_consumed_at
       FROM email_outbox AS jobs
       LEFT JOIN magic_links ON magic_links.id = jobs.magic_link_id
       WHERE jobs.id = $1 AND jobs.status = 'processing' AND jobs.lease_token = $2
       FOR UPDATE OF jobs`,
      [job.id, job.lease_token],
    )
    const eligibility = rows<SendEligibility>(result)[0]
    if (!eligibility) {
      await client.query('COMMIT')
      return null
    }
    const dbNow = new Date(eligibility.db_now).getTime()
    const messageExpired = Boolean(
      eligibility.message_expires_at && new Date(eligibility.message_expires_at).getTime() <= dbNow,
    )
    const tokenInvalid = eligibility.requires_magic_link && (
      eligibility.magic_link_id === null || eligibility.token_expires_at === null ||
      eligibility.token_consumed_at !== null || new Date(eligibility.token_expires_at).getTime() <= dbNow
    )
    const providerExpired = new Date(eligibility.provider_deadline).getTime() <= dbNow
    if (messageExpired || tokenInvalid || providerExpired) {
      const cancelled = messageExpired || tokenInvalid
      await client.query(
        `UPDATE email_outbox SET status = $1::enum_email_outbox_status,
           cancelled_at = CASE WHEN $1::text = 'cancelled' THEN clock_timestamp() ELSE cancelled_at END,
           encrypted_message = CASE WHEN $2 THEN NULL ELSE encrypted_message END,
           lease_token = NULL, lease_expires_at = NULL,
           last_error_code = CASE WHEN $1::text = 'ambiguous' THEN 'idempotency_window_expired' ELSE last_error_code END,
           last_error = CASE WHEN $1::text = 'ambiguous' THEN 'Delivery outcome requires administrator review.' ELSE last_error END,
           updated_at = clock_timestamp()
         WHERE id = $3 AND status = 'processing' AND lease_token = $4`,
        [cancelled ? 'cancelled' : 'ambiguous', cancelled, job.id, job.lease_token],
      )
      await client.query('COMMIT')
      return null
    }
    const safeUntil = Math.min(
      new Date(eligibility.lease_expires_at).getTime() - EMAIL_OUTBOX_PROVIDER_TIMEOUT_MS,
      new Date(eligibility.provider_deadline).getTime(),
      eligibility.message_expires_at ? new Date(eligibility.message_expires_at).getTime() : Number.POSITIVE_INFINITY,
      eligibility.token_expires_at ? new Date(eligibility.token_expires_at).getTime() : Number.POSITIVE_INFINITY,
    )
    await client.query('COMMIT')
    if (safeUntil <= dbNow) return null
    return { queryStarted, safeForMs: safeUntil - dbNow }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function quarantineUnrecordedOutcome(
  pool: PostgresAdapter['pool'],
  job: ClaimedJob,
) {
  await pool.query(
    `UPDATE email_outbox SET status = 'ambiguous', lease_token = NULL, lease_expires_at = NULL,
       last_error_code = 'lease_outcome_unrecorded',
       last_error = 'Provider request completed after lease ownership was lost; administrator review is required.',
       updated_at = clock_timestamp()
     WHERE id = $1 AND status = 'processing' AND lease_token = $2`,
    [job.id, job.lease_token],
  )
}

export async function processEmailOutbox(
  payload: Payload,
  options: {
    limit?: number
    now?: Date
    fetchImpl?: typeof fetch
    random?: () => number
    eventKey?: string
    eventKeyPrefix?: string
    clock?: () => Date
    monotonicNow?: () => number
    afterClaimAttempt?: (jobID: number | null) => Promise<void>
    beforeSendEligibility?: (jobID: number) => Promise<void>
    beforeEligibilityLock?: (jobID: number, backendPID: number) => Promise<void>
    beforeTransport?: (jobID: number) => Promise<void>
    beforeOutcomePersist?: (jobID: number) => Promise<void>
    beforeOutcomeLock?: (jobID: number, backendPID: number) => Promise<void>
  } = {},
) {
  const adapter = payload.db as unknown as PostgresAdapter
  const currentTime = options.clock ?? (() => options.now ?? new Date())
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return { claimed: 0, sent: 0, unavailable: true }

  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50)
  let claimed = 0
  let sent = 0
  let maintained = false
  while (claimed < limit) {
    const job = await claimJob(adapter.pool, options.eventKey, options.eventKeyPrefix)
    await options.afterClaimAttempt?.(job?.id ?? null)
    if (!job) {
      if (maintained) break
      await maintenance(adapter.pool)
      maintained = true
      continue
    }
    claimed += 1
    await options.beforeSendEligibility?.(job.id)
    const monotonicNow = options.monotonicNow ?? performance.now.bind(performance)
    const eligibility = await validateSendEligibility(
      adapter.pool, job, monotonicNow, options.beforeEligibilityLock,
    )
    if (!eligibility) continue
    let message: EmailMessage
    try {
      message = decryptEmailMessage(job.event_key, job.encrypted_message)
    } catch {
      await leasedUpdate(adapter.pool, job, {
        status: 'failed', code: 'decrypt_failed', error: 'Encrypted message could not be authenticated.',
      })
      continue
    }

    await options.beforeTransport?.(job.id)
    if (monotonicNow() - eligibility.queryStarted >= eligibility.safeForMs) continue

    let response: Response | undefined
    let networkFailure = false
    try {
      response = await (options.fetchImpl ?? fetch)('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': job.provider_idempotency_key,
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(EMAIL_OUTBOX_PROVIDER_TIMEOUT_MS),
      })
    } catch {
      networkFailure = true
    }

    if (response?.ok) {
      let providerID: string | undefined
      try {
        providerID = ((await response.json()) as { id?: string }).id
      } catch {}
      await options.beforeOutcomePersist?.(job.id)
      const accepted = await leasedUpdate(adapter.pool, job, {
        status: 'sent', providerID, scrub: true,
      }, options.beforeOutcomeLock)
      if (accepted) sent += 1
      else await quarantineUnrecordedOutcome(adapter.pool, job)
      continue
    }

    const transient = networkFailure || response?.status === 408 || response?.status === 429 || Boolean(response && response.status >= 500)
    await options.beforeOutcomePersist?.(job.id)
    const outcomeTime = currentTime()
    if (!transient || job.attempts >= EMAIL_OUTBOX_MAX_ATTEMPTS) {
      const accepted = await leasedUpdate(adapter.pool, job, {
        status: 'failed',
        code: networkFailure ? 'network_error' : `provider_${response?.status ?? 'error'}`,
        error: transient ? 'Automatic delivery attempts exhausted.' : 'Provider rejected the message.',
      }, options.beforeOutcomeLock)
      if (!accepted) await quarantineUnrecordedOutcome(adapter.pool, job)
      continue
    }
    const providerDelay = retryAfter(response, outcomeTime)
    const base = providerDelay ?? RETRY_DELAYS_MS[job.attempts - 1]
    const jitter = providerDelay === null ? 0.9 + (options.random ?? Math.random)() * 0.2 : 1
    const accepted = await leasedUpdate(adapter.pool, job, {
      status: 'retrying', next: new Date(outcomeTime.getTime() + Math.round(base * jitter)),
      code: networkFailure ? 'network_error' : `provider_${response?.status ?? 'error'}`,
      error: 'Temporary delivery failure.',
    }, options.beforeOutcomeLock)
    if (!accepted) await quarantineUnrecordedOutcome(adapter.pool, job)
  }
  return { claimed, sent, unavailable: false }
}

export async function requestManualEmailRetry(
  payload: Payload,
  options: { id: number; userID: number; reason: string },
) {
  const reason = options.reason.trim()
  if (!reason) throw new Error('A manual retry reason is required.')
  const result = await (payload.db as unknown as PostgresAdapter).pool.query(
    `UPDATE email_outbox SET status = 'pending', attempts = 0, next_attempt_at = clock_timestamp(),
       lease_token = NULL, lease_expires_at = NULL, manual_retry_at = clock_timestamp(),
       manual_retry_by_id = $1, manual_retry_reason = $2, updated_at = clock_timestamp()
     WHERE id = $3 AND status = 'failed' AND encrypted_message IS NOT NULL
       AND (message_expires_at IS NULL OR message_expires_at > clock_timestamp())
       AND (first_attempt_at IS NULL OR first_attempt_at > clock_timestamp() - INTERVAL '24 hours')
       AND (requires_magic_link = false OR (magic_link_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM magic_links
          WHERE magic_links.id = email_outbox.magic_link_id
            AND magic_links.consumed_at IS NULL AND magic_links.expires_at > clock_timestamp()
       )))
     RETURNING id`,
    [options.userID, reason.slice(0, 1000), options.id],
  )
  if (rows(result).length !== 1) throw new Error('This email is not eligible for manual retry.')
}
