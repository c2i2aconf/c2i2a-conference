'use server'

import { getPayload } from 'payload'
import { headers } from 'next/headers'
import configPromise from '@payload-config'
import { registrationEmail } from '@/emails/templates'
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

    // Check for duplicates
    const existing = await payload.find({
      collection: 'registrations',
      where: {
        and: [{ email: { equals: email } }, { edition: { equals: edition.id } }],
      },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      return { success: false, error: 'duplicate_email' }
    }

    const { user } = await payload.auth({ headers: await headers() })
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

    // Send confirmation email via Payload's configured adapter
    try {
      await payload.sendEmail({
        to: email,
        subject:
          locale === 'fr'
            ? "Confirmation d'inscription - C2I2A"
            : 'Registration Confirmation - C2I2A',
        html: await registrationEmail(locale, firstName),
      })
    } catch (emailError) {
      // Don't fail the registration if email fails (often fails in dev without API key)
      console.error('Failed to send confirmation email', emailError)
    }

    return { success: true }
  } catch (error) {
    console.error('Registration error', error)
    return { success: false, error: 'server_error' }
  }
}
