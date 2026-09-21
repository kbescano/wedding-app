import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import fs from 'fs'
import path from 'path'
import { buildConfig } from 'payload'
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

// Development and production use separate SQLite files by default: dev syncs its schema automatically, production
// runs the migrations in ./migrations. Set DATABASE_URI to point at a persistent path on your server.
const databaseURI =
  process.env.DATABASE_URI || (process.env.NODE_ENV === 'production' ? 'file:./data/wedding.db' : 'file:./data/wedding-dev.db')
if (databaseURI.startsWith('file:')) {
  fs.mkdirSync(path.dirname(path.resolve(databaseURI.slice('file:'.length))), { recursive: true })
}

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
  db: sqliteAdapter({ client: { url: databaseURI }, prodMigrations: migrations }),
  upload: { limits: { fileSize: 25 * 1024 * 1024 } },
  graphQL: { disable: true },
  sharp,
})
