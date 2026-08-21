export const MAGIC_LINK_EMAIL_LIMIT = 3
export const MAGIC_LINK_IP_LIMIT = 20
export const SUBMISSION_FILE_LIMIT = 4 * 1024 * 1024

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
