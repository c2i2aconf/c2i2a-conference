import { APIError, type PayloadRequest } from 'payload'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { relationshipID } from './workflow-boundary'
import { hasPdfSignature } from './workflow-policy'
import type { Registration } from '@/payload-types'

export const isOrganizer = (user: PayloadRequest['user']) =>
  user?.role === 'admin' || user?.role === 'editor'

export function workflowError(message: string, status = 409): never {
  throw new APIError(message, status, undefined, true)
}

/** Serialize proof review, replacement, cancellation and issuance in the Payload transaction. */
export async function lockRegistration(req: PayloadRequest, id: number) {
  const transactionID = await req.transactionID
  const adapter = req.payload.db as unknown as PostgresAdapter
  const transaction = transactionID && adapter.sessions[transactionID]?.db
  if (!transaction) workflowError('A registration transaction is required.')
  await transaction.execute(sql`SELECT id FROM registrations WHERE id = ${id} FOR UPDATE`)
}

export async function registrationFor(req: PayloadRequest, value: unknown) {
  const id = relationshipID(value)
  if (id === null) workflowError('A registration is required.', 400)
  await lockRegistration(req, id)
  return req.payload.findByID({
    collection: 'registrations',
    id,
    depth: 0,
    req,
    overrideAccess: false,
  })
}

export async function latestProof(req: PayloadRequest, registration: number) {
  const proofs = await req.payload.find({
    collection: 'payment-proofs',
    depth: 0,
    limit: 1,
    sort: '-sequence',
    req,
    overrideAccess: false,
    where: { registration: { equals: registration } },
  })
  return proofs.docs[0]
}

export async function paymentState(req: PayloadRequest, registration: Registration) {
  if (registration.feeExempt)
    return registration.exemptionApprovedAt ? 'exempt' : 'exemption-pending'
  if (!registration.feeCategory) return 'legacy'
  return (await latestProof(req, registration.id))?.status ?? 'not-submitted'
}

export const PROOF_FILE_LIMIT = 4 * 1024 * 1024
export function proofFormat(file: NonNullable<PayloadRequest['file']>) {
  if (!file.data.length || file.data.length > PROOF_FILE_LIMIT) return null
  if (file.mimetype === 'application/pdf' && hasPdfSignature(file.data)) return 'pdf'
  if (
    file.mimetype === 'image/png' &&
    file.data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return 'png'
  if (
    file.mimetype === 'image/jpeg' &&
    file.data.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
  )
    return 'jpeg'
  return null
}

export function assertScope(data: Record<string, unknown>, registration: Registration) {
  for (const [field, expected] of [
    ['edition', relationshipID(registration.edition)],
    ['user', relationshipID(registration.user)],
  ] as const) {
    if (data[field] != null && relationshipID(data[field]) !== expected)
      workflowError('Registration, user and edition must match.', 400)
  }
}
