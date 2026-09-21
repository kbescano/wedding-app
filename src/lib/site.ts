import { cache } from 'react'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Event as WeddingEvent, Guest, User } from '../payload-types'
import { guestView, type GuestView } from './views'

export const getPayloadClient = cache(async () => getPayload({ config }))

/** Who is looking: the couple (Payload admin login), a guest (invitation code) or nobody. */
export type Viewer =
  | { role: 'admin'; user: User; guest: null }
  | { role: 'guest'; user: Guest; guest: GuestView }
  | { role: null; user: null; guest: null }

/** Cached per request. Pass `viewer.user` to the Local API together with `overrideAccess: false`. */
export const getViewer = cache(async (): Promise<Viewer> => {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return { role: null, user: null, guest: null }
  if (user.collection === 'users') return { role: 'admin', user, guest: null }
  return { role: 'guest', user, guest: guestView(user) }
})

/** The "Wedding" global, read on the server. Only ever expose it through eventView() / publicInfo(). */
export const getEventRaw = cache(async (): Promise<WeddingEvent> => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'event', depth: 0 })
})
