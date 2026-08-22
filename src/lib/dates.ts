/**
 * Calendar dates (sessions, edition dates, key dates) carry day-semantics
 * and are stored as UTC midnights. Anchor day-only strings and always
 * format in UTC so a visitor's timezone never shifts the label by a day —
 * and so server render and client hydration agree.
 */

export function toDateUTC(value: string): Date {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  return new Date(dateOnly ? `${value}T00:00:00Z` : value)
}

export function formatDate(
  value: string | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  if (!value) return ''
  return toDateUTC(value).toLocaleDateString(locale, { ...options, timeZone: 'UTC' })
}
