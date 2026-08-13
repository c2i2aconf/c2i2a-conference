'use client'

import * as React from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { registerAction } from '@/lib/actions/register'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function RegistrationForm() {
  const t = useTranslations('registration')
  const locale = useLocale() as 'fr' | 'en'
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = React.useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const formData = new FormData(e.currentTarget)
    const result = await registerAction(formData, locale)

    if (result.success) {
      setStatus('success')
    } else {
      setStatus('error')
      if (result.error === 'duplicate_email') {
        setErrorMsg(locale === 'fr' ? 'Cet e-mail est déjà inscrit.' : 'This email is already registered.')
      } else if (result.error === 'no_live_edition') {
        setErrorMsg(locale === 'fr' ? 'Les inscriptions ne sont pas ouvertes.' : 'Registrations are not open.')
      } else {
        setErrorMsg(locale === 'fr' ? 'Une erreur est survenue.' : 'An error occurred.')
      }
    }
  }

  if (status === 'success') {
    return (
      <Card className="max-w-xl mx-auto border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="pt-6 text-center text-green-700 dark:text-green-400">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <h2 className="text-2xl font-semibold mb-2">{t('success')}</h2>
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
              <Input id="firstName" name="firstName" required disabled={status === 'loading'} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t('lastName')} *</Label>
              <Input id="lastName" name="lastName" required disabled={status === 'loading'} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')} *</Label>
            <Input id="email" name="email" type="email" required disabled={status === 'loading'} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="affiliation">{t('affiliation')}</Label>
            <Input id="affiliation" name="affiliation" disabled={status === 'loading'} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">{t('country')}</Label>
            <Input id="country" name="country" disabled={status === 'loading'} />
          </div>

          {status === 'error' && (
            <div className="text-destructive text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={status === 'loading'}>
            {status === 'loading' ? '...' : t('submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
