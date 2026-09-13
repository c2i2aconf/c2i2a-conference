import { randomUUID } from 'node:crypto'
import type { CollectionConfig } from 'payload'
import { canReadParticipantWorkflow, isAdminOrEditor } from '../access'
import { isPortalRole } from '../lib/workflow-policy'
import { relationshipID } from '../lib/workflow-boundary'
import {
  assertScope,
  isOrganizer,
  latestProof,
  proofFormat,
  registrationFor,
  workflowError,
} from '../lib/registration-workflow'

export const PaymentProofs: CollectionConfig = {
  slug: 'payment-proofs',
  admin: { group: 'Workflow', defaultColumns: ['registration', 'status', 'sequence', 'createdAt'] },
  access: {
    create: ({ req }) => isPortalRole(req.user?.role),
    read: canReadParticipantWorkflow,
    update: isAdminOrEditor,
    delete: () => false,
    readVersions: isAdminOrEditor,
  },
  versions: { maxPerDoc: 0 },
  upload: {
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    crop: false,
    focalPoint: false,
  },
  fields: [
    {
      name: 'registration',
      type: 'relationship',
      relationTo: 'registrations',
      required: true,
      index: true,
    },
    {
      name: 'edition',
      type: 'relationship',
      relationTo: 'editions',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    { name: 'sequence', type: 'number', required: true, admin: { readOnly: true } },
    { name: 'proofKey', type: 'text', unique: true, admin: { hidden: true } },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'submitted',
      required: true,
      options: ['submitted', 'verified', 'rejected'],
    },
    {
      name: 'reviewComment',
      type: 'textarea',
      admin: { description: 'Visible to the participant. Required for rejection.' },
    },
    { name: 'reviewedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'reviewedAt', type: 'date', admin: { readOnly: true } },
  ],
  hooks: {
    beforeOperation: [
      ({ args, operation, req }) => {
        if (operation === 'update' && req.file) workflowError('Payment-proof files are immutable.')
        if (operation === 'create') {
          const format = req.file && proofFormat(req.file)
          if (!format) workflowError('A valid PDF, JPEG or PNG of at most 4 MB is required.', 400)
          req.file!.name = `proof-${randomUUID()}.${format === 'jpeg' ? 'jpg' : format}`
        }
        return args
      },
    ],
    beforeValidate: [
      async ({ data, operation, originalDoc, req }) => {
        if (!data) return data
        const registration = await registrationFor(
          req,
          operation === 'create' ? data.registration : originalDoc?.registration,
        )
        assertScope(data, registration)
        if (
          registration.status !== 'confirmed' ||
          !registration.feeCategory ||
          registration.feeExempt
        )
          workflowError('This registration cannot receive payment proof.')
        if (operation === 'create') {
          if (
            !req.user ||
            !isPortalRole(req.user.role) ||
            relationshipID(registration.user) !== req.user.id
          )
            workflowError('Only the registration owner may upload proof.', 403)
          if (data.status && data.status !== 'submitted')
            workflowError('Participants cannot approve proof.', 403)
          const details = await req.payload.findByID({
            collection: 'conference-details',
            id: relationshipID(registration.feeDetails)!,
            depth: 0,
            locale: 'fr',
            fallbackLocale: 'fr',
            req,
            overrideAccess: false,
          })
          const format = req.file && proofFormat(req.file)
          if (relationshipID(details.edition) !== relationshipID(registration.edition))
            workflowError('Fee configuration no longer belongs to this edition.', 400)
          if (!format || !details.paymentProofFormats?.includes(format))
            workflowError('The file does not meet the configured payment-proof policy.', 400)
          const previous = await latestProof(req, registration.id)
          if (previous && previous.status !== 'rejected')
            workflowError('Only rejected proof can be replaced.')
          const sequence = (previous?.sequence ?? 0) + 1
          return {
            ...data,
            prefix: 'payment-proofs',
            registration: registration.id,
            edition: relationshipID(registration.edition),
            user: req.user.id,
            sequence,
            proofKey: `${registration.id}:${sequence}`,
            status: 'submitted',
            reviewComment: null,
            reviewedBy: null,
            reviewedAt: null,
          }
        }
        if (!isOrganizer(req.user) || relationshipID(registration.user) === req.user?.id)
          workflowError('Only an independent organizer may review proof.', 403)
        const current = await req.payload.findByID({
          collection: 'payment-proofs',
          id: originalDoc!.id,
          depth: 0,
          req,
          overrideAccess: false,
        })
        if (
          req.file ||
          current.status !== 'submitted' ||
          !['verified', 'rejected'].includes(data.status)
        )
          workflowError('Only submitted proof may be verified or rejected; files are immutable.')
        for (const field of [
          'registration',
          'edition',
          'user',
          'sequence',
          'proofKey',
          'filename',
          'mimeType',
          'filesize',
          'url',
          'prefix',
        ]) {
          if (
            data[field] !== undefined &&
            JSON.stringify(data[field]) !== JSON.stringify(originalDoc?.[field])
          )
            workflowError('Proof identity and file are immutable.')
        }
        if (data.status === 'rejected' && !data.reviewComment?.trim())
          workflowError('An author-safe rejection comment is required.', 400)
        return { ...data, reviewedBy: req.user!.id, reviewedAt: new Date().toISOString() }
      },
    ],
  },
}
