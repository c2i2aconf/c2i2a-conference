import { APIError, type CollectionConfig, type FieldAccess } from 'payload'
import { submissionDecisionEmail } from '@/emails/templates'
import { shouldSendDecisionEmail } from '@/lib/workflow-policy'
import { relationshipID, requireOpenSubmissionEdition } from '@/lib/workflow-boundary'

import {
  canReadSubmissions,
  isAdmin,
  isAdminField,
  isAdminOrEditor,
  isAdminOrEditorField,
  isPortalUserOrAdmin,
} from '../access'

const canReadAuthorDecisionComments: FieldAccess = ({ doc, req: { user } }) => {
  if (user?.role === 'admin' || user?.role === 'editor') return true
  return (
    doc?.status === 'revision-required' || doc?.status === 'accepted' || doc?.status === 'rejected'
  )
}

/**
 * Paper / abstract submissions by authors.
 * Reviewer reports live in reviewer-assignments; editors make the final decision here.
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
    read: canReadSubmissions,
    update: isAdminOrEditor,
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
        { label: 'Revision / conditional acceptance', value: 'revision-required' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
      ],
      access: {
        create: isAdminField,
        update: isAdminOrEditorField,
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'reviewNotes',
      label: 'Editor-only notes',
      type: 'textarea',
      access: {
        read: isAdminOrEditorField,
        create: isAdminOrEditorField,
        update: isAdminOrEditorField,
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'authorDecisionComments',
      label: 'Decision comments for the author',
      type: 'textarea',
      access: {
        read: canReadAuthorDecisionComments,
        create: isAdminOrEditorField,
        update: isAdminOrEditorField,
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'reviewState',
      type: 'select',
      required: true,
      defaultValue: 'unassigned',
      options: [
        { label: 'Unassigned', value: 'unassigned' },
        { label: 'In review', value: 'in-review' },
        { label: 'Ready for editorial decision', value: 'ready-for-decision' },
        { label: 'Third review recommended', value: 'third-review-recommended' },
        { label: 'Third review in progress', value: 'third-review-in-progress' },
      ],
      access: {
        read: isAdminOrEditorField,
        create: () => false,
        update: () => false,
      },
      admin: { position: 'sidebar', readOnly: true },
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
            authorDecisionComments: undefined,
            reviewNotes: undefined,
            reviewState: 'unassigned',
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
          const reviews = await req.payload.find({
            collection: 'reviewer-assignments',
            depth: 0,
            overrideAccess: true,
            pagination: false,
            req,
            sort: 'reviewerNumber',
            where: {
              and: [
                { submission: { equals: doc.id } },
                { status: { equals: 'completed' } },
              ],
            },
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
              decisionComments: doc.authorDecisionComments,
              reviewReports: reviews.docs.map((review) => review.authorComments),
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
