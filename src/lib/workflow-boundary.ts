import { APIError, type PayloadRequest } from 'payload'

import { isSubmissionWindowOpen } from '@/lib/workflow-policy'

export function relationshipID(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'number') {
    return value.id
  }
  return null
}

export async function requireLiveEdition(req: PayloadRequest, editionValue: unknown) {
  const editionID = relationshipID(editionValue)
  if (editionID === null) {
    throw new APIError('A valid edition is required.', 400, undefined, true)
  }

  const edition = await req.payload.findByID({
    collection: 'editions',
    id: editionID,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (edition._status !== 'published' || edition.editionStatus !== 'live') {
    throw new APIError(
      'The selected edition is not the published live edition.',
      400,
      undefined,
      true,
    )
  }

  return edition
}

export async function requireOpenSubmissionEdition(req: PayloadRequest, editionValue: unknown) {
  const edition = await requireLiveEdition(req, editionValue)
  if (!isSubmissionWindowOpen(edition)) {
    throw new APIError('Submissions are closed.', 400, undefined, true)
  }
  return edition
}

export async function requireOpenRegistrationEdition(req: PayloadRequest, editionValue: unknown) {
  const edition = await requireLiveEdition(req, editionValue)
  if (!edition.registrationEnabled) {
    throw new APIError('Registrations are closed.', 400, undefined, true)
  }
  return edition
}

export async function requireAnyOpenSubmissionEdition(req: PayloadRequest) {
  const result = await req.payload.find({
    collection: 'editions',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: {
      and: [
        { _status: { equals: 'published' } },
        { editionStatus: { equals: 'live' } },
        { submissionsEnabled: { equals: true } },
        { submissionDeadline: { greater_than: new Date().toISOString() } },
      ],
    },
  })

  if (result.totalDocs === 0) {
    throw new APIError('Submissions are closed.', 400, undefined, true)
  }
}
