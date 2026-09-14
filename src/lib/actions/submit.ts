'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import { submissionReceivedEmail } from '@/emails/templates'
import { enqueueEmail, processEmailOutbox } from '@/lib/email-outbox'
import { withPayloadTransaction } from '@/lib/payload-transaction'
import { getLiveEdition } from '../queries'
import {
  hasPdfSignature,
  isPortalRole,
  isSubmissionWindowOpen,
  SUBMISSION_FILE_LIMIT,
} from '@/lib/workflow-policy'

export type SubmitResult = {
  success: boolean
  error?:
    | 'unauthorized'
    | 'missing_fields'
    | 'invalid_file'
    | 'no_live_edition'
    | 'submissions_closed'
    | 'server_error'
}

/** Creates a paper submission for the signed-in author, with its PDF file. */
export async function submitPaper(formData: FormData, locale: 'fr' | 'en'): Promise<SubmitResult> {
  try {
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers: await headers() })
    if (!user || !isPortalRole(user.role)) {
      return { success: false, error: 'unauthorized' }
    }

    const title = (formData.get('title') as string)?.trim()
    const abstract = (formData.get('abstract') as string)?.trim()
    const file = formData.get('file') as File | null

    if (!title || !abstract || !file || file.size === 0) {
      return { success: false, error: 'missing_fields' }
    }
    if (file.type !== 'application/pdf' || file.size > SUBMISSION_FILE_LIMIT) {
      return { success: false, error: 'invalid_file' }
    }

    const edition = await getLiveEdition(locale)
    if (!edition) {
      return { success: false, error: 'no_live_edition' }
    }

    if (!isSubmissionWindowOpen(edition)) {
      return { success: false, error: 'submissions_closed' }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!hasPdfSignature(buffer)) {
      return { success: false, error: 'invalid_file' }
    }
    const safeBaseName = file.name
      .replace(/\.pdf$/i, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .slice(0, 80)
    const safeName = `${safeBaseName || 'submission'}.pdf`

    // Private upload; its collection hook forces ownership to this user.
    const uploaded = await payload.create({
      collection: 'submission-files',
      data: { author: user.id, kind: 'original-review' },
      file: {
        data: buffer,
        mimetype: 'application/pdf',
        name: safeName,
        size: file.size,
      },
      user,
      overrideAccess: false,
    })

    try {
      const eventKey = await withPayloadTransaction(payload, { user }, async (req) => {
        const submission = await payload.create({
          collection: 'submissions',
          data: {
            edition: edition.id, author: user.id, title, abstract, file: uploaded.id,
            locale, reviewState: 'unassigned', status: 'pending',
          },
          user, overrideAccess: false, req,
        })
        const key = `submission-receipt:${submission.id}`
        await enqueueEmail({
          req, eventKey: key, eventType: 'submission-receipt',
          message: {
            to: user.email,
            subject: locale === 'fr' ? 'Soumission reçue — C2I2A' : 'Submission received — C2I2A',
            html: await submissionReceivedEmail(locale, title),
          },
        })
        return key
      })
      if (process.env.RESEND_API_KEY) {
        try { await processEmailOutbox(payload, { eventKey }) } catch (error) {
          console.warn('Submission email delivery deferred to retry worker', error)
        }
      }
    } catch (error) {
      await payload.delete({
        collection: 'submission-files',
        id: uploaded.id,
        overrideAccess: true,
      })
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Submission error', error)
    return { success: false, error: 'server_error' }
  }
}
