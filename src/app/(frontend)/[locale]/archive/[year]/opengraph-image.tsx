import { ImageResponse } from 'next/og'
import { getEditionByYear, getSiteSettings } from '@/lib/queries'

export const alt = 'C2I2A Archive'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function ArchiveOpenGraphImage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en'; year: string }>
}) {
  const { locale, year } = await params
  const [edition, settings] = await Promise.all([
    getEditionByYear(Number(year), locale),
    getSiteSettings(locale),
  ])
  return new ImageResponse(
    <div
      style={{
        alignItems: 'center',
        background: 'linear-gradient(135deg, #17213b, #2455a4)',
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
        {settings?.siteName} · ARCHIVE
      </div>
      <div style={{ fontSize: 96, fontWeight: 800, marginTop: 28 }}>{edition?.title || year}</div>
      {edition?.theme ? (
        <div style={{ fontSize: 36, marginTop: 28, maxWidth: 950, opacity: 0.84 }}>
          {edition.theme}
        </div>
      ) : null}
    </div>,
    size,
  )
}
