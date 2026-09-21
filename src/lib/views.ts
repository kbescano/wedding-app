import type { Event as WeddingEvent, Guest, Message, Photo } from '../payload-types'

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

export const guestView = (g: Guest): GuestView => ({
  id: g.id,
  name: g.name,
  party_size: g.partySize ?? 1,
  rsvp: g.rsvp ?? 'pending',
  rsvp_count: g.rsvpCount ?? 0,
  meal: g.meal ?? '',
  note: g.note ?? '',
  unlocked: !!g.unlocked,
})

/** Photos and messages point at their owner either by id or (when populated) as a full guest. */
export const ownerId = (owner: number | Guest | null | undefined): number | null =>
  owner == null ? null : typeof owner === 'object' ? owner.id : owner

export const photoView = (p: Photo, mine: boolean) => ({
  id: p.id,
  url: p.url ?? '',
  thumb: p.sizes?.thumbnail?.url || p.url || '',
  caption: p.caption ?? '',
  author: p.author ?? 'A guest',
  created_at: p.createdAt,
  mine,
})

export const messageView = (m: Message, mine: boolean) => ({
  id: m.id,
  author: m.author ?? 'A guest',
  body: m.body,
  private: !!m.private,
  created_at: m.createdAt,
  mine,
})

export type EventView = ReturnType<typeof eventView>

/** Payload's array-of-objects fields flattened to the simple shapes the pages use. */
export const eventView = (e: WeddingEvent) => ({
  partner1: e.partner1,
  partner2: e.partner2,
  date: e.date,
  time: e.time ?? '',
  venue: e.venue ?? '',
  address: e.address ?? '',
  mapUrl: e.mapUrl ?? '',
  note: e.note ?? '',
  dressCode: e.dressCode ?? '',
  dressNote: e.dressNote ?? '',
  swatches: (e.swatches ?? []).map((s) => s.color).filter(Boolean),
  mealOptions: (e.mealOptions ?? []).map((m) => m.option).filter(Boolean),
  rsvpDeadline: e.rsvpDeadline ?? '',
  seatingPublished: !!e.seatingPublished,
  schedule: (e.schedule ?? []).map((s) => ({ time: s.time ?? '', title: s.title, detail: s.detail ?? '' })),
})

/** What the sealed screen may show: names and date only. */
export const publicInfo = (e: WeddingEvent) => ({
  partner1: e.partner1,
  partner2: e.partner2,
  date: e.date,
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

/* ---- Shared shapes used by both the server (data.ts) and the browser (views) ---- */

export type PhotoView = ReturnType<typeof photoView>
export type MessageView = ReturnType<typeof messageView>
export type PublicInfo = ReturnType<typeof publicInfo>
export type Role = 'admin' | 'guest' | null

export type SeatingTable = { label: string; guests: string[] }
export type SeatingData = { published: boolean; tables: SeatingTable[]; mine: string | null }

export type LeaderRow = { rank: number; id: number; name: string; score: number; answered: number }
export type QuizStatus = 'off' | 'live' | 'ended'
export type QuizQuestion = { id: number; question: string; options: string[] }
export type QuizAnswer = { choice: number; correct: boolean; correctIndex: number }
export type AnswerResult = { error: string } | { choice: number; correct: boolean; correctIndex: number; score: number }
export type QuizState = {
  status: QuizStatus
  eligible: boolean
  isAdmin: boolean
  /** True for signed-out visitors (only possible while Open access is on). */
  public: boolean
  total: number
  leaderboard: LeaderRow[]
  questions: QuizQuestion[]
  answers: Record<string, QuizAnswer>
  me: { score: number; answered: number; rank: number | null } | null
}
