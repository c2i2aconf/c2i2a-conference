import type { CollectionConfig } from 'payload'
import { canReadParticipantWorkflow, isAdminOrEditor, isAdminOrEditorField } from '../access'
import { relationshipID } from '../lib/workflow-boundary'
import {
  assertScope,
  isOrganizer,
  paymentState,
  registrationFor,
  workflowError,
} from '../lib/registration-workflow'

/** Durable organizer-authored text artifact. PDF rendering and official templates are separate. */
export const InvitationLetters: CollectionConfig = {
  slug: 'invitation-letters',
  admin: { group: 'Workflow', defaultColumns: ['registration', 'status', 'issuedAt'] },
  access: {
    create: isAdminOrEditor,
    read: async (args) => {
      if (isOrganizer(args.req.user)) return true
      const owner = await canReadParticipantWorkflow(args)
      return owner && typeof owner === 'object'
        ? { and: [owner, { status: { equals: 'issued' } }] }
        : false
    },
    update: isAdminOrEditor,
    delete: () => false,
    readVersions: isAdminOrEditor,
  },
  versions: { maxPerDoc: 0 },
  fields: [
    {
      name: 'registration',
      type: 'relationship',
      relationTo: 'registrations',
      required: true,
      unique: true,
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
      admin: { readOnly: true },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: ['draft', 'issued'],
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      admin: {
        description:
          'Organizer-approved letter text. No automatic signatures or declarations are added.',
      },
    },
    { name: 'recipientName', type: 'text', admin: { readOnly: true } },
    { name: 'recipientEmail', type: 'email', admin: { readOnly: true } },
    { name: 'organizerNote', type: 'textarea', access: { read: isAdminOrEditorField } },
    { name: 'issuedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'issuedAt', type: 'date', admin: { readOnly: true } },
    {
      name: 'eligibilityBasis',
      type: 'select',
      options: ['verified', 'exempt'],
      admin: { readOnly: true },
    },
    {
      name: 'verifiedProof',
      type: 'relationship',
      relationTo: 'payment-proofs',
      admin: { readOnly: true },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, originalDoc, req }) => {
        if (!data) return data
        if (!isOrganizer(req.user)) workflowError('Only organizers may issue invitations.', 403)
        if (originalDoc?.status === 'issued') workflowError('Issued invitations are immutable.')
        if (
          operation === 'update' &&
          data.registration !== undefined &&
          relationshipID(data.registration) !== relationshipID(originalDoc?.registration)
        )
          workflowError('Invitation registration is immutable.')
        const registration = await registrationFor(
          req,
          operation === 'create' ? data.registration : originalDoc?.registration,
        )
        if (operation === 'update') {
          const current = await req.payload.findByID({
            collection: 'invitation-letters',
            id: originalDoc!.id,
            depth: 0,
            req,
            overrideAccess: false,
          })
          if (current.status === 'issued') workflowError('Issued invitations are immutable.')
        }
        assertScope(data, registration)
        if (relationshipID(registration.user) === req.user?.id)
          workflowError('An organizer cannot issue their own invitation.', 403)
        if (!registration.user || !registration.feeDetails || registration.status !== 'confirmed')
          workflowError('A valid scoped registration is required.')
        const details = await req.payload.findByID({
          collection: 'conference-details',
          id: relationshipID(registration.feeDetails)!,
          depth: 0,
          req,
          overrideAccess: false,
          locale: 'fr',
          fallbackLocale: 'fr',
        })
        if (relationshipID(details.edition) !== relationshipID(registration.edition))
          workflowError('Fee configuration no longer belongs to this edition.', 400)
        if (!details.invitationLettersAvailable)
          workflowError('Invitation letters are not enabled for this edition.')
        const status = data.status ?? originalDoc?.status ?? 'draft'
        const basis = await paymentState(req, registration)
        if (status === 'issued' && basis !== 'verified' && basis !== 'exempt')
          workflowError('Issuance requires verified payment or an approved exemption.')
        const proof =
          status === 'issued' && basis === 'verified'
            ? await req.payload.find({
                collection: 'payment-proofs',
                limit: 1,
                depth: 0,
                req,
                overrideAccess: false,
                where: {
                  and: [
                    { registration: { equals: registration.id } },
                    { status: { equals: 'verified' } },
                  ],
                },
              })
            : null
        return {
          ...data,
          registration: registration.id,
          edition: relationshipID(registration.edition),
          user: relationshipID(registration.user),
          recipientName: `${registration.firstName} ${registration.lastName}`,
          recipientEmail: registration.email,
          issuedBy: status === 'issued' ? req.user!.id : null,
          issuedAt: status === 'issued' ? new Date().toISOString() : null,
          eligibilityBasis: status === 'issued' ? basis : null,
          verifiedProof: proof?.docs[0]?.id ?? null,
        }
      },
    ],
  },
}
