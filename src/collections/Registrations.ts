import { APIError, type CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrSelf } from '../access'
import { revalidateSiteAfterChange, revalidateSiteAfterDelete } from '../hooks/revalidateSite'
import { requireLiveEdition } from '../lib/workflow-boundary'

/**
 * Free attendee registrations.
 * Public create (form) → confirmation email via Resend.
 * `user` gets linked once the attendee signs in with a magic link.
 */
export const Registrations: CollectionConfig = {
  slug: 'registrations',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['firstName', 'lastName', 'email', 'status', 'edition'],
    group: 'Workflow',
  },
  access: {
    // Registration is free and open; the API route validates input server-side
    create: anyone,
    read: isAdminOrSelf,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
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
      async ({ data, req, operation }) => {
        if (operation !== 'create' || !data) return data
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
        const edition = await requireLiveEdition(req, data.edition)
        const duplicate = await req.payload.find({
          collection: 'registrations',
          depth: 0,
          limit: 1,
          overrideAccess: true,
          req,
          where: {
            and: [{ email: { equals: email } }, { edition: { equals: edition.id } }],
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
        if (req.user?.role === 'admin') return normalized
        const currentUser = req.user
        const user =
          currentUser && currentUser.email.toLowerCase() === email ? currentUser.id : undefined
        return {
          ...normalized,
          user,
          status: 'confirmed',
          checkedIn: false,
        }
      },
    ],
  },
}
