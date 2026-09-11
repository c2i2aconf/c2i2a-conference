import type { Access, FieldAccess, Where } from 'payload'

/** Public access — used for content displayed on the site */
export const anyone: Access = () => true

/** Draft-enabled content is public only after publication. */
export const publishedOrAdminEditor: Access = ({ req: { user } }) => {
  if (user?.role === 'admin' || user?.role === 'editor') return true
  return { _status: { equals: 'published' } }
}

/** Portal workflows accept authors/attendees; admins may act on their behalf. */
export const isPortalUserOrAdmin: Access = ({ req: { user } }) =>
  user?.role === 'author' || user?.role === 'attendee' || user?.role === 'admin'

export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

export const isAdminOrEditor: Access = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'editor'

/** Roles permitted to enter the Payload admin panel. */
export const canAccessAdmin = ({ req: { user } }: Parameters<Access>[0]) =>
  user?.role === 'admin' || user?.role === 'editor' || user?.role === 'reviewer'

/** Admins see every user; signed-in users may read/update their own account. */
export const isAdminOrOwnUser: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { id: { equals: user.id } }
}

/** Editors need reviewer identities for assignments; other users still see only themselves. */
export const isAdminEditorReviewerOrOwnUser: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.role === 'editor') {
    return { or: [{ id: { equals: user.id } }, { role: { equals: 'reviewer' } }] } as Where
  }
  return { id: { equals: user.id } }
}

async function assignedSubmissionIDs(req: Parameters<Access>[0]['req']) {
  if (!req.user) return []
  const assignments = await req.payload.find({
    collection: 'reviewer-assignments',
    depth: 0,
    overrideAccess: true,
    pagination: false,
    req,
    where: { reviewer: { equals: req.user.id } },
  })
  return assignments.docs.flatMap((assignment) => {
    const submission = assignment.submission
    return typeof submission === 'number' ? [submission] : [submission.id]
  })
}

/** Submission reads are owner-scoped for authors and assignment-scoped for reviewers. */
export const canReadSubmissions: Access = async ({ req }) => {
  const { user } = req
  if (!user) return false
  if (user.role === 'admin' || user.role === 'editor') return true
  if (user.role === 'reviewer') {
    const submissionIDs = await assignedSubmissionIDs(req)
    return submissionIDs.length ? ({ id: { in: submissionIDs } } as Where) : false
  }
  return { author: { equals: user.id } } as Where
}

/** Private paper files follow the same assignment boundary as their submissions. */
export const canReadSubmissionFiles: Access = async ({ req }) => {
  const { user } = req
  if (!user) return false
  if (user.role === 'admin' || user.role === 'editor') return true
  if (user.role === 'reviewer') {
    const submissionIDs = await assignedSubmissionIDs(req)
    if (!submissionIDs.length) return false
    const submissions = await req.payload.find({
      collection: 'submissions',
      depth: 0,
      overrideAccess: true,
      pagination: false,
      req,
      select: { file: true },
      where: { id: { in: submissionIDs } },
    })
    const fileIDs = submissions.docs.flatMap((submission) => {
      const file = submission.file
      return typeof file === 'number' ? [file] : [file.id]
    })
    return fileIDs.length ? ({ id: { in: fileIDs } } as Where) : false
  }
  return { author: { equals: user.id } } as Where
}

/** Assignment/report reads: editorial staff see all, reviewers see self, authors see safe completed reports. */
export const canReadReviewerAssignments: Access = async ({ req }) => {
  const { user } = req
  if (!user) return false
  if (user.role === 'admin' || user.role === 'editor') return true
  if (user.role === 'reviewer') return { reviewer: { equals: user.id } } as Where
  const submissions = await req.payload.find({
    collection: 'submissions',
    depth: 0,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        { author: { equals: user.id } },
        { status: { in: ['revision-required', 'accepted', 'rejected'] } },
      ],
    },
  })
  const submissionIDs = submissions.docs.map((submission) => submission.id)
  return submissionIDs.length
    ? ({
        and: [{ submission: { in: submissionIDs } }, { status: { equals: 'completed' } }],
      } as Where)
    : false
}

/** Reviewers may only update their own still-open report. Hooks enforce the submission state too. */
export const canUpdateReviewerAssignments: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin' || user.role === 'editor') return true
  if (user.role === 'reviewer') {
    return {
      and: [{ reviewer: { equals: user.id } }, { status: { equals: 'assigned' } }],
    } as Where
  }
  return false
}

/** Admins see everything; users see only docs linked to them (field `user`) */
export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { user: { equals: user.id } }
}

/** Field-level: only admins can write */
export const isAdminField: FieldAccess = ({ req: { user } }) => user?.role === 'admin'

/** Field-level: only admins/editors can write. */
export const isAdminOrEditorField: FieldAccess = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'editor'
