import { getTranslations, setRequestLocale } from 'next-intl/server'
import { RegistrationForm } from '@/components/sections/RegistrationForm'

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'nav' })

  return (
    <div className="container py-12 md:py-24">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{t('registration')}</h1>
      </div>
      
      <RegistrationForm />
    </div>
  )
}
