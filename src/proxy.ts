import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Keep Payload, Next internals, and static assets outside locale routing.
  matcher: ['/((?!admin|api|graphql|graphql-playground|_next|_vercel|static|.*\\..*).*)'],
}
