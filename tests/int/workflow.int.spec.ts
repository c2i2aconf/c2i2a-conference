import { describe, expect, it } from 'vitest'

import { canAccessAdmin, isAdminOrOwnUser, isAdminOrReviewerField } from '@/access'
import { Registrations } from '@/collections/Registrations'
import { SubmissionFiles } from '@/collections/SubmissionFiles'
import { Submissions } from '@/collections/Submissions'
import {
  hasPdfSignature,
  isPortalRole,
  isSubmissionWindowOpen,
  shouldSendDecisionEmail,
  shouldThrottleMagicLink,
  SUBMISSION_FILE_LIMIT,
} from '@/lib/workflow-policy'

const req = (user: Record<string, unknown> | null) => ({ req: { user } }) as never

describe('workflow policy', () => {
  it('limits magic links to portal roles without granting elevated roles', () => {
    expect(isPortalRole('author')).toBe(true)
    expect(isPortalRole('attendee')).toBe(true)
    expect(isPortalRole('admin')).toBe(false)
    expect(isPortalRole('editor')).toBe(false)
    expect(isPortalRole('reviewer')).toBe(false)
  })

  it('applies the documented magic-link throttle thresholds', () => {
    expect(shouldThrottleMagicLink(2, 19)).toBe(false)
    expect(shouldThrottleMagicLink(3, 0)).toBe(true)
    expect(shouldThrottleMagicLink(0, 20)).toBe(true)
  })

  it('opens submissions only while enabled and before the deadline', () => {
    const now = Date.parse('2027-01-01T00:00:00Z')
    expect(
      isSubmissionWindowOpen(
        { submissionsEnabled: true, submissionDeadline: '2027-02-01T00:00:00Z' },
        now,
      ),
    ).toBe(true)
    expect(
      isSubmissionWindowOpen(
        { submissionsEnabled: false, submissionDeadline: '2027-02-01T00:00:00Z' },
        now,
      ),
    ).toBe(false)
    expect(
      isSubmissionWindowOpen(
        { submissionsEnabled: true, submissionDeadline: '2026-12-31T23:59:59Z' },
        now,
      ),
    ).toBe(false)
  })

  it('validates PDF signatures and the configured private-upload limit', () => {
    expect(hasPdfSignature(Buffer.from('%PDF-1.7'))).toBe(true)
    expect(hasPdfSignature(Buffer.from('<html>'))).toBe(false)
    expect(SUBMISSION_FILE_LIMIT).toBe(4 * 1024 * 1024)
  })

  it('sends one decision email only when a final decision changes', () => {
    expect(shouldSendDecisionEmail('create', undefined, 'accepted')).toBe(false)
    expect(shouldSendDecisionEmail('update', 'pending', 'accepted')).toBe(true)
    expect(shouldSendDecisionEmail('update', 'accepted', 'accepted')).toBe(false)
    expect(shouldSendDecisionEmail('update', 'accepted', 'rejected')).toBe(true)
  })
})

describe('Payload access and ownership hooks', () => {
  it('keeps the admin panel unavailable to portal users', () => {
    expect(canAccessAdmin(req({ id: 1, role: 'admin' }))).toBe(true)
    expect(canAccessAdmin(req({ id: 2, role: 'reviewer' }))).toBe(true)
    expect(canAccessAdmin(req({ id: 3, role: 'author' }))).toBe(false)
  })

  it('limits user documents to self unless the requester is an admin', () => {
    expect(isAdminOrOwnUser(req({ id: 9, role: 'author' }))).toEqual({
      id: { equals: 9 },
    })
    expect(isAdminOrOwnUser(req({ id: 1, role: 'admin' }))).toBe(true)
  })

  it('forces submission and upload ownership to the signed-in portal user', async () => {
    const submissionHook = Submissions.hooks?.beforeValidate?.[0]
    const uploadHook = SubmissionFiles.hooks?.beforeValidate?.[0]
    expect(submissionHook).toBeTypeOf('function')
    expect(uploadHook).toBeTypeOf('function')

    const hookArgs = {
      data: { author: 999, title: 'Paper' },
      operation: 'create',
      req: { user: { id: 7, role: 'author' } },
    } as never
    expect(await submissionHook!(hookArgs)).toMatchObject({ author: 7 })
    expect(await uploadHook!(hookArgs)).toMatchObject({ author: 7 })
  })

  it('allows reviewers to edit decisions but not paper content', async () => {
    const namedFields = Submissions.fields.filter((field) => 'name' in field)
    const titleField = namedFields.find((field) => 'name' in field && field.name === 'title')
    const statusField = namedFields.find((field) => 'name' in field && field.name === 'status')
    const reviewer = req({ id: 2, role: 'reviewer' })
    const titleAccess = titleField && 'access' in titleField ? titleField.access?.update : undefined
    const statusAccess =
      statusField && 'access' in statusField ? statusField.access?.update : undefined
    expect(await titleAccess?.(reviewer)).toBe(false)
    expect(await statusAccess?.(reviewer)).toBe(true)
    expect(isAdminOrReviewerField(reviewer)).toBe(true)
  })

  it('only auto-links a registration when the authenticated email matches', async () => {
    const hook = Registrations.hooks?.beforeValidate?.[0]
    const result = await hook!({
      data: { email: 'Person@Example.com', user: 99, status: 'cancelled', checkedIn: true },
      operation: 'create',
      req: { user: { id: 4, role: 'attendee', email: 'person@example.com' } },
    } as never)
    expect(result).toMatchObject({ email: 'person@example.com', user: 4, status: 'confirmed' })
  })
})
