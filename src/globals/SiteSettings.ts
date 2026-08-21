import type { GlobalConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'

/** Global site settings — editable by admins, applies across all editions. */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  admin: {
    group: 'Admin',
  },
  access: {
    read: anyone,
    update: isAdminOrEditor,
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      required: true,
      localized: true,
      defaultValue: 'C2I2A',
    },
    {
      name: 'siteTagline',
      type: 'text',
      localized: true,
    },
    {
      name: 'organizationName',
      type: 'text',
      localized: true,
      required: true,
      defaultValue: 'HEEC Marrakech',
    },
    {
      name: 'organizationAddress',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'copyrightText',
      type: 'text',
      localized: true,
    },
    {
      name: 'contactEmail',
      type: 'email',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'socials',
      type: 'array',
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: ['facebook', 'instagram', 'linkedin', 'youtube', 'x'].map((v) => ({
            label: v.charAt(0).toUpperCase() + v.slice(1),
            value: v,
          })),
        },
        { name: 'url', type: 'text', required: true },
      ],
    },
  ],
}
