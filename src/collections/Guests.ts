import type { CollectionConfig, PayloadHandler, Where } from 'payload'
import { isAdmin, isAdminUser, isGuestUser } from '../lib/access'
import {
  GUEST_COOKIE,
  clearGuestCookie,
  codeFingerprint,
  createGuestToken,
  generateCode,
  guestCookie,
  normalizeCode,
  parseCookie,
  readGuestToken,
} from '../lib/guest-auth'

const attempts = new Map<string, number[]>()
const clientKey = (req: { headers: Headers }) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
const isHttps = (req: { url?: string; headers: Headers }) =>
  (req.url ? new URL(req.url).protocol === 'https:' : false) || req.headers.get('x-forwarded-proto') === 'https'

/** POST /api/guests/code-login  { code }  ->  sets the guest cookie. */
const codeLogin: PayloadHandler = async (req) => {
  const key = clientKey(req)
  const now = Date.now()
  const recent = (attempts.get(key) || []).filter((t) => now - t < 15 * 60 * 1000)
  if (recent.length >= 12) {
    return Response.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 })
  }

  const body = (await req.json?.().catch(() => ({}))) as { code?: string } | undefined
  const code = normalizeCode(body?.code)
  const found = code
    ? await req.payload.find({
        collection: 'guests',
        where: { code: { equals: code } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
    : null
  const guest = found?.docs?.[0]
  if (!guest) {
    attempts.set(key, [...recent, now])
    return Response.json(
      { error: 'That code doesn’t match an invitation. Please check and try again.' },
      { status: 401 },
    )
  }

  await req.payload.update({
    collection: 'guests',
    id: guest.id,
    data: { lastLogin: new Date().toISOString() },
    overrideAccess: true,
  })

  return new Response(JSON.stringify({ guest: { id: guest.id, name: guest.name } }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': guestCookie(createGuestToken(guest), isHttps(req)),
    },
  })
}

const codeLogout: PayloadHandler = async () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearGuestCookie() },
  })

/** POST /api/guests/quiz-tag { mode: 'attending' | 'all' | 'none' }  (couple only) */
const quizTag: PayloadHandler = async (req) => {
  if (!isAdminUser(req.user)) return Response.json({ error: 'Couple access only.' }, { status: 403 })
  const body = (await req.json?.().catch(() => ({}))) as { mode?: string } | undefined
  const mode = body?.mode
  if (!mode || !['attending', 'all', 'none'].includes(mode)) {
    return Response.json({ error: 'Invalid mode.' }, { status: 400 })
  }
  const where: Where =
    mode === 'attending'
      ? { rsvp: { equals: 'yes' } }
      : mode === 'all'
        ? { id: { exists: true } }
        : { unlocked: { equals: true } }
  const res = await req.payload.update({
    collection: 'guests',
    where,
    data: { unlocked: mode !== 'none' },
    overrideAccess: true,
  })
  // "attending" also clears the tag for everyone else so the result is exactly "who RSVP'd yes".
  if (mode === 'attending') {
    await req.payload.update({
      collection: 'guests',
      where: { rsvp: { not_equals: 'yes' } },
      data: { unlocked: false },
      overrideAccess: true,
    })
  }
  return Response.json({ ok: true, updated: res.docs?.length ?? 0 })
}

export const Guests: CollectionConfig = {
  slug: 'guests',
  labels: { singular: 'Guest', plural: 'Guests' },
  admin: {
    useAsTitle: 'name',
    group: 'Wedding',
    defaultColumns: ['name', 'rsvp', 'rsvpCount', 'tableLabel', 'unlocked', 'lastLogin'],
    description:
      'Everyone invited. Each guest gets a personal invitation code: open a guest to copy their link, QR code or a ready-made message.',
    components: {
      beforeListTable: ['/components/admin/GuestTools#GuestTools'],
    },
  },
  /**
   * Guests don't have email/password. They sign in with their invitation code
   * (see the `guest-code` strategy and the /code-login endpoint).
   */
  auth: {
    disableLocalStrategy: true,
    strategies: [
      {
        name: 'guest-code',
        authenticate: async ({ headers, payload }) => {
          const cookie = headers.get('cookie')
          // The couple's own login always wins. (Otherwise a guest cookie left over from testing an
          // invitation link would take priority and the admin panel would start refusing saves.)
          if (parseCookie(cookie, `${payload.config.cookiePrefix}-token`)) return { user: null }
          const token = readGuestToken(parseCookie(cookie, GUEST_COOKIE))
          if (!token) return { user: null }
          const guest = await payload.findByID({
            collection: 'guests',
            id: token.id,
            depth: 0,
            overrideAccess: true,
            disableErrors: true,
          })
          if (!guest || codeFingerprint(guest.code ?? '') !== token.fingerprint) return { user: null }
          return { user: { ...guest, collection: 'guests', _strategy: 'guest-code' } }
        },
      },
    ],
  },
  endpoints: [
    { path: '/code-login', method: 'post', handler: codeLogin },
    { path: '/code-logout', method: 'post', handler: codeLogout },
    { path: '/quiz-tag', method: 'post', handler: quizTag },
  ],
  access: {
    create: isAdmin,
    delete: isAdmin,
    // A guest can only ever see and edit their own record (and only the RSVP fields; see field access below).
    read: ({ req }) =>
      isAdminUser(req.user) ? true : isGuestUser(req.user) ? { id: { equals: req.user!.id } } : false,
    update: ({ req }) =>
      isAdminUser(req.user) ? true : isGuestUser(req.user) ? { id: { equals: req.user!.id } } : false,
  },
  hooks: {
    beforeValidate: [
      ({ data, operation, req }) => {
        if (!data) return data
        if (operation === 'create' && !data.code) data.code = generateCode()
        if (data.code) data.code = normalizeCode(data.code)
        // (Guests can't change their own code, tag or table: those fields have couple-only update access.)
        return data
      },
    ],
    beforeChange: [
      ({ data, req }) => {
        // Keep RSVP answers sane: seats can't exceed what was offered.
        if (isGuestUser(req.user) && (data.rsvp || data.rsvpCount !== undefined)) {
          const max = Number(req.user.partySize) || 1
          if (data.rsvp === 'no') data.rsvpCount = 0
          else if (data.rsvp === 'yes') data.rsvpCount = Math.min(max, Math.max(1, Number(data.rsvpCount) || 1))
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Guest or family name',
      access: { update: ({ req }) => isAdminUser(req.user) },
    },
    {
      name: 'invite',
      type: 'ui',
      admin: { components: { Field: '/components/admin/InviteLink#InviteLink' } },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'partySize',
          type: 'number',
          label: 'Seats',
          defaultValue: 1,
          min: 1,
          max: 20,
          required: true,
          admin: { description: 'How many people this invitation covers.', width: '50%' },
          access: { update: ({ req }) => isAdminUser(req.user) },
        },
        {
          name: 'tableLabel',
          type: 'text',
          label: 'Table',
          admin: { description: 'e.g. “Table 4”. Guests only see this once seating is published.', width: '50%' },
          access: { update: ({ req }) => isAdminUser(req.user) },
        },
      ],
    },
    {
      name: 'unlocked',
      type: 'checkbox',
      label: 'Tagged for the quiz',
      defaultValue: false,
      admin: { description: 'Only tagged guests can play the quiz, and only while it’s switched Live.' },
      access: { update: ({ req }) => isAdminUser(req.user) },
    },
    {
      type: 'collapsible',
      label: 'RSVP',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'rsvp',
          type: 'select',
          defaultValue: 'pending',
          options: [
            { label: 'Awaiting reply', value: 'pending' },
            { label: 'Attending', value: 'yes' },
            { label: 'Declined', value: 'no' },
          ],
        },
        { name: 'rsvpCount', type: 'number', label: 'Attending (people)', defaultValue: 0, min: 0, max: 20 },
        { name: 'meal', type: 'text', label: 'Meal choice' },
        { name: 'note', type: 'textarea', label: 'Note from guest', maxLength: 300 },
      ],
    },
    {
      name: 'code',
      type: 'text',
      unique: true,
      index: true,
      label: 'Invitation code',
      admin: {
        position: 'sidebar',
        description: 'Created automatically. Change it to issue a new login; the old link stops working.',
      },
      access: { read: ({ req }) => isAdminUser(req.user), update: ({ req }) => isAdminUser(req.user) },
    },
    {
      name: 'lastLogin',
      type: 'date',
      label: 'Last opened',
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
      access: { update: ({ req }) => isAdminUser(req.user) },
    },
  ],
}
