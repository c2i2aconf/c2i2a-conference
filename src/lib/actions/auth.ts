'use server'

import crypto from 'node:crypto'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import { magicLinkEmail } from '@/emails/templates'
import { getServerURL } from '@/lib/server-url'
import { isPortalRole, shouldThrottleMagicLink } from '@/lib/workflow-policy'

const TOKEN_TTL_MINUTES = 30
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
 * is logged to the server console and returned so the UI can display it.
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
    const forwardedFor = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim()
    const clientAddress = forwardedFor || requestHeaders.get('x-real-ip') || 'unknown'
    const requestIpHash = crypto
      .createHmac('sha256', payload.config.secret)
      .update(clientAddress)
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

    await payload.delete({
      collection: 'magic-links',
      where: { createdAt: { less_than: new Date(now - 24 * 60 * 60_000).toISOString() } },
      overrideAccess: true,
    })

    // Elevated CMS users keep password-only admin authentication.
    const { docs: users } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    })
    let user = users[0]
    if (user && !isPortalRole(user.role)) {
      return { success: true }
    }
    if (!user) {
      user = await payload.create({
        collection: 'users',
        data: {
          email,
          role: 'author',
          password: crypto.randomBytes(24).toString('hex'),
        },
        overrideAccess: true,
      })
    }

    // Invalidate previous outstanding links for this email
    await payload.update({
      collection: 'magic-links',
      where: {
        and: [{ email: { equals: email } }, { consumedAt: { exists: false } }],
      },
      data: { consumedAt: new Date().toISOString() },
      overrideAccess: true,
    })

    // Create a single-use token — only the hash is stored
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    await payload.create({
      collection: 'magic-links',
      data: {
        email,
        tokenHash,
        requestIpHash,
        locale,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString(),
      },
      overrideAccess: true,
    })

    const link = `${getServerURL()}/${locale}/auth/verify?token=${token}`

    // Without RESEND_API_KEY Payload silently falls back to a console
    // adapter that never throws — detect it explicitly so the link is
    // still surfaced in local dev
    const emailConfigured = Boolean(process.env.RESEND_API_KEY)

    try {
      await payload.sendEmail({
        to: email,
        subject: locale === 'fr' ? 'Votre lien de connexion — C2I2A' : 'Your sign-in link — C2I2A',
        html: await magicLinkEmail(locale, link, TOKEN_TTL_MINUTES),
      })
    } catch (emailError) {
      console.warn(`Magic link email not sent (${email})`, emailError)
    }

    if (!emailConfigured && process.env.NODE_ENV !== 'production') {
      console.log(`Magic link for ${email}: ${link}`)
      return { success: true, devLink: link }
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
