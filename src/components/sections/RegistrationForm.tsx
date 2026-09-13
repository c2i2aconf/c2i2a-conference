'use client'

import * as React from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { registerAction } from '@/lib/actions/register'
import { useRouter } from '@/i18n/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function RegistrationForm({
  fees = [],
  profile,
}: {
  fees?: Array<{
    code: string
    label: string
    exempt?: boolean | null
    currency?: string | null
    alternateCurrency?: string | null
  }>
  profile?: { firstName?: string | null; lastName?: string | null; email: string }
}) {
  const t = useTranslations('registration')
  const router = useRouter()
  const locale = useLocale() as 'fr' | 'en'
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = React.useState('')
  const [emailSent, setEmailSent] = React.useState(true)
  const [feeCode, setFeeCode] = React.useState(fees[0]?.code ?? '')
  const selectedFee = fees.find((fee) => fee.code === feeCode)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const formData = new FormData(e.currentTarget)
    const result = await registerAction(formData, locale)

    if (result.success) {
      setStatus('success')
      setEmailSent(result.emailSent !== false)
      if (profile) router.refresh()
    } else {
      setStatus('error')
      if (result.error === 'duplicate_email') {
        setErrorMsg(t('errors.duplicate_email'))
      } else if (result.error === 'no_live_edition') {
        setErrorMsg(t('errors.no_live_edition'))
      } else if (result.error === 'missing_fields') {
        setErrorMsg(t('errors.missing_fields'))
      } else {
        setErrorMsg(t('errors.server_error'))
      }
    }
  }

  if (status === 'success') {
    return (
      <Card className="max-w-xl mx-auto border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="pt-6 text-center text-green-700 dark:text-green-400">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h2 className="text-2xl font-semibold mb-2">{t('success')}</h2>
          {!emailSent && (
            <p className="mx-auto mt-4 max-w-md rounded-md border border-amber-500/40 bg-amber-50/70 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
              {t('emailNotSent')}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t('firstName')} *</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={profile?.firstName ?? ''}
                required
                disabled={status === 'loading'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t('lastName')} *</Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={profile?.lastName ?? ''}
                required
                disabled={status === 'loading'}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('email')} *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={profile?.email}
              readOnly={Boolean(profile)}
              required
              disabled={status === 'loading'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="affiliation">{t('affiliation')}</Label>
            <Input id="affiliation" name="affiliation" disabled={status === 'loading'} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">{t('country')}</Label>
            <Input id="country" name="country" disabled={status === 'loading'} />
          </div>

          {fees.length > 0 && (
            <>
              <Label htmlFor="feeCategory">{t('feeCategory')}</Label>
              <select
                id="feeCategory"
                name="feeCategory"
                value={feeCode}
                onChange={(event) => setFeeCode(event.target.value)}
                required
                className="w-full rounded border bg-background p-2"
              >
                {fees.map((fee) => (
                  <option key={fee.code} value={fee.code}>
                    {fee.label}
                  </option>
                ))}
              </select>
              <Label htmlFor="feeCurrency">{t('feeCurrency')}</Label>
              <select
                id="feeCurrency"
                name="feeCurrency"
                key={feeCode}
                disabled={Boolean(selectedFee?.exempt)}
                className="w-full rounded border bg-background p-2"
              >
                <option value="">{t('categoryCurrency')}</option>
                {[
                  ...new Set(
                    [selectedFee?.currency, selectedFee?.alternateCurrency].filter(Boolean),
                  ),
                ].map((currency) => (
                  <option key={currency} value={currency!}>
                    {currency}
                  </option>
                ))}
              </select>
            </>
          )}
          {status === 'error' && (
            <div className="text-destructive text-sm font-medium">{errorMsg}</div>
          )}

          <Button type="submit" className="w-full" disabled={status === 'loading'}>
            {status === 'loading' ? t('submitting') : t('submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
