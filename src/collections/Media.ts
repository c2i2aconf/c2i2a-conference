import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'
import { revalidateSiteAfterChange, revalidateSiteAfterDelete } from '../hooks/revalidateSite'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Admin',
  },
  hooks: {
    afterChange: [revalidateSiteAfterChange],
    afterDelete: [revalidateSiteAfterDelete],
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'caption',
      type: 'text',
      localized: true,
    },
  ],
  upload: {
    mimeTypes: ['image/*'],
    crop: false,
    focalPoint: false,
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 512, position: 'centre' },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
    ],
  },
}
