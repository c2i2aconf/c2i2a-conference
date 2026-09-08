import { APIError, type CollectionConfig } from 'payload'
import { submissionDecisionEmail } from '@/emails/templates'
import { shouldSendDecisionEmail } from '@/lib/workflow-policy'
import { relationshipID, requireOpenSubmissionEdition } from '@/lib/workflow-boundary'

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
      async ({ data, req, operation }) => {
        if (operation !== 'create' || !data) return data
        const title = typeof data.title === 'string' ? data.title.trim() : data.title
        const abstract = typeof data.abstract === 'string' ? data.abstract.trim() : data.abstract
        if (!title || !abstract) {
          throw new APIError('A title and abstract are required.', 400, undefined, true)
        }
        await requireOpenSubmissionEdition(req, data.edition)

        if (req.user && req.user.role !== 'admin') {
          const fileID = relationshipID(data.file)
          if (fileID === null) {
            throw new APIError('A valid submission file is required.', 400, undefined, true)
          }
          const file = await req.payload.findByID({
            collection: 'submission-files',
            id: fileID,
            depth: 0,
            overrideAccess: false,
            req,
            user: req.user,
          })
          if (relationshipID(file.author) !== req.user.id) {
            throw new APIError(
              'The submission file must belong to the author.',
              403,
              undefined,
              true,
            )
          }
          return {
            ...data,
            abstract,
            author: req.user.id,
            reviewNotes: undefined,
            status: 'pending',
            title,
          }
        }
        return { ...data, abstract, title }
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
