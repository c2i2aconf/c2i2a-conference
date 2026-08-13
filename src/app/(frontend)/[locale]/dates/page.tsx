import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getLiveEdition, getImportantDates } from '@/lib/queries'
import { Badge } from '@/components/ui/badge'

export default async function DatesPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'dates' })
  const edition = await getLiveEdition(locale)
  const dates = edition ? await getImportantDates(edition.id, locale) : []

  function getStatusColor(status: string) {
    switch (status) {
      case 'open': return 'bg-amber-500 text-white hover:bg-amber-600' // Gold
      case 'closed': return 'bg-muted text-muted-foreground hover:bg-muted'
      case 'extended': return 'bg-primary text-primary-foreground hover:bg-primary/90'
      default: return 'bg-secondary text-secondary-foreground'
    }
  }

  return (
    <div className="container py-12 md:py-24 max-w-3xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-12 text-center">{t('title')}</h1>
      
      {!edition || dates.length === 0 ? (
        <p className="text-center text-muted-foreground">Aucune date n'a été annoncée pour le moment.</p>
      ) : (
        <div className="relative border-l-2 border-muted ml-4 md:ml-8 space-y-12">
          {dates.map((item, index) => {
            const dateObj = new Date(item.date)
            const dateStr = dateObj.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
            const endStr = item.endDate ? new Date(item.endDate).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : null

            return (
              <div key={item.id} className="relative pl-8">
                {/* Timeline dot */}
                <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-primary ring-4 ring-background" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                  <h3 className="text-xl font-semibold">{item.label}</h3>
                  <Badge className={getStatusColor(item.status)} variant="secondary">
                    {t(item.status)}
                  </Badge>
                </div>
                
                <p className="text-muted-foreground font-medium">
                  {dateStr} {endStr ? ` - ${endStr}` : ''}
                </p>
                {item.note && <p className="text-sm mt-2 text-foreground/80">{item.note}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
