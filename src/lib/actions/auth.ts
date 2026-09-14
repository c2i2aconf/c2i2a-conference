'use server'

import crypto from 'node:crypto'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import { magicLinkEmail } from '@/emails/templates'
import {
  LOGIN_LINK_TTL_MINUTES,
  clientAddressFromHeaders,
  cleanupMagicLinks,
  createMagicLink,
  ensurePortalUser,
} from '@/lib/magic-link'
import { enqueueEmail, processEmailOutbox } from '@/lib/email-outbox'
import { withPayloadTransaction } from '@/lib/payload-transaction'
import { shouldThrottleMagicLink } from '@/lib/workflow-policy'

const EMAIL_WINDOW_MS = 15 * 60_000
const IP_WINDOW_MS = 60 * 60_000

export type MagicLinkResult = {
  success: boolean
  error?: 'invalid_email' | 'server_error'
  /** Only returned outside production when email delivery is unavailable */
  devLink?: string
}

/**
 * Sends a passwordless sign-in link.
 * Creates the author account on first use. In dev (no RESEND_API_KEY) the link
 * is returned to the caller so the UI can display it without entering logs.
 */
export async function requestMagicLink(
  formData: FormData,
  locale: 'fr' | 'en',
): Promise<MagicLinkResult> {
  try {
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'invalid_email' }
    }

    const payload = await getPayload({ config: configPromise })
    const requestHeaders = await headers()
    const requestIpHash = crypto
      .createHmac('sha256', payload.config.secret)
      .update(clientAddressFromHeaders(requestHeaders))
      .digest('hex')

    const now = Date.now()
    const [emailRequests, ipRequests] = await Promise.all([
      payload.find({
        collection: 'magic-links',
        where: {
          and: [
            { email: { equals: email } },
            { createdAt: { greater_than: new Date(now - EMAIL_WINDOW_MS).toISOString() } },
          ],
        },
        limit: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'magic-links',
        where: {
          and: [
            { requestIpHash: { equals: requestIpHash } },
            { createdAt: { greater_than: new Date(now - IP_WINDOW_MS).toISOString() } },
          ],
        },
        limit: 0,
        overrideAccess: true,
      }),
    ])

    if (shouldThrottleMagicLink(emailRequests.totalDocs, ipRequests.totalDocs)) {
      return { success: true }
    }

    const link = await withPayloadTransaction(payload, { headers: requestHeaders }, async (req) => {
      await cleanupMagicLinks(payload, now, req)
      const user = await ensurePortalUser(email, 'author', req)
      if (!user) return null
      const created = await createMagicLink({
        email, locale, ttlMinutes: LOGIN_LINK_TTL_MINUTES, requestHeaders, req,
      })
      await enqueueEmail({
        req, eventKey: `magic-link:${created.id}`, eventType: 'magic-link',
        magicLink: created.id, messageExpiresAt: created.expiresAt,
        message: {
          to: email,
          subject: locale === 'fr' ? 'Votre lien de connexion — C2I2A' : 'Your sign-in link — C2I2A',
          html: await magicLinkEmail(locale, created.url, LOGIN_LINK_TTL_MINUTES),
        },
      })
      return { url: created.url, eventKey: `magic-link:${created.id}` }
    })
    if (!link) return { success: true }

    // Without RESEND_API_KEY Payload silently falls back to a console
    // adapter that never throws — detect it explicitly so the link is
    // still surfaced in local dev
    const emailConfigured = Boolean(process.env.RESEND_API_KEY)

    if (emailConfigured) {
      try {
        await processEmailOutbox(payload, { eventKey: link.eventKey })
      } catch (error) {
        console.warn('Magic-link delivery deferred to retry worker', error)
      }
    }

    if (!emailConfigured && process.env.NODE_ENV !== 'production') {
      return { success: true, devLink: link.url }
    }

    return { success: true }
  } catch (error) {
    console.error('Magic link request failed', error)
    return { success: false, error: 'server_error' }
  }
}

/** Signs the current user out by clearing the Payload auth cookie. */
export async function logoutAction(): Promise<{ success: boolean }> {
  const { cookies } = await import('next/headers')
  const store = await cookies()
  store.set('payload-token', '', { path: '/', maxAge: 0 })
  return { success: true }
}
