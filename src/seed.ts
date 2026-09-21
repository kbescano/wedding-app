/**
 * Demo data: a couple login, guests, quiz questions, messages and a few placeholder photos.
 *   npm run seed
 * Safe to re-run: it does nothing if guests already exist.
 */
import zlib from 'node:zlib'
import { getPayload } from 'payload'
import config from './payload.config'
import type { Guest } from './payload-types'

/* ---- tiny PNG writer for placeholder "photos" (no image libraries needed) ---- */
const crcOf = (buf: Buffer) => {
  let crc = 0xffffffff
  for (const byte of buf) {
    crc ^= byte
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crcOf(body))
  return Buffer.concat([len, body, crc])
}
function png(w: number, h: number, pixel: (x: number, y: number) => number[]) {
  const stride = w * 3 + 1
  const raw = Buffer.alloc(stride * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(x / w, y / h)
      const o = y * stride + 1 + x * 3
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t))

const scenes = [
  { w: 420, h: 560, a: [31, 58, 46], b: [201, 161, 91], caption: 'Golden hour on the terrace', by: 1 },
  { w: 560, h: 420, a: [232, 220, 196], b: [140, 90, 60], caption: 'The cake, before it disappeared', by: 2 },
  { w: 420, h: 420, a: [107, 127, 94], b: [247, 242, 232], caption: 'Cheers!', by: 3 },
  { w: 420, h: 600, a: [60, 45, 40], b: [222, 190, 140], caption: '', by: 6 },
  { w: 560, h: 380, a: [201, 161, 91], b: [31, 58, 46], caption: 'Dancing until the lights came on', by: 1 },
  { w: 420, h: 520, a: [140, 90, 60], b: [232, 220, 196], caption: 'Best seats in the house', by: 3 },
]

const guests = [
  {
    name: 'Welcome Guest',
    partySize: 2,
    tableLabel: 'Table 1',
    rsvp: 'yes',
    rsvpCount: 2,
    unlocked: true,
    code: 'WELCOME7',
  },
  { name: 'Amara Okafor', partySize: 2, tableLabel: 'Table 1', rsvp: 'yes', rsvpCount: 2, unlocked: true },
  { name: 'Daniel Reyes', partySize: 1, tableLabel: 'Table 2', rsvp: 'yes', rsvpCount: 1, unlocked: true },
  { name: 'The Whitfield Family', partySize: 4, tableLabel: 'Table 3', rsvp: 'yes', rsvpCount: 3, unlocked: false },
  { name: 'Priya Nair', partySize: 2, tableLabel: 'Table 2', rsvp: 'pending', rsvpCount: 0, unlocked: false },
  { name: 'Tomás Ferreira', partySize: 1, tableLabel: 'Table 3', rsvp: 'no', rsvpCount: 0, unlocked: false },
  { name: 'Grandma Rosa', partySize: 1, tableLabel: 'Table 1', rsvp: 'yes', rsvpCount: 1, unlocked: true },
  { name: 'Lena & Marcus Bauer', partySize: 2, tableLabel: 'Table 4', rsvp: 'pending', rsvpCount: 0, unlocked: false },
] as const

const questions = [
  {
    question: 'Where did the couple first meet?',
    options: ['At a friend’s party', 'On a train', 'At university', 'In a coffee shop'],
    correct: 3,
  },
  {
    question: 'Who said “I love you” first?',
    options: ['Isabelle', 'Julian', 'At the same time', 'Nobody remembers'],
    correct: 1,
  },
  {
    question: 'What was the first trip they took together?',
    options: ['A weekend by the sea', 'A city break in Lisbon', 'Camping in the mountains', 'A road trip'],
    correct: 0,
  },
  {
    question: 'Which one of them is always late?',
    options: ['Isabelle', 'Julian', 'Both, equally', 'Neither, they’re early'],
    correct: 2,
  },
  {
    question: 'What song do they say is “their song”?',
    options: ['Can’t Help Falling in Love', 'At Last', 'Thinking Out Loud', 'Just the Way You Are'],
    correct: 1,
  },
]

const payload = await getPayload({ config })

if ((await payload.count({ collection: 'guests' })).totalDocs > 0) {
  console.log('Guests already exist. Delete data/wedding.db (and the media folder) for a fresh demo.')
  process.exit(0)
}

if ((await payload.count({ collection: 'users' })).totalDocs === 0) {
  await payload.create({
    collection: 'users',
    data: { email: 'couple@example.com', password: 'forever2027!', name: 'The Couple' },
  })
}

await payload.updateGlobal({ slug: 'event', data: { openAccess: false, quizStatus: 'off', seatingPublished: false } })

const created: Guest[] = []
for (const g of guests) {
  created.push(await payload.create({ collection: 'guests', data: { ...g }, overrideAccess: true }))
}
const asGuest = (i: number): Guest => created[i]

for (const [n, [i, body]] of (
  [
    [2, 'We’re counting down the days! Save us a dance, and please, no speeches longer than the cake.'],
    [6, 'From the first coffee to the first dance. So happy for you both. All my love, always.'],
    [1, 'Two of the kindest people we know. Here’s to a lifetime of Sunday mornings and long dinners.'],
  ] as [number, string][]
).entries()) {
  void n
  await payload.create({
    collection: 'messages',
    data: { body, private: false },
    user: asGuest(i),
    overrideAccess: true,
  })
}

for (const [order, q] of questions.entries()) {
  await payload.create({
    collection: 'quiz-questions',
    data: {
      question: q.question,
      order,
      options: q.options.map((text, idx) => ({ text, isCorrect: idx === q.correct })),
    },
    overrideAccess: true,
  })
}

for (const [i, s] of scenes.entries()) {
  const data = png(s.w, s.h, (x, y) => {
    const t = Math.min(1, Math.max(0, x * 0.35 + y * 0.65))
    const glow = Math.max(0, 1 - Math.hypot(x - 0.65, y - 0.3) * 2.2)
    return mix(mix(s.a, s.b, t), [255, 244, 220], glow * 0.45)
  })
  await payload.create({
    collection: 'photos',
    data: { caption: s.caption },
    file: { data, mimetype: 'image/png', name: `demo-${i + 1}.png`, size: data.length },
    user: asGuest(s.by),
    overrideAccess: true,
  })
}

console.log('Demo data added.')
console.log('  Guest (quiz-tagged):  open /i/WELC-OME7  or enter code WELC-OME7')
console.log('  Couple:               /admin   couple@example.com / forever2027!   (change it!)')
process.exit(0)
