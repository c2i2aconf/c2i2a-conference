'use server'

import { getPayload } from 'payload'
import { headers } from 'next/headers'
import configPromise from '@payload-config'
import { registrationEmail } from '@/emails/templates'
import {
  REGISTRATION_LINK_TTL_MINUTES,
  createMagicLink,
  ensurePortalUser,
} from '@/lib/magic-link'
import { enqueueEmail, processEmailOutbox } from '@/lib/email-outbox'
import { withPayloadTransaction } from '@/lib/payload-transaction'
import { getLiveEdition } from '../queries'

export async function registerAction(formData: FormData, locale: 'fr' | 'en') {
  try {
    const firstName = String(formData.get('firstName') || '').trim()
    const lastName = String(formData.get('lastName') || '').trim()
    const email = String(formData.get('email') || '')
      .trim()
      .toLowerCase()
    const affiliation = String(formData.get('affiliation') || '').trim()
    const country = String(formData.get('country') || '').trim()

    if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'missing_fields' }
    }

    const edition = await getLiveEdition(locale)
    if (!edition || !edition.registrationEnabled) {
      return { success: false, error: 'no_live_edition' }
    }

    const payload = await getPayload({ config: configPromise })
    const requestHeaders = await headers()

    const existing = await payload.find({
      collection: 'registrations', limit: 1, overrideAccess: true,
      where: { and: [
        { email: { equals: email } }, { edition: { equals: edition.id } },
        { status: { equals: 'confirmed' } },
      ] },
    })
    if (existing.totalDocs > 0) return { success: false, error: 'duplicate_email' }

    const { user } = await payload.auth({ headers: requestHeaders })
    const linkedUser = user && user.email.toLowerCase() === email ? user.id : undefined
    const eventKey = await withPayloadTransaction(payload, { headers: requestHeaders, user }, async (req) => {
      const registration = await payload.create({
        collection: 'registrations',
        data: {
          firstName, lastName, email, locale, user: linkedUser, affiliation, country,
          edition: edition.id, status: 'confirmed',
          feeCategory: String(formData.get('feeCategory') || '') || undefined,
          feeCurrency: (String(formData.get('feeCurrency') || '') || undefined) as 'MAD' | 'EUR' | undefined,
        },
        overrideAccess: false, user, req,
      })
      const portalUser = await ensurePortalUser(email, 'attendee', req)
      const signIn = portalUser
        ? await createMagicLink({ email, locale, ttlMinutes: REGISTRATION_LINK_TTL_MINUTES, requestHeaders, req })
        : undefined
      const key = `registration-confirmation:${registration.id}`
      await enqueueEmail({
        req, eventKey: key, eventType: 'registration-confirmation',
        magicLink: signIn?.id, messageExpiresAt: signIn?.expiresAt,
        message: {
          to: email,
          subject: locale === 'fr' ? "Confirmation d'inscription - C2I2A" : 'Registration Confirmation - C2I2A',
          html: await registrationEmail(locale, firstName, signIn?.url),
        },
      })
      return key
    })
    if (process.env.RESEND_API_KEY) {
      try { await processEmailOutbox(payload, { eventKey }) } catch (error) {
        console.error('Registration email delivery deferred to retry worker', error)
      }
    }
    const queued = await payload.find({
      collection: 'email-outbox', depth: 0, limit: 1, overrideAccess: true,
      where: { eventKey: { equals: eventKey } },
    })
    return { success: true, emailSent: queued.docs[0]?.status === 'sent' }
  } catch (error) {
    console.error('Registration error', error)
    return { success: false, error: 'server_error' }
  }
}
