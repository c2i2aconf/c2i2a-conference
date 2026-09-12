import type { CollectionConfig, FieldAccess } from 'payload'

import { canReadReviewerAssignments, canUpdateReviewerAssignments, isAdminOrEditor } from '@/access'
import { recomputeSubmissionReviewState, validateReviewAssignment } from '@/lib/review-workflow'
import { relationshipID } from '@/lib/workflow-boundary'

const isEditorial: FieldAccess = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'editor'

const isEditorialOrReviewer: FieldAccess = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'editor' || user?.role === 'reviewer'

const isAuthorSafe: FieldAccess = ({ req: { user } }) =>
  user?.role === 'admin' ||
  user?.role === 'editor' ||
  user?.role === 'reviewer' ||
  user?.role === 'author' ||
  user?.role === 'attendee'

export const ReviewerAssignments: CollectionConfig = {
  slug: 'reviewer-assignments',
  admin: {
    useAsTitle: 'assignmentKey',
    defaultColumns: ['submission', 'reviewer', 'reviewerNumber', 'status', 'recommendation'],
    description:
      'Assign two independent reviewers normally. Slot 3 becomes available only after differing completed primary reviews.',
    group: 'Workflow',
  },
  access: {
    create: isAdminOrEditor,
    read: canReadReviewerAssignments,
    update: canUpdateReviewerAssignments,
    delete: ({ req: { user } }) =>
      user?.role === 'admin' ? { status: { equals: 'assigned' } } : false,
  },
  fields: [
    {
      name: 'edition',
      type: 'relationship',
      relationTo: 'editions',
      required: true,
      index: true,
      access: { read: isEditorialOrReviewer, update: () => false },
      admin: { readOnly: true },
    },
    {
      name: 'submission',
      type: 'relationship',
      relationTo: 'submissions',
      required: true,
      index: true,
      access: { read: isAuthorSafe, update: () => false },
    },
    {
      name: 'reviewer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      filterOptions: { role: { equals: 'reviewer' } },
      access: { read: isEditorialOrReviewer, update: () => false },
    },
    {
      name: 'revisionRound',
      label: 'Reviewed revision round',
      type: 'relationship',
      relationTo: 'revision-rounds',
      index: true,
      access: { read: isEditorialOrReviewer, update: () => false },
      admin: {
        description: 'Leave empty only for review of the original manuscript.',
      },
    },
    {
      name: 'reviewerNumber',
      type: 'select',
      required: true,
      options: [
        { label: 'Reviewer 1', value: '1' },
        { label: 'Reviewer 2', value: '2' },
        { label: 'Reviewer 3 (disagreement)', value: '3' },
      ],
      access: { read: isEditorialOrReviewer, update: () => false },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'assigned',
      options: [
        { label: 'Assigned / draft', value: 'assigned' },
        { label: 'Completed', value: 'completed' },
      ],
      access: { read: isAuthorSafe, update: isEditorialOrReviewer },
      admin: { position: 'sidebar' },
    },
    {
      name: 'recommendation',
      type: 'select',
      options: [
        { label: 'Accept', value: 'accept' },
        { label: 'Revision / conditional acceptance', value: 'revision' },
        { label: 'Reject', value: 'reject' },
      ],
      access: { read: isAuthorSafe, update: isEditorialOrReviewer },
    },
    {
      name: 'authorComments',
      label: 'Anonymized report for the author',
      type: 'textarea',
      access: { read: isAuthorSafe, update: isEditorialOrReviewer },
    },
    {
      name: 'editorComments',
      label: 'Editor-only comments',
      type: 'textarea',
      access: { read: isEditorial, update: isEditorial },
    },
    {
      name: 'assignedAt',
      type: 'date',
      required: true,
      access: { read: isEditorialOrReviewer, update: () => false },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'submittedAt',
      type: 'date',
      access: { read: isAuthorSafe, update: () => false },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'releasedToAuthorAt',
      type: 'date',
      access: { read: isAuthorSafe, create: () => false, update: () => false },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'assignmentKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: { read: isEditorial },
      admin: { hidden: true },
    },
    {
      name: 'slotKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: { read: isEditorial },
      admin: { hidden: true },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, originalDoc, req }) =>
        validateReviewAssignment({
          data: data as Record<string, unknown> | undefined,
          operation,
          originalDoc: originalDoc as Record<string, unknown> | undefined,
          req,
        }),
    ],
    afterChange: [
      async ({ doc, req }) => {
        const submissionID = relationshipID(doc.submission)
        if (submissionID !== null) await recomputeSubmissionReviewState(req, submissionID)
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        const submissionID = relationshipID(doc.submission)
        if (submissionID !== null) await recomputeSubmissionReviewState(req, submissionID)
        return doc
      },
    ],
  },
  timestamps: true,
  versions: { maxPerDoc: 50 },
}
