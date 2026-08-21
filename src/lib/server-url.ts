/** Returns the canonical public origin without trusting request headers. */
export function getServerURL(): string {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL?.trim().replace(/\/$/, '')
  if (configured && !configured.includes('localhost')) return configured

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercelProduction) return `https://${vercelProduction}`

  const vercelDeployment = process.env.VERCEL_URL
  if (vercelDeployment) return `https://${vercelDeployment}`

  return configured || 'http://localhost:3000'
}

export function assertProductionEnvironment() {
  if (process.env.NODE_ENV !== 'production') return

  const required = ['DATABASE_URL', 'PAYLOAD_SECRET'] as const
  const missing = required.filter((key) => !process.env[key]?.trim())
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`)
  }
}
