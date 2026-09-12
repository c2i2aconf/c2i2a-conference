'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { CircleCheck, FileUp } from 'lucide-react'

import {
  uploadCameraReadyManuscript,
  uploadRevisionManuscript,
} from '@/lib/actions/workflow-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function WorkflowUploadForm({
  kind,
  revisionRound,
  submission,
}: {
  kind: 'revision' | 'camera-ready'
  revisionRound?: number
  submission: number
}) {
  const t = useTranslations('submission.workflowUpload')
  const locale = useLocale() as 'fr' | 'en'
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = React.useState('server_error')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')
    const formData = new FormData(event.currentTarget)
    const result =
      kind === 'revision'
        ? await uploadRevisionManuscript(formData, locale)
        : await uploadCameraReadyManuscript(formData, locale)
    setStatus(result.success ? 'success' : 'error')
    if (result.error) setError(result.error)
  }

  if (status === 'success') {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
        <CircleCheck className="h-4 w-4" />
        {t(kind === 'revision' ? 'revisionSuccess' : 'cameraReadySuccess')}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="hidden" name="submission" value={submission} />
      {revisionRound ? <input type="hidden" name="revisionRound" value={revisionRound} /> : null}
      <Label htmlFor={`${kind}-${submission}`}>
        {t(kind === 'revision' ? 'revisionFile' : 'cameraReadyFile')}
      </Label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id={`${kind}-${submission}`}
          name="file"
          type="file"
          accept="application/pdf"
          required
          disabled={status === 'loading'}
        />
        <Button type="submit" disabled={status === 'loading'}>
          <FileUp className="h-4 w-4" />
          {status === 'loading' ? '…' : t('submit')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t('fileHint')}</p>
      {status === 'error' ? (
        <p className="text-sm font-medium text-destructive">{t(`errors.${error}`)}</p>
      ) : null}
    </form>
  )
}
