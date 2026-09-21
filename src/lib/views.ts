/**
 * Plain-data shapes the UI works with. Pure functions (no server-only imports),
 * so both server components and browser code can build them from Payload documents.
 */
export type GuestView = {
  id: number
  name: string
  party_size: number
  rsvp: 'pending' | 'yes' | 'no'
  rsvp_count: number
  meal: string
  note: string
  unlocked: boolean
}

export const guestView = (g: any): GuestView => ({
  id: g.id,
  name: g.name,
  party_size: g.partySize ?? 1,
  rsvp: g.rsvp ?? 'pending',
  rsvp_count: g.rsvpCount ?? 0,
  meal: g.meal ?? '',
  note: g.note ?? '',
  unlocked: !!g.unlocked,
})

export const photoView = (p: any, mine: boolean) => ({
  id: p.id,
  url: p.url as string,
  thumb: (p.sizes?.thumbnail?.url || p.url) as string,
  caption: (p.caption ?? '') as string,
  author: (p.author ?? 'A guest') as string,
  created_at: p.createdAt as string,
  mine,
})

export const messageView = (m: any, mine: boolean) => ({
  id: m.id,
  author: (m.author ?? 'A guest') as string,
  body: m.body as string,
  private: !!m.private,
  created_at: m.createdAt as string,
  mine,
})

export type EventView = ReturnType<typeof eventView>

/** Payload's array-of-objects fields flattened to the simple shapes the pages use. */
export const eventView = (e: any) => ({
  partner1: e.partner1 as string,
  partner2: e.partner2 as string,
  date: e.date as string,
  time: (e.time ?? '') as string,
  venue: (e.venue ?? '') as string,
  address: (e.address ?? '') as string,
  mapUrl: (e.mapUrl ?? '') as string,
  note: (e.note ?? '') as string,
  dressCode: (e.dressCode ?? '') as string,
  dressNote: (e.dressNote ?? '') as string,
  swatches: ((e.swatches ?? []) as any[]).map((s) => s.color).filter(Boolean) as string[],
  mealOptions: ((e.mealOptions ?? []) as any[]).map((m) => m.option).filter(Boolean) as string[],
  rsvpDeadline: (e.rsvpDeadline ?? '') as string,
  seatingPublished: !!e.seatingPublished,
  schedule: ((e.schedule ?? []) as any[]).map((s) => ({ time: (s.time ?? '') as string, title: s.title as string, detail: (s.detail ?? '') as string })),
})

/** What the sealed screen may show: names and date only. */
export const publicInfo = (e: any) => ({
  partner1: e.partner1 as string,
  partner2: e.partner2 as string,
  date: e.date as string,
  openAccess: !!e.openAccess,
})

/** Details shown behind the blur. Deliberately generic: real venue/times never leave the server before access is granted. */
export const placeholderEvent = (pub: { partner1: string; partner2: string; date: string }): EventView => ({
  partner1: pub.partner1,
  partner2: pub.partner2,
  date: pub.date,
  time: '16:00',
  venue: 'The venue name goes here',
  address: '00 Street Name, Town',
  mapUrl: '',
  note: 'A few words from us, waiting behind the seal.',
  dressCode: 'Dress code',
  dressNote: 'A little guidance on what to wear, revealed when you open your invitation.',
  swatches: ['#1F3A2E', '#6B7F5E', '#C9A15B', '#E8DCC4', '#8C5A3C'],
  mealOptions: ['First option', 'Second option', 'Third option'],
  rsvpDeadline: '',
  seatingPublished: false,
  schedule: [
    { time: '15:30', title: 'Guests arrive', detail: 'Details revealed after you sign in.' },
    { time: '16:00', title: 'Ceremony', detail: 'Details revealed after you sign in.' },
    { time: '18:30', title: 'Dinner', detail: 'Details revealed after you sign in.' },
    { time: '20:30', title: 'Celebration', detail: 'Details revealed after you sign in.' },
  ],
})
