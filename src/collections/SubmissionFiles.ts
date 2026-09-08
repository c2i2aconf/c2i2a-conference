import { APIError, type CollectionConfig } from 'payload'

import { isAdmin, isAdminField, isAdminReviewerOrAuthor, isPortalUserOrAdmin } from '../access'
import { requireAnyOpenSubmissionEdition } from '../lib/workflow-boundary'
import { hasPdfSignature, SUBMISSION_FILE_LIMIT } from '../lib/workflow-policy'

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
      async ({ data, req, operation }) => {
        if (operation !== 'create') return data
        await requireAnyOpenSubmissionEdition(req)

        const file = req.file
        if (
          !file ||
          file.mimetype !== 'application/pdf' ||
          file.size > SUBMISSION_FILE_LIMIT ||
          !hasPdfSignature(file.data)
        ) {
          throw new APIError('A valid PDF file of at most 4 MB is required.', 400, undefined, true)
        }
        if (req.user && req.user.role !== 'admin') {
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
