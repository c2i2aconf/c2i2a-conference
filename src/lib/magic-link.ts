import crypto from 'node:crypto'
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'

import configPromise from '@payload-config'
import type { User } from '@/payload-types'
import { getServerURL } from '@/lib/server-url'
import { isPortalRole } from '@/lib/workflow-policy'
import { cancelMagicLinkEmails } from '@/lib/email-outbox'
import { withPayloadTransaction } from '@/lib/payload-transaction'

/** Sign-in links requested from the login form are short-lived. */
export const LOGIN_LINK_TTL_MINUTES = 30
/** Registration emails may be opened days later, so their link lives a week. */
export const REGISTRATION_LINK_TTL_MINUTES = 7 * 24 * 60
/** Consumed links are retained briefly for troubleshooting, then removed. */
export const CONSUMED_LINK_RETENTION_MS = 24 * 60 * 60_000

/** Remove expired links and consumed links past their explicit retention period. */
export async function cleanupMagicLinks(payload: Payload, now = Date.now(), suppliedReq?: PayloadRequest) {
  const req = suppliedReq ?? (await createLocalReq({}, payload))
  const expired = await payload.find({
    collection: 'magic-links', depth: 0, pagination: false, overrideAccess: true, req,
    where: { expiresAt: { less_than: new Date(now).toISOString() } },
  })
  const retainedConsumed = await payload.find({
    collection: 'magic-links', depth: 0, pagination: false, overrideAccess: true, req,
    where: { consumedAt: { less_than: new Date(now - CONSUMED_LINK_RETENTION_MS).toISOString() } },
  })
  await cancelMagicLinkEmails(req, [
    ...new Set([...expired.docs, ...retainedConsumed.docs].map((link) => link.id)),
  ])
  await payload.delete({
    collection: 'magic-links',
    where: { expiresAt: { less_than: new Date(now).toISOString() } },
    overrideAccess: true,
    req,
  })
  await payload.delete({
    collection: 'magic-links',
    where: {
      consumedAt: { less_than: new Date(now - CONSUMED_LINK_RETENTION_MS).toISOString() },
    },
    overrideAccess: true,
    req,
  })
}

/** Best-effort client address, used only as input to one-way throttling hashes. */
export function clientAddressFromHeaders(requestHeaders: Headers): string {
  const forwardedFor = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || requestHeaders.get('x-real-ip') || 'unknown'
}

/**
 * Returns the portal user for `email`, creating one with `role` on first use.
 * Returns null when the address belongs to an elevated CMS account — those
 * authenticate by password only and never receive magic links.
 */
export async function ensurePortalUser(
  email: string,
  role: 'author' | 'attendee',
  req?: PayloadRequest,
): Promise<User | null> {
  const payload = req?.payload ?? (await getPayload({ config: configPromise }))
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
    req,
  })
  const existing = docs[0]
  if (existing) return isPortalRole(existing.role) ? existing : null
  return payload.create({
    collection: 'users',
    data: {
      email,
      role,
      password: crypto.randomBytes(24).toString('hex'),
    },
    overrideAccess: true,
    req,
  })
}

export async function createMagicLink(options: {
  email: string
  locale: 'fr' | 'en'
  ttlMinutes: number
  requestHeaders: Headers
  req?: PayloadRequest
  beforeLock?: (backendPID: number) => Promise<void>
  afterLock?: (backendPID: number) => Promise<void>
}): Promise<{ id: number; url: string; expiresAt: string }> {
  const payload = options.req?.payload ?? (await getPayload({ config: configPromise }))
  if (!options.req) {
    return withPayloadTransaction(payload, { headers: options.requestHeaders }, (req) =>
      createMagicLink({ ...options, req }),
    )
  }
  const req = options.req
  const { locale, ttlMinutes, requestHeaders } = options
  const email = options.email.trim().toLowerCase()
  const transactionID = await req.transactionID
  const transaction = transactionID && (payload.db as unknown as PostgresAdapter).sessions[transactionID]?.db
  if (!transaction) throw new Error('Magic-link issuance requires a database transaction.')
  const pidResult = await (transaction as { execute: (query: unknown) => Promise<unknown> }).execute(
    sql`SELECT pg_backend_pid() AS pid`,
  )
  const pidRows = Array.isArray(pidResult)
    ? pidResult
    : ((pidResult as { rows?: Array<{ pid: number }> }).rows ?? [])
  const backendPID = Number((pidRows[0] as { pid: number }).pid)
  await options.beforeLock?.(backendPID)
  await (transaction as { execute: (query: unknown) => Promise<unknown> }).execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`magic-link:${email}`}, 0))`,
  )
  await options.afterLock?.(backendPID)

  const outstanding = await payload.find({
    collection: 'magic-links', depth: 0, pagination: false, overrideAccess: true, req,
    where: { and: [{ email: { equals: email } }, { consumedAt: { exists: false } }] },
  })
  await payload.update({
    collection: 'magic-links',
    where: { and: [{ email: { equals: email } }, { consumedAt: { exists: false } }] },
    data: { consumedAt: new Date().toISOString() },
    overrideAccess: true,
    req,
  })
  await cancelMagicLinkEmails(req, outstanding.docs.map((link) => link.id))

  const token = crypto.randomBytes(32).toString('hex')
  const requestIpHash = crypto
    .createHmac('sha256', payload.config.secret)
    .update(clientAddressFromHeaders(requestHeaders))
    .digest('hex')
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString()
  const link = await payload.create({
    collection: 'magic-links',
    data: {
      email,
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      requestIpHash,
      locale,
      expiresAt,
    },
    overrideAccess: true,
    req,
  })
  return { id: link.id, expiresAt, url: `${getServerURL()}/${locale}/auth/verify?token=${token}` }
}

/**
 * Invalidates outstanding links for the email and issues a fresh single-use
 * sign-in URL. Only the SHA-256 hash of the token is stored.
 */
export async function createMagicLinkUrl(options: {
  email: string
  locale: 'fr' | 'en'
  ttlMinutes: number
  requestHeaders: Headers
}): Promise<string> {
  return (await createMagicLink(options)).url
}
