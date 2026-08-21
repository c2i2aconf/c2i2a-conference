import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminField, isAdminReviewerOrAuthor, isPortalUserOrAdmin } from '../access'

/**
 * Private upload collection for paper submissions (PDF only).
 * Separate from `media` so public images and private papers never mix.
 */
export const SubmissionFiles: CollectionConfig = {
  slug: 'submission-files',
  admin: {
    group: 'Workflow',
  },
  access: {
    read: isAdminReviewerOrAuthor,
    create: isPortalUserOrAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ user }: { user?: { id: string } | null }) => user?.id,
      access: { update: isAdminField },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, req, operation }) => {
        if (operation === 'create' && req.user && req.user.role !== 'admin') {
          return { ...data, author: req.user.id }
        }
        return data
      },
    ],
  },
  upload: {
    mimeTypes: ['application/pdf'],
    crop: false,
    focalPoint: false,
  },
}
