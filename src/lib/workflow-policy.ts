export const MAGIC_LINK_EMAIL_LIMIT = 3
export const MAGIC_LINK_IP_LIMIT = 20
export const SUBMISSION_FILE_LIMIT = 4 * 1024 * 1024
export const SUBMISSION_FILE_KINDS = ['original-review', 'revision', 'camera-ready'] as const
export type SubmissionFileKind = (typeof SUBMISSION_FILE_KINDS)[number]

export const REVIEW_RECOMMENDATIONS = ['accept', 'revision', 'reject'] as const
export type ReviewRecommendation = (typeof REVIEW_RECOMMENDATIONS)[number]

export function isPortalRole(role: string | null | undefined) {
  return role === 'author' || role === 'attendee'
}

export function shouldThrottleMagicLink(emailRequests: number, ipRequests: number) {
  return emailRequests >= MAGIC_LINK_EMAIL_LIMIT || ipRequests >= MAGIC_LINK_IP_LIMIT
}

export function isSubmissionWindowOpen(
  edition: { submissionsEnabled?: boolean | null; submissionDeadline?: string | null } | null,
  now = Date.now(),
) {
  if (!edition?.submissionsEnabled || !edition.submissionDeadline) return false
  const deadline = new Date(edition.submissionDeadline).getTime()
  return Number.isFinite(deadline) && deadline > now
}

export function hasPdfSignature(buffer: Buffer) {
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-'
}

export function shouldSendDecisionEmail(
  operation: string,
  previousStatus: string | null | undefined,
  status: string | null | undefined,
) {
  return (
    operation === 'update' &&
    previousStatus !== status &&
    (status === 'accepted' || status === 'rejected')
  )
}

export function isRevisionRoundOpen(
  round: { status?: string | null; deadline?: string | null },
  now = Date.now(),
) {
  if (round.status !== 'open') return false
  if (!round.deadline) return true
  const deadline = new Date(round.deadline).getTime()
  return Number.isFinite(deadline) && deadline > now
}

/** Recommendation categories are intentionally coarse; differing primary outcomes need editorial review. */
export function reviewsMateriallyDisagree(
  recommendations: Array<ReviewRecommendation | null | undefined>,
) {
  const completed = recommendations.filter(
    (recommendation): recommendation is ReviewRecommendation => recommendation != null,
  )
  return completed.length >= 2 && new Set(completed.slice(0, 2)).size > 1
}
