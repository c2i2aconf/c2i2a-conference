import { ImageResponse } from 'next/og'
import { getLiveEdition, getSiteSettings } from '@/lib/queries'

export const alt = 'C2I2A Conference'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  const [edition, settings] = await Promise.all([getLiveEdition(locale), getSiteSettings(locale)])
  return new ImageResponse(
    <div
      style={{
        alignItems: 'center',
        background: 'linear-gradient(135deg, #10234d, #2455a4 60%, #17213b)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'center',
        padding: '72px',
        textAlign: 'center',
        width: '100%',
      }}
    >
      <div style={{ color: '#e0b84b', fontSize: 32, letterSpacing: 8 }}>
        {settings?.organizationName}
      </div>
      <div style={{ fontSize: 108, fontWeight: 800, marginTop: 28 }}>
        {settings?.siteName} {edition?.year}
      </div>
      <div style={{ fontSize: 38, marginTop: 28, maxWidth: 950, opacity: 0.86 }}>
        {edition?.theme || settings?.siteTagline}
      </div>
    </div>,
    size,
  )
}
