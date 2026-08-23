'use server'

import { getPayload } from 'payload'
import { headers } from 'next/headers'
import configPromise from '@payload-config'
import { registrationEmail } from '@/emails/templates'
import {
  REGISTRATION_LINK_TTL_MINUTES,
  createMagicLinkUrl,
  ensurePortalUser,
} from '@/lib/magic-link'
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
    if (!edition) {
      return { success: false, error: 'no_live_edition' }
    }

    const payload = await getPayload({ config: configPromise })
    const requestHeaders = await headers()

    // Check for duplicates — internal existence check; registrations
    // are admin/self-readable so anonymous requests must bypass access
    const existing = await payload.find({
      collection: 'registrations',
      where: {
        and: [{ email: { equals: email } }, { edition: { equals: edition.id } }],
      },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
      return { success: false, error: 'duplicate_email' }
    }

    const { user } = await payload.auth({ headers: requestHeaders })
    const linkedUser = user && user.email.toLowerCase() === email ? user.id : undefined

    await payload.create({
      collection: 'registrations',
      data: {
        firstName,
        lastName,
        email,
        locale,
        user: linkedUser,
        affiliation,
        country,
        edition: edition.id,
        status: 'confirmed',
      },
    })

    // The confirmation email carries a single-use sign-in link so registrants
    // can reach their account and submit a paper. Elevated CMS accounts never
    // get links, and a link failure must not fail the registration.
    let signInUrl: string | undefined
    try {
      const portalUser = await ensurePortalUser(email, 'attendee')
      if (portalUser) {
        signInUrl = await createMagicLinkUrl({
          email,
          locale,
          ttlMinutes: REGISTRATION_LINK_TTL_MINUTES,
          requestHeaders,
        })
      }
    } catch (linkError) {
      console.error('Failed to create registration sign-in link', linkError)
    }

    // Without RESEND_API_KEY Payload silently falls back to a console adapter
    // that never throws — detect it so the UI can warn the registrant.
    const emailConfigured = Boolean(process.env.RESEND_API_KEY)
    let emailSent = emailConfigured
    if (emailConfigured) {
      try {
        await payload.sendEmail({
          to: email,
          subject:
            locale === 'fr'
              ? "Confirmation d'inscription - C2I2A"
              : 'Registration Confirmation - C2I2A',
          html: await registrationEmail(locale, firstName, signInUrl),
        })
      } catch (emailError) {
        emailSent = false
        console.error('Failed to send confirmation email', emailError)
      }
    } else {
      console.warn('Registration email skipped — RESEND_API_KEY is not set')
    }

    return { success: true, emailSent }
  } catch (error) {
    console.error('Registration error', error)
    return { success: false, error: 'server_error' }
  }
}
