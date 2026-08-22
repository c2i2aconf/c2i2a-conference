// 'next/cache.js' (not 'next/cache'): the next package has no exports map,
// so raw ESM consumers (tsx seeds/tests) can't resolve the extensionless path
import { revalidatePath } from 'next/cache.js'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'

/**
 * On-demand invalidation for CMS-driven pages: every public page is ISR'd
 * hourly as a fallback, these hooks make admin edits visible within seconds.
 */
function revalidateSite() {
  try {
    revalidatePath('/', 'layout')
  } catch {
    // Outside a Next request (seed/migration scripts) there is nothing to invalidate
  }
}

export const revalidateSiteAfterChange: CollectionAfterChangeHook = () => {
  revalidateSite()
}

export const revalidateSiteAfterDelete: CollectionAfterDeleteHook = () => {
  revalidateSite()
}

export const revalidateSiteAfterGlobalChange: GlobalAfterChangeHook = () => {
  revalidateSite()
}
