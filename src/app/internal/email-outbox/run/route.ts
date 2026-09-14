import crypto from 'node:crypto'
import { getPayload } from 'payload'

import configPromise from '@payload-config'
import { processEmailOutbox } from '@/lib/email-outbox'

export const dynamic = 'force-dynamic'

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!secret || !supplied) return false
  const expected = Buffer.from(secret)
  const actual = Buffer.from(supplied)
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

async function run(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const payload = await getPayload({ config: configPromise })
  return Response.json(await processEmailOutbox(payload))
}

export const GET = run
export const POST = run
