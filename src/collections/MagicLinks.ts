import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access'

/**
 * Passwordless sign-in tokens ("magic links").
 * Only the SHA-256 hash of the token is stored — the raw token lives only in the
 * emailed URL. Server actions create/consume these with `overrideAccess: true`.
 */
export const MagicLinks: CollectionConfig = {
  slug: 'magic-links',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'expiresAt', 'consumedAt', 'createdAt'],
    group: 'Workflow',
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      index: true,
    },
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
      index: true,
      admin: { description: 'SHA-256 of the emailed token — never the raw token' },
    },
    {
      name: 'requestIpHash',
      type: 'text',
      required: true,
      index: true,
      admin: { description: 'One-way hash used only for abuse throttling.' },
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
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
    },
    {
      name: 'consumedAt',
      type: 'date',
      admin: { description: 'Set once the link has been used (single-use tokens)' },
    },
  ],
}
