'use client'

import * as React from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { MailCheck } from 'lucide-react'

import { requestMagicLink } from '@/lib/actions/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function MagicLinkForm({ urlError }: { urlError?: string }) {
  const t = useTranslations('auth')
  const locale = useLocale() as 'fr' | 'en'
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [devLink, setDevLink] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setDevLink(null)

    const formData = new FormData(e.currentTarget)
    const result = await requestMagicLink(formData, locale)

    if (result.success) {
      setStatus('sent')
      if (result.devLink) setDevLink(result.devLink)
    } else {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <Card className="mx-auto max-w-md border-primary/30">
        <CardContent className="pt-8 pb-8 text-center">
          <MailCheck className="mx-auto mb-4 h-14 w-14 text-primary" />
          <h2 className="font-display text-xl font-semibold">{t('magicLinkSent')}</h2>
          {devLink && (
            <div className="mt-6 rounded-lg border border-accent/50 bg-accent/10 p-4 text-left text-sm">
              <p className="mb-2 font-semibold">{t('devLink')}</p>
              <a href={devLink} className="break-all text-primary underline">
                {devLink}
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>{t('loginTitle')}</CardTitle>
        <CardDescription>{t('loginSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder={t('emailPlaceholder')}
              disabled={status === 'loading'}
            />
          </div>

          {(status === 'error' || urlError) && (
            <p className="text-sm font-medium text-destructive">{t('invalidLink')}</p>
          )}

          <Button type="submit" className="w-full" disabled={status === 'loading'}>
            {status === 'loading' ? '…' : t('sendMagicLink')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
