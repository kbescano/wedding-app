import type { CollectionConfig } from 'payload'
import { isAdminUser } from '../lib/access'

/** The couple. Signs in to the Payload admin at /admin. The first user is created on first visit. */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Couple login', plural: 'Couple logins' },
  admin: { useAsTitle: 'email', group: 'Settings' },
  auth: { tokenExpiration: 60 * 60 * 24 * 7 },
  access: {
    // Only existing couple logins can add another (the very first one is created on first visit to /admin).
    create: ({ req }) => isAdminUser(req.user),
    read: ({ req }) => isAdminUser(req.user),
    update: ({ req }) => isAdminUser(req.user),
    delete: ({ req }) => isAdminUser(req.user),
  },
  fields: [{ name: 'name', type: 'text' }],
}
