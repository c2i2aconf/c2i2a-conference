// Must be first — patches pg.Pool to use Neon's WebSocket driver (bypasses port 5432 blocks)
import './lib/db-setup'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Committees } from './collections/Committees'
import { Editions } from './collections/Editions'
import { GalleryItems } from './collections/GalleryItems'
import { ImportantDates } from './collections/ImportantDates'
import { MagicLinks } from './collections/MagicLinks'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Registrations } from './collections/Registrations'
import { Rooms } from './collections/Rooms'
import { Sessions } from './collections/Sessions'
import { Speakers } from './collections/Speakers'
import { Sponsors } from './collections/Sponsors'
import { SubmissionFiles } from './collections/SubmissionFiles'
import { Submissions } from './collections/Submissions'
import { Users } from './collections/Users'
import { SiteSettings } from './globals/SiteSettings'
import { privateVercelBlobStorage } from './lib/private-vercel-blob'
import { assertProductionEnvironment, getServerURL } from './lib/server-url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
assertProductionEnvironment()

const configuredFrom = process.env.EMAIL_FROM || 'noreply@c2i2a.vercel.app'
const fromMatch = configuredFrom.match(/^\s*([^<]+?)\s*<([^>]+)>\s*$/)
const defaultFromAddress = fromMatch?.[2] || configuredFrom
const defaultFromName = process.env.EMAIL_FROM_NAME || fromMatch?.[1]?.trim() || 'C2I2A Conference'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— C2I2A',
    },
  },
  collections: [
    // Workflow (attendee-facing data)
    Registrations,
    Submissions,
    SubmissionFiles,
    MagicLinks,
    // Program
    Sessions,
    Speakers,
    Rooms,
    // Content
    Editions,
    Pages,
    ImportantDates,
    Committees,
    Sponsors,
    GalleryItems,
    // Admin
    Users,
    Media,
  ],
  globals: [SiteSettings],
  localization: {
    locales: [
      { label: 'Français', code: 'fr' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'fr',
    fallback: true,
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: getServerURL(),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // Schema changes are migration-driven outside interactive local development.
    push: process.env.NODE_ENV === 'development' && process.env.PAYLOAD_DB_PUSH !== 'false',
  }),
  sharp,
  upload: {
    abortOnLimit: true,
    limits: { fileSize: 4 * 1024 * 1024 },
  },
  // Resend is only wired when the API key is present, so local dev works without it
  ...(process.env.RESEND_API_KEY
    ? {
        email: resendAdapter({
          defaultFromAddress,
          defaultFromName,
          apiKey: process.env.RESEND_API_KEY,
        }),
      }
    : {}),
  plugins: [privateVercelBlobStorage(process.env.BLOB_READ_WRITE_TOKEN)],
})
