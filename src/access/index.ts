import type { Access, FieldAccess } from 'payload'

/** Public access — used for content displayed on the site */
export const anyone: Access = () => true

/** Any logged-in user */
export const isAuthenticated: Access = ({ req: { user } }) => Boolean(user)

export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

export const isAdminOrEditor: Access = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'editor'

export const isAdminOrReviewer: Access = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'reviewer'

/** Admins/reviewers see everything; authors see only their own docs (field `author`) */
export const isAdminReviewerOrAuthor: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin' || user.role === 'reviewer') return true
  return { author: { equals: user.id } }
}

/** Admins see everything; users see only docs linked to them (field `user`) */
export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { user: { equals: user.id } }
}

/** Field-level: only admins can write */
export const isAdminField: FieldAccess = ({ req: { user } }) => user?.role === 'admin'

/** Field-level: only admins/reviewers can write */
export const isAdminOrReviewerField: FieldAccess = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'reviewer'
