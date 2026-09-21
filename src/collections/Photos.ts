import path from 'path'
import { fileURLToPath } from 'url'
import { APIError } from 'payload'
import type { CollectionConfig } from 'payload'
import { canView, isAdminUser, isGuestUser } from '../lib/access'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const PER_GUEST_LIMIT = 150

/**
 * Guest photos ("Memories"). Uploaded files are served at /api/photos/file/<name>
 * and follow the same read rule as the list, so nothing leaks while the site is sealed.
 */
export const Photos: CollectionConfig = {
  slug: 'photos',
  labels: { singular: 'Photo', plural: 'Photos' },
  admin: {
    useAsTitle: 'caption',
    group: 'Wedding',
    defaultColumns: ['filename', 'author', 'caption', 'createdAt'],
    description: 'Photos shared by guests (and by you). Delete anything you don’t want on the wall.',
  },
  upload: {
    staticDir: path.resolve(dirname, '../../media'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    imageSizes: [{ name: 'thumbnail', width: 720, withoutEnlargement: true }],
    adminThumbnail: 'thumbnail',
    crop: false,
    focalPoint: false,
  },
  access: {
    read: canView,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => isAdminUser(req.user),
    delete: ({ req }) =>
      isAdminUser(req.user) ? true : isGuestUser(req.user) ? { owner: { equals: req.user!.id } } : false,
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation !== 'create') return data
        // "Uploaded by" always comes from the signed-in person, never from the request body.
        if (isGuestUser(req.user)) {
          const { totalDocs } = await req.payload.count({
            collection: 'photos',
            where: { owner: { equals: req.user!.id } },
            req,
          })
          if (totalDocs >= PER_GUEST_LIMIT) {
            throw new APIError('You’ve reached the upload limit. Thank you for sharing so many!', 429)
          }
          data.author = req.user.name
          data.owner = req.user.id
        } else {
          data.author = 'The Couple'
          data.owner = null
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'caption', type: 'text', maxLength: 160 },
    { name: 'author', type: 'text', label: 'Uploaded by', admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'guests',
      maxDepth: 0,
      admin: { readOnly: true, position: 'sidebar', description: 'Set automatically from who uploaded it.' },
    },
  ],
}
