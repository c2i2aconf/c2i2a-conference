'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import {
  hasPdfSignature,
  isPortalRole,
  SUBMISSION_FILE_LIMIT,
  type SubmissionFileKind,
} from '@/lib/workflow-policy'

export type WorkflowUploadResult = {
  success: boolean
  error?:
    | 'unauthorized'
    | 'missing_fields'
    | 'invalid_file'
    | 'not_open'
    | 'not_accepted'
    | 'already_submitted'
    | 'server_error'
}

function safePDFName(file: File, fallback: string) {
  const base = file.name
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .slice(0, 80)
  return `${base || fallback}.pdf`
}

async function uploadWorkflowManuscript({
  file,
  kind,
  locale,
  revisionRound,
  submission,
}: {
  file: File | null
  kind: Exclude<SubmissionFileKind, 'original-review'>
  locale: 'fr' | 'en'
  revisionRound?: number
  submission: number
}): Promise<WorkflowUploadResult> {
  try {
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers: await headers() })
    if (!user || !isPortalRole(user.role)) return { success: false, error: 'unauthorized' }
    if (!file || file.size === 0) return { success: false, error: 'missing_fields' }
    if (file.type !== 'application/pdf' || file.size > SUBMISSION_FILE_LIMIT) {
      return { success: false, error: 'invalid_file' }
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    if (!hasPdfSignature(buffer)) return { success: false, error: 'invalid_file' }

    await payload.create({
      collection: 'submission-files',
      data: {
        author: user.id,
        kind,
        revisionRound,
        submission,
      },
      file: {
        data: buffer,
        mimetype: 'application/pdf',
        name: safePDFName(file, kind),
        size: file.size,
      },
      overrideAccess: false,
      user,
    })
    revalidatePath(`/${locale}/account`)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/already been submitted|already submitted/i.test(message)) {
      return { success: false, error: 'already_submitted' }
    }
    if (/not open|deadline/i.test(message)) return { success: false, error: 'not_open' }
    if (/acceptance|accepted submission/i.test(message)) {
      return { success: false, error: 'not_accepted' }
    }
    console.error('Workflow manuscript upload error', error)
    return { success: false, error: 'server_error' }
  }
}

export async function uploadRevisionManuscript(
  formData: FormData,
  locale: 'fr' | 'en',
): Promise<WorkflowUploadResult> {
  const roundID = Number(formData.get('revisionRound'))
  const submissionID = Number(formData.get('submission'))
  if (!Number.isInteger(roundID) || !Number.isInteger(submissionID)) {
    return { success: false, error: 'missing_fields' }
  }
  return uploadWorkflowManuscript({
    file: formData.get('file') as File | null,
    kind: 'revision',
    locale,
    revisionRound: roundID,
    submission: submissionID,
  })
}

export async function uploadCameraReadyManuscript(
  formData: FormData,
  locale: 'fr' | 'en',
): Promise<WorkflowUploadResult> {
  const submissionID = Number(formData.get('submission'))
  if (!Number.isInteger(submissionID)) return { success: false, error: 'missing_fields' }
  return uploadWorkflowManuscript({
    file: formData.get('file') as File | null,
    kind: 'camera-ready',
    locale,
    submission: submissionID,
  })
}
