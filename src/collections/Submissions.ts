import type { CollectionConfig } from 'payload'

import {
  isAdmin,
  isAdminOrReviewer,
  isAdminOrReviewerField,
  isAdminReviewerOrAuthor,
  isAuthenticated,
} from '../access'

/**
 * Paper / abstract submissions by authors.
 * Reviewers update status + notes → hook emails the author via Resend.
 */
export const Submissions: CollectionConfig = {
  slug: 'submissions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'status', 'createdAt'],
    group: 'Workflow',
  },
  access: {
    create: isAuthenticated,
    read: isAdminReviewerOrAuthor,
    update: isAdminOrReviewer,
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
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ user }: { user?: { id: string } | null }) => user?.id,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'abstract',
      type: 'textarea',
      required: true,
    },
    {
      name: 'file',
      type: 'upload',
      relationTo: 'submission-files',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending review', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
      ],
      access: {
        // Authors cannot change the review status
        update: isAdminOrReviewerField,
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'reviewNotes',
      type: 'textarea',
      access: {
        read: isAdminOrReviewerField,
        update: isAdminOrReviewerField,
      },
      admin: { position: 'sidebar' },
    },
  ],
}
