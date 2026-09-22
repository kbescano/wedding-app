import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { s3Storage } from '@payloadcms/storage-s3'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import fs from 'fs'
import path from 'path'
import { buildConfig, type Plugin } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Guests } from './collections/Guests'
import { Photos } from './collections/Photos'
import { Messages } from './collections/Messages'
import { QuizQuestions } from './collections/QuizQuestions'
import { QuizAnswers } from './collections/QuizAnswers'
import { Event } from './globals/Event'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// A local file works for a plain server with a persistent disk. Serverless hosts (Netlify, Vercel, …) give the
// app a fresh, read-only filesystem per request, so there's nothing to open there — point DATABASE_URI at a
// remote database instead (e.g. a Turso libSQL URL: libsql://<db>.turso.io, with TURSO_AUTH_TOKEN set).
const databaseURI =
  process.env.DATABASE_URI ||
  (process.env.NODE_ENV === 'production' ? 'file:./data/wedding.db' : 'file:./data/wedding-dev.db')
if (databaseURI.startsWith('file:')) {
  fs.mkdirSync(path.dirname(path.resolve(databaseURI.slice('file:'.length))), { recursive: true })
}

// Same story for uploaded photos: local disk (media/) only survives on a host with a persistent volume. Set
// S3_BUCKET (plus S3_ENDPOINT for an S3-compatible host like Cloudflare R2) to store them remotely instead.
// Reads still go through Payload's own /api/photos/file route (disablePayloadAccessControl stays unset), so the
// existing canView access rule keeps applying — the bucket itself never needs to be public.
const s3Bucket = process.env.S3_BUCKET
const plugins: Plugin[] = s3Bucket
  ? [
      s3Storage({
        collections: { photos: true },
        bucket: s3Bucket,
        config: {
          region: process.env.S3_REGION || 'auto',
          endpoint: process.env.S3_ENDPOINT,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
          },
        },
      }),
    ]
  : []

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: '· Wedding' },
    components: { beforeDashboard: ['/components/admin/Dashboard#Dashboard'] },
  },
  collections: [Users, Guests, Photos, Messages, QuizQuestions, QuizAnswers],
  globals: [Event],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  // Dev pushes the schema automatically; production applies ./migrations on startup.
  db: sqliteAdapter({
    client: process.env.TURSO_AUTH_TOKEN
      ? { url: databaseURI, authToken: process.env.TURSO_AUTH_TOKEN }
      : { url: databaseURI },
    prodMigrations: migrations,
  }),
  upload: { limits: { fileSize: 25 * 1024 * 1024 } },
  graphQL: { disable: true },
  plugins,
  sharp,
})
