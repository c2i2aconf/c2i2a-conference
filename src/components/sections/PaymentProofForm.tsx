'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { uploadPaymentProof } from '@/lib/actions/payment-proof'
import { Button } from '@/components/ui/button'

export function PaymentProofForm({
  registration,
  edition,
  formats,
}: {
  registration: number
  edition: number
  formats: string[]
}) {
  const t = useTranslations('registration')
  const locale = useLocale() as 'fr' | 'en'
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        setError(false)
        const success = await uploadPaymentProof(new FormData(event.currentTarget), locale)
        setPending(false)
        if (success) router.refresh()
        else setError(true)
      }}
    >
      <input type="hidden" name="registration" value={registration} />
      <input type="hidden" name="edition" value={edition} />
      <label className="block" htmlFor={`proof-${registration}`}>
        {t('proofUpload', { formats: formats.join(', ') })}
      </label>
      <input
        id={`proof-${registration}`}
        name="file"
        type="file"
        required
        disabled={pending}
        accept={formats
          .map((format) => (format === 'pdf' ? 'application/pdf' : `image/${format}`))
          .join(',')}
      />
      <Button type="submit" disabled={pending}>
        {t('submitProof')}
      </Button>
      {error && (
        <p role="alert" className="text-destructive">
          {t('proofError')}
        </p>
      )}
    </form>
  )
}
