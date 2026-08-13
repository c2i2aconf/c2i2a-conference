import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getLiveEdition, getSpeakers } from '@/lib/queries'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Link as LinkIcon, Globe } from 'lucide-react'

export default async function SpeakersPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'home' }) // home namespace has speakersTitle
  const edition = await getLiveEdition(locale)
  const speakers = edition ? await getSpeakers(edition.id, locale) : []

  return (
    <div className="container py-12 md:py-24">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{t('speakersTitle')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Découvrez les experts et chercheurs qui interviendront lors de cette édition.
        </p>
      </div>
      
      {!edition || speakers.length === 0 ? (
        <p className="text-center text-muted-foreground">Aucun intervenant n'a été annoncé pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {speakers.map((speaker) => (
            <Card key={speaker.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative bg-muted flex items-center justify-center">
                {speaker.photo && typeof speaker.photo === 'object' && speaker.photo.url ? (
                  <img
                    src={speaker.photo.url}
                    alt={speaker.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-6xl text-muted-foreground/30 font-bold">
                    {speaker.name.charAt(0)}
                  </div>
                )}
                {speaker.isKeynote && (
                  <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    Keynote
                  </Badge>
                )}
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-1">{speaker.name}</h3>
                {speaker.affiliation && (
                  <p className="text-sm text-muted-foreground mb-4">{speaker.affiliation}</p>
                )}
                
                {(speaker.linkedin || speaker.website) && (
                  <div className="flex gap-3 mt-4 pt-4 border-t">
                    {speaker.linkedin && (
                      <a href={speaker.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <LinkIcon className="w-4 h-4" />
                      </a>
                    )}
                    {speaker.website && (
                      <a href={speaker.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
