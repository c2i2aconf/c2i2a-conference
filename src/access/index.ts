import type { Access, FieldAccess } from 'payload'

/** Public access — used for content displayed on the site */
export const anyone: Access = () => true

/** Any logged-in user */
export const isAuthenticated: Access = ({ req: { user } }) => Boolean(user)

/** Portal workflows accept authors/attendees; admins may act on their behalf. */
export const isPortalUserOrAdmin: Access = ({ req: { user } }) =>
  user?.role === 'author' || user?.role === 'attendee' || user?.role === 'admin'

export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

export const isAdminOrEditor: Access = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'editor'

export const isAdminOrReviewer: Access = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'reviewer'

/** Roles permitted to enter the Payload admin panel. */
export const canAccessAdmin = ({ req: { user } }: Parameters<Access>[0]) =>
  user?.role === 'admin' || user?.role === 'editor' || user?.role === 'reviewer'

/** Admins see every user; signed-in users may read/update their own account. */
export const isAdminOrOwnUser: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { id: { equals: user.id } }
}

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
