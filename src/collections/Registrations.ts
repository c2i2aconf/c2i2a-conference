import { APIError, type CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor, canReadParticipantWorkflow } from '../access'
import { revalidateSiteAfterChange, revalidateSiteAfterDelete } from '../hooks/revalidateSite'
import { requireOpenRegistrationEdition } from '../lib/workflow-boundary'
import { relationshipID } from '../lib/workflow-boundary'
import { isPortalRole } from '../lib/workflow-policy'
import { isOrganizer, lockRegistration, workflowError } from '../lib/registration-workflow'

/**
 * Participant registrations. Legacy free editions retain email-first registration;
 * configured fee editions require an authenticated owner and an immutable fee snapshot.
 */
export const Registrations: CollectionConfig = {
  slug: 'registrations',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['firstName', 'lastName', 'email', 'status', 'edition'],
    group: 'Workflow',
  },
  access: {
    // Fee editions require authenticated ownership in the hook; legacy free forms remain supported.
    create: anyone,
    read: canReadParticipantWorkflow,
    update: isAdminOrEditor,
    delete: ({ req }) => (req.user?.role === 'admin' ? { feeCategory: { exists: false } } : false),
    readVersions: isAdminOrEditor,
  },
  versions: { maxPerDoc: 0 },
  fields: [
    { name: 'activePersonKey', type: 'text', unique: true, admin: { hidden: true } },
    { name: 'activeEmailKey', type: 'text', unique: true, admin: { hidden: true } },
    {
      name: 'feeDetails',
      type: 'relationship',
      relationTo: 'conference-details',
      admin: { readOnly: true },
    },
    {
      name: 'feeCategory',
      type: 'text',
      admin: {
        description:
          'Exact fee code from this edition’s conference details. Immutable after registration.',
      },
    },
    { name: 'feeLabel', type: 'text', admin: { readOnly: true } },
    { name: 'feeAmount', type: 'number', admin: { readOnly: true } },
    { name: 'feeCurrency', type: 'select', options: ['MAD', 'EUR'] },
    { name: 'feeExempt', type: 'checkbox', admin: { readOnly: true } },
    {
      name: 'exemptionApproved',
      type: 'checkbox',
      admin: {
        description: 'Organizer approval of the selected exempt category; no payment is created.',
      },
    },
    {
      name: 'exemptionApprovedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
    { name: 'exemptionApprovedAt', type: 'date', admin: { readOnly: true } },
    {
      name: 'edition',
      type: 'relationship',
      relationTo: 'editions',
      required: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'Linked automatically after magic-link sign-in' },
    },
    {
      type: 'row',
      fields: [
        { name: 'firstName', type: 'text', required: true },
        { name: 'lastName', type: 'text', required: true },
      ],
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'locale',
      type: 'select',
      required: true,
      defaultValue: 'fr',
      options: [
        { label: 'Français', value: 'fr' },
        { label: 'English', value: 'en' },
      ],
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      type: 'row',
      fields: [
        { name: 'affiliation', type: 'text' },
        { name: 'country', type: 'text' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'confirmed',
      options: [
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'checkedIn',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Marked at the venue on conference day',
      },
    },
  ],
  hooks: {
    afterChange: [revalidateSiteAfterChange],
    afterDelete: [revalidateSiteAfterDelete],
    beforeValidate: [
      async ({ data, req, operation, originalDoc }) => {
        if (!data) return data
        if (operation === 'update') {
          if (originalDoc?.feeCategory) {
            if (!isOrganizer(req.user))
              workflowError('Only organizers may update a fee registration.', 403)
            await lockRegistration(req, originalDoc.id)
            const current = await req.payload.findByID({
              collection: 'registrations',
              id: originalDoc.id,
              depth: 0,
              req,
              overrideAccess: false,
            })
            if (current.updatedAt !== originalDoc.updatedAt)
              workflowError('Registration changed concurrently. Reload before retrying.')
            for (const field of [
              'edition',
              'user',
              'email',
              'firstName',
              'lastName',
              'feeDetails',
              'feeCategory',
              'feeLabel',
              'feeAmount',
              'feeCurrency',
              'feeExempt',
            ]) {
              const oldValue = originalDoc[field]
              const newValue = data[field]
              if (newValue !== undefined && JSON.stringify(newValue) !== JSON.stringify(oldValue))
                workflowError('Registration identity and fee snapshot are immutable.')
            }
            if (originalDoc.status === 'cancelled' && data.status && data.status !== 'cancelled')
              workflowError('Cancelled registrations cannot be reactivated.')
            if (data.status === 'cancelled') {
              const letters = await req.payload.find({
                collection: 'invitation-letters',
                depth: 0,
                limit: 1,
                req,
                overrideAccess: false,
                where: {
                  and: [
                    { registration: { equals: originalDoc.id } },
                    { status: { equals: 'issued' } },
                  ],
                },
              })
              if (letters.totalDocs)
                workflowError(
                  'An issued invitation prevents cancellation; organizer follow-up is required.',
                )
            }
            if (data.exemptionApproved && !originalDoc.exemptionApprovedAt) {
              if (!originalDoc.feeExempt || relationshipID(originalDoc.user) === req.user?.id)
                workflowError(
                  'Only an independent organizer may approve the configured exemption.',
                  403,
                )
              data.exemptionApprovedBy = req.user!.id
              data.exemptionApprovedAt = new Date().toISOString()
            } else {
              data.exemptionApproved = originalDoc.exemptionApproved
              data.exemptionApprovedBy = originalDoc.exemptionApprovedBy
              data.exemptionApprovedAt = originalDoc.exemptionApprovedAt
            }
          } else {
            // Legacy linking after verified magic-link consumption may set user, never fee obligations.
            for (const field of [
              'feeDetails',
              'feeCategory',
              'feeLabel',
              'feeAmount',
              'feeCurrency',
              'feeExempt',
              'exemptionApproved',
              'exemptionApprovedBy',
              'exemptionApprovedAt',
            ])
              data[field] = originalDoc?.[field]
          }
          const next = { ...originalDoc, ...data }
          return {
            ...data,
            activePersonKey:
              next.status === 'cancelled' || !next.user
                ? null
                : `${relationshipID(next.edition)}:${relationshipID(next.user)}`,
            activeEmailKey:
              next.status === 'cancelled'
                ? null
                : `${relationshipID(next.edition)}:${next.email.toLowerCase()}`,
          }
        }
        const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : data.email
        const firstName =
          typeof data.firstName === 'string' ? data.firstName.trim() : data.firstName
        const lastName = typeof data.lastName === 'string' ? data.lastName.trim() : data.lastName
        const affiliation =
          typeof data.affiliation === 'string' ? data.affiliation.trim() : data.affiliation
        const country = typeof data.country === 'string' ? data.country.trim() : data.country
        if (
          !firstName ||
          !lastName ||
          typeof email !== 'string' ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
          throw new APIError(
            'First name, last name, and a valid email are required.',
            400,
            undefined,
            true,
          )
        }
        const edition = await requireOpenRegistrationEdition(req, data.edition)
        const detailsResult = await req.payload.find({
          collection: 'conference-details',
          where: { edition: { equals: edition.id } },
          depth: 0,
          limit: 1,
          locale: data.locale === 'en' ? 'en' : 'fr',
          fallbackLocale: 'fr',
          req,
          overrideAccess: false,
        })
        const details = detailsResult.docs[0]
        const feeWorkflow = Boolean(details?.registrationFees?.length || details?.paymentRequired)
        let snapshot = {
          feeDetails: null as number | null,
          feeCategory: null as string | null,
          feeLabel: null as string | null,
          feeAmount: null as number | null,
          feeCurrency: null as 'MAD' | 'EUR' | null,
          feeExempt: false,
        }
        if (feeWorkflow) {
          if (!req.user || (!isPortalRole(req.user.role) && !isOrganizer(req.user)))
            workflowError('Sign in before selecting a registration fee.', 403)
          if (
            !isOrganizer(req.user) &&
            (email !== req.user.email.toLowerCase() ||
              (data.user != null && relationshipID(data.user) !== req.user.id))
          )
            workflowError('Participants may register only themselves.', 403)
          const ownerID = isOrganizer(req.user) ? relationshipID(data.user) : req.user.id
          if (!ownerID) workflowError('A participant account is required.', 400)
          const owner = await req.payload.findByID({
            collection: 'users',
            id: ownerID,
            depth: 0,
            req,
            overrideAccess: true,
          })
          if (owner.email.toLowerCase() !== email)
            workflowError('Registration email must match the participant account.', 400)
          data.user = ownerID
          const fees =
            details?.registrationFees?.filter((fee) => fee.code === data.feeCategory) ?? []
          if (
            fees.length !== 1 ||
            (data.feeDetails != null && relationshipID(data.feeDetails) !== details.id)
          )
            workflowError('Select a unique fee category from this edition.', 400)
          const fee = fees[0]
          let amount = fee.amount
          let currency = fee.currency
          if (!fee.exempt && data.feeCurrency && data.feeCurrency !== currency) {
            if (data.feeCurrency !== fee.alternateCurrency)
              workflowError('Currency is not offered by this fee category.', 400)
            amount = fee.alternateAmount
            currency = fee.alternateCurrency
          }
          if (
            !fee.exempt &&
            (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || !currency)
          )
            workflowError('The fee category has no valid payment obligation.', 400)
          snapshot = {
            feeDetails: details.id,
            feeCategory: fee.code,
            feeLabel: fee.label,
            feeAmount: fee.exempt ? null : amount!,
            feeCurrency: fee.exempt ? null : currency!,
            feeExempt: Boolean(fee.exempt),
          }
        }
        const duplicate = await req.payload.find({
          collection: 'registrations',
          depth: 0,
          limit: 1,
          overrideAccess: true,
          req,
          where: {
            and: [
              { email: { equals: email } },
              { edition: { equals: edition.id } },
              { status: { equals: 'confirmed' } },
            ],
          },
        })
        if (duplicate.totalDocs > 0) {
          throw new APIError(
            'This email is already registered for the edition.',
            409,
            undefined,
            true,
          )
        }

        const normalized = {
          ...data,
          affiliation,
          country,
          edition: edition.id,
          email,
          firstName,
          lastName,
        }
        if (feeWorkflow)
          return {
            ...normalized,
            ...snapshot,
            user: data.user,
            status: 'confirmed',
            checkedIn: false,
            exemptionApproved: false,
            exemptionApprovedBy: null,
            exemptionApprovedAt: null,
            activePersonKey: `${edition.id}:${relationshipID(data.user)}`,
            activeEmailKey: `${edition.id}:${email}`,
          }
        const currentUser = req.user
        const user =
          currentUser && currentUser.email.toLowerCase() === email ? currentUser.id : undefined
        return {
          ...normalized,
          ...snapshot,
          user,
          status: 'confirmed',
          checkedIn: false,
          exemptionApproved: false,
          exemptionApprovedBy: null,
          exemptionApprovedAt: null,
          activePersonKey: user ? `${edition.id}:${user}` : null,
          activeEmailKey: `${edition.id}:${email}`,
        }
      },
    ],
  },
}
