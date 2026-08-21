import crypto from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { getPayload, jwtSign } from 'payload'

import configPromise from '@payload-config'
import { getServerURL } from '@/lib/server-url'

/**
 * GET /[locale]/auth/verify?token=…
 * Validates a magic-link token (single-use, 30-min TTL), signs the user in via
 * a Payload-compatible JWT without touching the password, links registrations,
 * sets the `payload-token` cookie, and redirects to the account page.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const fail = () =>
    NextResponse.redirect(new URL(`/${locale}/auth/login?error=invalid`, getServerURL()))

  const token = req.nextUrl.searchParams.get('token')
  if (!token) return fail()

  try {
    const payload = await getPayload({ config: configPromise })
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const { docs: links } = await payload.find({
      collection: 'magic-links',
      where: {
        and: [
          { tokenHash: { equals: tokenHash } },
          { consumedAt: { exists: false } },
          { expiresAt: { greater_than: new Date().toISOString() } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })
    const magicLink = links[0]
    if (!magicLink) return fail()

    const { docs: users } = await payload.find({
      collection: 'users',
      where: { email: { equals: magicLink.email } },
      limit: 1,
      overrideAccess: true,
    })
    const user = users[0]
    if (!user || !['author', 'attendee'].includes(user.role)) return fail()

    // The conditional bulk update is the atomic single-use claim.
    const consumed = await payload.update({
      collection: 'magic-links',
      where: {
        and: [
          { id: { equals: magicLink.id } },
          { consumedAt: { exists: false } },
          { expiresAt: { greater_than: new Date().toISOString() } },
        ],
      },
      data: { consumedAt: new Date().toISOString() },
      overrideAccess: true,
    })
    if (consumed.docs.length !== 1) return fail()

    const usersConfig = payload.config.collections.find(({ slug }) => slug === 'users')
    if (!usersConfig || !usersConfig.auth) return fail()
    const { token: jwt, exp } = await jwtSign({
      fieldsToSign: {
        id: user.id,
        collection: 'users',
        email: user.email,
        role: user.role,
      },
      secret: payload.config.secret,
      tokenExpiration: usersConfig.auth.tokenExpiration,
    })

    // Link any registrations made with this email to the account
    await payload.update({
      collection: 'registrations',
      where: {
        and: [{ email: { equals: magicLink.email } }, { user: { exists: false } }],
      },
      data: { user: user.id },
      overrideAccess: true,
    })

    const response = NextResponse.redirect(new URL(`/${locale}/account`, getServerURL()))
    response.cookies.set('payload-token', jwt, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      ...(exp ? { maxAge: Math.max(0, exp - Math.floor(Date.now() / 1000)) } : {}),
    })
    return response
  } catch (error) {
    console.error('Magic link verification failed', error)
    return fail()
  }
}
