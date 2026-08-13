'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getLiveEdition } from '../queries'

export async function registerAction(formData: FormData, locale: 'fr' | 'en') {
  try {
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const email = formData.get('email') as string
    const affiliation = formData.get('affiliation') as string
    const country = formData.get('country') as string

    if (!firstName || !lastName || !email) {
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
        and: [
          { email: { equals: email } },
          { edition: { equals: edition.id } }
        ]
      },
      limit: 1
    })

    if (existing.totalDocs > 0) {
      return { success: false, error: 'duplicate_email' }
    }

    // Create registration
    const registration = await payload.create({
      collection: 'registrations',
      data: {
        firstName,
        lastName,
        email,
        affiliation,
        country,
        edition: edition.id,
        status: 'confirmed',
      }
    })

    // Send confirmation email via Payload's configured adapter
    try {
      await payload.sendEmail({
        to: email,
        subject: locale === 'fr' ? 'Confirmation d\'inscription - C2I2A' : 'Registration Confirmation - C2I2A',
        html: locale === 'fr' 
          ? `<p>Bonjour ${firstName},</p><p>Nous confirmons votre inscription au colloque C2I2A. Au plaisir de vous y retrouver !</p>`
          : `<p>Hello ${firstName},</p><p>We confirm your registration for the C2I2A conference. See you soon!</p>`
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
