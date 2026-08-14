import * as React from 'react'
import { getTranslations, getLocale } from 'next-intl/server'
import { getSiteSettings } from '@/lib/queries'
import { Globe, Link as LinkIcon, MessageCircle, Mail } from 'lucide-react'

function getSocialIcon(platform: string) {
  switch (platform) {
    case 'facebook': return <MessageCircle className="w-5 h-5" />
    case 'instagram': return <Globe className="w-5 h-5" />
    case 'linkedin': return <LinkIcon className="w-5 h-5" />
    case 'youtube': return <Globe className="w-5 h-5" />
    case 'x': return <MessageCircle className="w-5 h-5" />
    default: return <Globe className="w-5 h-5" />
  }
}

export async function Footer() {
  const t = await getTranslations('footer')
  const locale = await getLocale() as 'fr' | 'en'
  const siteSettings = await getSiteSettings(locale)

  return (
    <footer className="w-full border-t bg-muted/40 text-muted-foreground py-12">
      <div className="container grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-semibold text-foreground text-lg mb-4">
            {siteSettings?.siteName || 'C2I2A Conference'}
          </h3>
          {siteSettings?.siteTagline && (
            <p className="mb-4 text-sm">{siteSettings.siteTagline}</p>
          )}
          <p className="text-sm">
            {t('organizedBy')} <strong>HEEC Marrakech</strong>
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-foreground text-lg mb-4">{t('contact')}</h3>
          {siteSettings?.contactEmail ? (
            <a 
              href={`mailto:${siteSettings.contactEmail}`}
              className="flex items-center gap-2 hover:text-primary transition-colors text-sm"
            >
              <Mail className="w-4 h-4" />
              {siteSettings.contactEmail}
            </a>
          ) : (
            <p className="text-sm">contact@c2i2a.com</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-foreground text-lg mb-4">{t('followUs')}</h3>
          {siteSettings?.socials && siteSettings.socials.length > 0 ? (
            <div className="flex gap-4">
              {siteSettings.socials.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  <span className="sr-only">{social.platform}</span>
                  {getSocialIcon(social.platform)}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm">No socials available.</p>
          )}
        </div>
      </div>
      <div className="container mt-12 pt-8 border-t text-sm text-center">
        <p>&copy; {new Date().getFullYear()} {siteSettings?.siteName || 'C2I2A'}. {t('rights')}.</p>
      </div>
    </footer>
  )
}
