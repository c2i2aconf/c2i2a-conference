import { APIError, type CollectionConfig } from 'payload'

import {
  canReadSubmissionAuthor,
  canReadSubmissionFiles,
  isAdminField,
  isPortalUserOrAdmin,
} from '../access'
import { requireAnyOpenSubmissionEdition } from '../lib/workflow-boundary'
import { relationshipID } from '../lib/workflow-boundary'
import { submitRevisionRound, REVISION_TRANSITION_CONTEXT } from '../lib/revision-workflow'
import {
  hasPdfSignature,
  isPortalRole,
  isRevisionRoundOpen,
  SUBMISSION_FILE_LIMIT,
  type SubmissionFileKind,
} from '../lib/workflow-policy'

/**
 * Private immutable upload collection for original, revised, and camera-ready manuscripts (PDF only).
 * Separate from `media` so public images and private papers never mix.
 */
export const SubmissionFiles: CollectionConfig = {
  slug: 'submission-files',
  admin: {
    group: 'Workflow',
  },
  access: {
    read: canReadSubmissionFiles,
    create: isPortalUserOrAdmin,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ user }: { user?: { id: string } | null }) => user?.id,
      access: { read: canReadSubmissionAuthor, update: isAdminField },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'original-review',
      options: [
        { label: 'Original anonymized review manuscript', value: 'original-review' },
        { label: 'Revised anonymized manuscript', value: 'revision' },
        { label: 'Camera-ready / final manuscript', value: 'camera-ready' },
      ],
      access: { update: () => false },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'submission',
      type: 'relationship',
      relationTo: 'submissions',
      index: true,
      access: { update: () => false },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'revisionRound',
      type: 'relationship',
      relationTo: 'revision-rounds',
      index: true,
      access: { update: () => false },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'stageKey',
      type: 'text',
      unique: true,
      index: true,
      access: { update: () => false },
      admin: { hidden: true },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation !== 'create') return data
        const file = req.file
        if (
          !file ||
          file.mimetype !== 'application/pdf' ||
          file.size > SUBMISSION_FILE_LIMIT ||
          !hasPdfSignature(file.data)
        ) {
          throw new APIError('A valid PDF file of at most 4 MB is required.', 400, undefined, true)
        }

        const kind = (data?.kind ?? 'original-review') as SubmissionFileKind
        if (kind === 'original-review') {
          await requireAnyOpenSubmissionEdition(req)
          if (req.user && req.user.role !== 'admin') {
            return {
              ...data,
              author: req.user.id,
              kind,
              revisionRound: undefined,
              stageKey: undefined,
              submission: undefined,
            }
          }
          return {
            ...data,
            kind,
            revisionRound: undefined,
            stageKey: undefined,
            submission: undefined,
          }
        }

        if (!req.user || !isPortalRole(req.user.role)) {
          throw new APIError(
            'Only the submission owner may upload this manuscript.',
            403,
            undefined,
            true,
          )
        }

        if (kind === 'revision') {
          const roundID = relationshipID(data?.revisionRound)
          if (roundID === null) {
            throw new APIError('A valid revision round is required.', 400, undefined, true)
          }
          const round = await req.payload.findByID({
            collection: 'revision-rounds',
            id: roundID,
            depth: 0,
            overrideAccess: true,
            req,
          })
          const submissionID = relationshipID(round.submission)
          if (submissionID === null) {
            throw new APIError('The revision round has no valid submission.', 409, undefined, true)
          }
          if (
            relationshipID(data?.submission) !== null &&
            relationshipID(data?.submission) !== submissionID
          ) {
            throw new APIError(
              'The revision file submission must match its revision round.',
              400,
              undefined,
              true,
            )
          }
          const submission = await req.payload.findByID({
            collection: 'submissions',
            id: submissionID,
            depth: 0,
            overrideAccess: true,
            req,
          })
          if (relationshipID(submission.author) !== req.user.id) {
            throw new APIError(
              'Only the submission owner may upload this revision.',
              403,
              undefined,
              true,
            )
          }
          if (submission.status !== 'revision-required' || !isRevisionRoundOpen(round)) {
            throw new APIError(
              'This revision round is not open for resubmission.',
              409,
              undefined,
              true,
            )
          }
          if (round.revisedManuscript) {
            throw new APIError(
              'A revision has already been submitted for this round.',
              409,
              undefined,
              true,
            )
          }
          return {
            ...data,
            author: req.user.id,
            kind,
            revisionRound: roundID,
            stageKey: `revision:${roundID}`,
            submission: submissionID,
          }
        }

        if (kind === 'camera-ready') {
          const submissionID = relationshipID(data?.submission)
          if (submissionID === null) {
            throw new APIError('A valid accepted submission is required.', 400, undefined, true)
          }
          const submission = await req.payload.findByID({
            collection: 'submissions',
            id: submissionID,
            depth: 0,
            overrideAccess: true,
            req,
          })
          if (relationshipID(submission.author) !== req.user.id) {
            throw new APIError(
              'Only the submission owner may upload its camera-ready manuscript.',
              403,
              undefined,
              true,
            )
          }
          if (submission.status !== 'accepted') {
            throw new APIError(
              'Camera-ready upload requires final editorial acceptance.',
              409,
              undefined,
              true,
            )
          }
          if (submission.cameraReadyFile) {
            throw new APIError(
              'A camera-ready manuscript has already been submitted.',
              409,
              undefined,
              true,
            )
          }
          return {
            ...data,
            author: req.user.id,
            kind,
            revisionRound: undefined,
            stageKey: `camera-ready:${submissionID}`,
            submission: submissionID,
          }
        }

        throw new APIError('Unsupported submission file kind.', 400, undefined, true)
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc
        if (doc.kind === 'revision') {
          const roundID = relationshipID(doc.revisionRound)
          if (roundID !== null) await submitRevisionRound(req, roundID, doc.id)
        } else if (doc.kind === 'camera-ready') {
          const submissionID = relationshipID(doc.submission)
          if (submissionID !== null) {
            await req.payload.update({
              collection: 'submissions',
              id: submissionID,
              data: { cameraReadyFile: doc.id, cameraReadySubmittedAt: new Date().toISOString() },
              context: { [REVISION_TRANSITION_CONTEXT]: true },
              overrideAccess: true,
              req,
            })
          }
        }
        return doc
      },
    ],
  },
  upload: {
    mimeTypes: ['application/pdf'],
    crop: false,
    focalPoint: false,
  },
}
