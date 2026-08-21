const favicon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#123b72"/>
  <path d="M45 18a22 22 0 1 0 0 28" fill="none" stroke="#d4a63a" stroke-width="8" stroke-linecap="round"/>
  <circle cx="45" cy="32" r="5" fill="#fff"/>
</svg>
`.trim()

export function GET() {
  return new Response(favicon, {
    headers: {
      'Cache-Control': 'public, max-age=86400, immutable',
      'Content-Type': 'image/svg+xml; charset=utf-8',
    },
  })
}
