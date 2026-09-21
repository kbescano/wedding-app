import { cache } from 'react'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { guestView, type GuestView } from './views'

export const getPayloadClient = cache(async () => getPayload({ config }))

export type Viewer = {
  role: 'admin' | 'guest' | null
  /** The signed-in Payload user (couple or guest), or null. Pass to the Local API with overrideAccess: false. */
  user: any
  guest: GuestView | null
}

/** Who is looking? The couple (Payload admin login) or a guest (invitation code). Cached per request. */
export const getViewer = cache(async (): Promise<Viewer> => {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return { role: null, user: null, guest: null }
  if ((user as any).collection === 'users') return { role: 'admin', user, guest: null }
  return { role: 'guest', user, guest: guestView(user) }
})

/** The "Wedding" global, read on the server. Only ever expose it through eventView() / publicInfo(). */
export const getEventRaw = cache(async () => {
  const payload = await getPayloadClient()
  return (await payload.findGlobal({ slug: 'event', depth: 0 })) as any
})
