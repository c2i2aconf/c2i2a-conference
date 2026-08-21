import type { CollectionConfig } from 'payload'
import { submissionDecisionEmail } from '@/emails/templates'
import { shouldSendDecisionEmail } from '@/lib/workflow-policy'

import {
  isAdmin,
  isAdminField,
  isAdminOrReviewer,
  isAdminOrReviewerField,
  isAdminReviewerOrAuthor,
  isPortalUserOrAdmin,
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
    create: isPortalUserOrAdmin,
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
      access: { update: isAdminField },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ user }: { user?: { id: string } | null }) => user?.id,
      access: { update: isAdminField },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      access: { update: isAdminField },
    },
    {
      name: 'abstract',
      type: 'textarea',
      required: true,
      access: { update: isAdminField },
    },
    {
      name: 'file',
      type: 'upload',
      relationTo: 'submission-files',
      required: true,
      access: { update: isAdminField },
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
      access: { update: isAdminField },
      admin: { position: 'sidebar', readOnly: true },
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
        create: isAdminField,
        update: isAdminOrReviewerField,
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'reviewNotes',
      type: 'textarea',
      access: {
        read: isAdminOrReviewerField,
        create: isAdminOrReviewerField,
        update: isAdminOrReviewerField,
      },
      admin: { position: 'sidebar' },
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
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (!shouldSendDecisionEmail(operation, previousDoc?.status, doc.status)) {
          return doc
        }

        try {
          const authorId = typeof doc.author === 'object' ? doc.author.id : doc.author
          const author = await req.payload.findByID({
            collection: 'users',
            id: authorId,
            overrideAccess: true,
          })
          await req.payload.sendEmail({
            to: author.email,
            subject:
              doc.locale === 'en'
                ? 'Decision on your submission — C2I2A'
                : 'Décision concernant votre soumission — C2I2A',
            html: await submissionDecisionEmail({
              locale: doc.locale === 'en' ? 'en' : 'fr',
              title: doc.title,
              status: doc.status,
              notes: doc.reviewNotes,
            }),
          })
        } catch (error) {
          req.payload.logger.error({ err: error }, 'Submission decision email could not be sent')
        }
        return doc
      },
    ],
  },
}
