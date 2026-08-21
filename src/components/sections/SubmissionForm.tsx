'use client'

import * as React from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { CircleCheck, FileUp } from 'lucide-react'

import { submitPaper } from '@/lib/actions/submit'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function SubmissionForm() {
  const t = useTranslations('submission')
  const locale = useLocale() as 'fr' | 'en'
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await submitPaper(formData, locale)
    setStatus(result.success ? 'success' : 'error')
    if (!result.success) setError(result.error || 'server_error')
  }

  if (status === 'success') {
    return (
      <Card className="mx-auto max-w-xl border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="pt-8 pb-8 text-center text-green-700 dark:text-green-400">
          <CircleCheck className="mx-auto mb-4 h-14 w-14" />
          <h2 className="text-2xl font-semibold">{t('success')}</h2>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">{t('paperTitle')} *</Label>
            <Input id="title" name="title" required disabled={status === 'loading'} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="abstract">{t('abstract')} *</Label>
            <textarea
              id="abstract"
              name="abstract"
              required
              rows={6}
              disabled={status === 'loading'}
              className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">{t('file')} *</Label>
            <label
              htmlFor="file"
              className="flex cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <FileUp className="h-5 w-5" />
              {fileName || t('fileHint')}
            </label>
            <Input
              id="file"
              name="file"
              type="file"
              accept="application/pdf"
              required
              disabled={status === 'loading'}
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </div>

          {status === 'error' && (
            <p className="text-sm font-medium text-destructive">
              {t(`errors.${error || 'server_error'}`)}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={status === 'loading'}>
            {status === 'loading' ? '…' : t('submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
