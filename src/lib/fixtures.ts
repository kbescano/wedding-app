import type { MessageView, PhotoView, SeatingTable } from './views'

/** Placeholder content shown behind the blur. None of it is real guest data. */
export type PlaceholderPhoto = PhotoView & { tone?: [string, string]; ratio?: number }

const now = new Date().toISOString()

const photo = (id: number, tone: [string, string], ratio: number, caption: string): PlaceholderPhoto => ({
  id,
  url: '',
  thumb: '',
  tone,
  ratio,
  author: 'A guest',
  caption,
  created_at: now,
  mine: false,
})

export const FAKE_PHOTOS: PlaceholderPhoto[] = [
  photo(-1, ['#1F3A2E', '#C9A15B'], 1.3, 'A moment from the day'),
  photo(-2, ['#E8DCC4', '#8C5A3C'], 0.78, 'Something to remember'),
  photo(-3, ['#6B7F5E', '#F7F2E8'], 1, ''),
  photo(-4, ['#3C2D28', '#DEBE8C'], 1.4, 'Golden hour'),
  photo(-5, ['#C9A15B', '#1F3A2E'], 0.9, 'Cheers'),
  photo(-6, ['#8C5A3C', '#E8DCC4'], 1.2, ''),
  photo(-7, ['#1F3A2E', '#E8DCC4'], 0.8, 'Together'),
  photo(-8, ['#DEBE8C', '#3C2D28'], 1.1, ''),
]

const message = (id: number, body: string): MessageView => ({
  id,
  author: 'A guest',
  body,
  private: false,
  created_at: now,
  mine: false,
})

export const FAKE_MESSAGES: MessageView[] = [
  message(-1, 'Wishing you both a lifetime of joy, laughter and very long dinners together.'),
  message(-2, 'So happy for you. Can’t wait to celebrate with everyone who loves you.'),
  message(-3, 'From the first hello to this day. Congratulations, with all our love.'),
  message(-4, 'Thank you for letting us be part of it.'),
]

export const FAKE_TABLES: SeatingTable[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  label: `Table ${n}`,
  guests: ['A guest', 'A guest', 'A guest', 'A guest'],
}))
