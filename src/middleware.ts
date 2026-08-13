import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Match all paths except Payload admin/API, Next internals and static files
  matcher: ['/((?!admin|api|graphql|graphql-playground|_next|_vercel|.*\\..*).*)'],
}
