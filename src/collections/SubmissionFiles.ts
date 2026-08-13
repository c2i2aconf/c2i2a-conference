import type { CollectionConfig } from 'payload'

import { isAdminOrReviewer, isAdminReviewerOrAuthor, isAuthenticated } from '../access'

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
    create: isAuthenticated,
    update: isAdminOrReviewer,
    delete: isAdminOrReviewer,
  },
  fields: [
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ user }: { user?: { id: string } | null }) => user?.id,
    },
  ],
  upload: {
    mimeTypes: ['application/pdf'],
  },
}
