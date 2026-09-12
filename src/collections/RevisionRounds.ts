import type { CollectionConfig, FieldAccess } from 'payload'

import { canReadRevisionRounds, isAdminOrEditor } from '@/access'
import { revisionRequestEmail } from '@/emails/templates'
import { getServerURL } from '@/lib/server-url'
import {
  releaseCompletedReviews,
  REVISION_TRANSITION_CONTEXT,
  validateRevisionRound,
} from '@/lib/revision-workflow'
import { relationshipID } from '@/lib/workflow-boundary'

const isEditorial: FieldAccess = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'editor'

export const RevisionRounds: CollectionConfig = {
  slug: 'revision-rounds',
  admin: {
    useAsTitle: 'roundKey',
    defaultColumns: ['submission', 'roundNumber', 'status', 'deadline', 'requestedAt'],
    description: 'Each record is one preserved editorial revision request and author resubmission.',
    group: 'Workflow',
  },
  access: {
    create: isAdminOrEditor,
    read: canReadRevisionRounds,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'edition',
      type: 'relationship',
      relationTo: 'editions',
      required: true,
      index: true,
      access: { update: () => false },
      admin: { readOnly: true },
    },
    {
      name: 'submission',
      type: 'relationship',
      relationTo: 'submissions',
      required: true,
      index: true,
      access: { update: () => false },
    },
    {
      name: 'roundNumber',
      type: 'number',
      required: true,
      min: 1,
      access: { update: () => false },
      admin: { readOnly: true },
    },
    {
      name: 'requestedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      access: { read: isEditorial, update: () => false },
      admin: { readOnly: true },
    },
    {
      name: 'requestedAt',
      type: 'date',
      required: true,
      access: { update: () => false },
      admin: { readOnly: true },
    },
    { name: 'deadline', type: 'date' },
    { name: 'instructions', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: [
        { label: 'Open for author resubmission', value: 'open' },
        { label: 'Revision submitted', value: 'submitted' },
        { label: 'Closed without resubmission', value: 'closed' },
      ],
      access: { update: () => false },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'revisedManuscript',
      type: 'upload',
      relationTo: 'submission-files',
      access: { update: () => false },
      admin: { readOnly: true },
    },
    {
      name: 'resubmittedAt',
      type: 'date',
      access: { update: () => false },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'roundKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: { read: isEditorial, update: () => false },
      admin: { hidden: true },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, originalDoc, req }) =>
        validateRevisionRound({
          data: data as Record<string, unknown> | undefined,
          operation,
          originalDoc: originalDoc as Record<string, unknown> | undefined,
          req,
        }),
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc
        const submissionID = relationshipID(doc.submission)
        if (submissionID === null) return doc

        await releaseCompletedReviews(req, submissionID)
        await req.payload.update({
          collection: 'submissions',
          id: submissionID,
          data: { status: 'revision-required' },
          context: { [REVISION_TRANSITION_CONTEXT]: true },
          overrideAccess: true,
          req,
        })

        try {
          const submission = await req.payload.findByID({
            collection: 'submissions',
            id: submissionID,
            depth: 0,
            overrideAccess: true,
            req,
          })
          const authorID = relationshipID(submission.author)
          if (authorID === null) return doc
          const author = await req.payload.findByID({
            collection: 'users',
            id: authorID,
            overrideAccess: true,
            req,
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
                { submission: { equals: submissionID } },
                { status: { equals: 'completed' } },
                { releasedToAuthorAt: { exists: true } },
              ],
            },
          })
          const locale = submission.locale === 'en' ? 'en' : 'fr'
          await req.payload.sendEmail({
            to: author.email,
            subject:
              locale === 'en'
                ? 'Revision requested for your submission — C2I2A'
                : 'Révision demandée pour votre soumission — C2I2A',
            html: await revisionRequestEmail({
              accountUrl: `${getServerURL()}/${locale}/account`,
              deadline: doc.deadline,
              instructions: doc.instructions,
              locale,
              roundNumber: doc.roundNumber,
              title: submission.title,
              reviewReports: reviews.docs.map((review) => review.authorComments),
            }),
          })
        } catch (error) {
          req.payload.logger.error({ err: error }, 'Revision-request email could not be sent')
        }
        return doc
      },
    ],
  },
  timestamps: true,
  versions: { maxPerDoc: 50 },
}
