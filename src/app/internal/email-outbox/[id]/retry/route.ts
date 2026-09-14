import { getPayload } from 'payload'

import configPromise from '@payload-config'
import { requestManualEmailRetry } from '@/lib/email-outbox'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }
  const id = Number((await context.params).id)
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: 'invalid_id' }, { status: 400 })
  }
  let reason = ''
  try { reason = String(((await request.json()) as { reason?: unknown }).reason ?? '') } catch {}
  try {
    await requestManualEmailRetry(payload, { id, userID: user.id, reason })
    return Response.json({ success: true }, { status: 202 })
  } catch {
    return Response.json({ error: 'not_retryable' }, { status: 409 })
  }
}
