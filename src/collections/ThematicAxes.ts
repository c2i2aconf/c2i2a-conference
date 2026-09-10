import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'
import { revalidateSiteAfterChange, revalidateSiteAfterDelete } from '../hooks/revalidateSite'

export const ThematicAxes: CollectionConfig = {
  slug: 'thematic-axes',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['code', 'title', 'edition', 'order'],
    group: 'Content',
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
    { name: 'edition', type: 'relationship', relationTo: 'editions', required: true, index: true },
    {
      name: 'code',
      type: 'text',
      required: true,
      admin: { description: 'Stable edition-scoped import key, e.g. AXE-01.' },
    },
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'description', type: 'textarea', localized: true },
    { name: 'order', type: 'number', required: true, defaultValue: 0 },
  ],
}
