import crypto from 'node:crypto'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import type { User } from '@/payload-types'
import { getServerURL } from '@/lib/server-url'
import { isPortalRole } from '@/lib/workflow-policy'

/** Sign-in links requested from the login form are short-lived. */
export const LOGIN_LINK_TTL_MINUTES = 30
/** Registration emails may be opened days later, so their link lives a week. */
export const REGISTRATION_LINK_TTL_MINUTES = 7 * 24 * 60

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
): Promise<User | null> {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
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
  })
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
  const payload = await getPayload({ config: configPromise })
  const { email, locale, ttlMinutes, requestHeaders } = options

  await payload.update({
    collection: 'magic-links',
    where: {
      and: [{ email: { equals: email } }, { consumedAt: { exists: false } }],
    },
    data: { consumedAt: new Date().toISOString() },
    overrideAccess: true,
  })

  const token = crypto.randomBytes(32).toString('hex')
  const requestIpHash = crypto
    .createHmac('sha256', payload.config.secret)
    .update(clientAddressFromHeaders(requestHeaders))
    .digest('hex')
  await payload.create({
    collection: 'magic-links',
    data: {
      email,
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      requestIpHash,
      locale,
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000).toISOString(),
    },
    overrideAccess: true,
  })

  return `${getServerURL()}/${locale}/auth/verify?token=${token}`
}
