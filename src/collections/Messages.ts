import type { CollectionConfig, Where } from 'payload'
import { APIError } from 'payload'
import { isAdminUser, isGuestUser, isOpenAccess } from '../lib/access'

/** Messages to the couple. Shown as "Message by NAME". Private ones are visible only to the author and the couple. */
export const Messages: CollectionConfig = {
  slug: 'messages',
  labels: { singular: 'Message', plural: 'Messages' },
  admin: {
    useAsTitle: 'author',
    group: 'Wedding',
    defaultColumns: ['author', 'body', 'private', 'createdAt'],
  },
  access: {
    read: async ({ req }): Promise<boolean | Where> => {
      if (isAdminUser(req.user)) return true
      if (isGuestUser(req.user)) {
        return { or: [{ private: { equals: false } }, { owner: { equals: req.user!.id } }] }
      }
      return (await isOpenAccess(req)) ? { private: { equals: false } } : false
    },
    // Only invited guests write messages (they carry a name). The couple can read and moderate.
    create: ({ req }) => isGuestUser(req.user),
    update: ({ req }) => isAdminUser(req.user),
    delete: ({ req }) =>
      isAdminUser(req.user) ? true : isGuestUser(req.user) ? { owner: { equals: req.user!.id } } : false,
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation !== 'create') return data
        if (!isGuestUser(req.user)) throw new APIError('Only invited guests can leave messages.', 403)
        data.author = req.user.name
        data.owner = req.user.id
        return data
      },
    ],
  },
  fields: [
    { name: 'body', type: 'textarea', required: true, minLength: 2, maxLength: 800 },
    {
      name: 'private',
      type: 'checkbox',
      defaultValue: false,
      label: 'Private (only the couple can read it)',
    },
    { name: 'author', type: 'text', label: 'Message by', admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'guests',
      maxDepth: 0,
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
