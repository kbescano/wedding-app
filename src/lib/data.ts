import { getPayloadClient, type Viewer } from './site'
import { messageView, photoView } from './views'

/**
 * Data for each page. Photos and messages go through the Local API with access control ON,
 * so the collection rules (guests, open access, private messages) are the single source of truth.
 * Seating and quiz are derived views, built with explicit checks and only the fields they need.
 */

export async function getPhotos(viewer: Viewer) {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'photos',
    depth: 0,
    limit: 500,
    sort: '-createdAt',
    overrideAccess: false,
    user: viewer.user ?? undefined,
  })
  return res.docs.map((p: any) => photoView(p, viewer.role === 'admin' || (viewer.role === 'guest' && p.owner === viewer.user.id)))
}

export async function getMessages(viewer: Viewer) {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'messages',
    depth: 0,
    limit: 500,
    sort: '-createdAt',
    overrideAccess: false,
    user: viewer.user ?? undefined,
  })
  return res.docs.map((m: any) => messageView(m, viewer.role === 'admin' || (viewer.role === 'guest' && m.owner === viewer.user.id)))
}

export async function getSeating(viewer: Viewer, event: any) {
  if (!(event.seatingPublished || viewer.role === 'admin')) return { published: false, tables: [], mine: null as string | null }
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'guests',
    limit: 0,
    pagination: false,
    depth: 0,
    sort: 'name',
    overrideAccess: true,
    select: { name: true, tableLabel: true },
  })
  const map = new Map<string, string[]>()
  for (const g of res.docs as any[]) {
    if (!g.tableLabel) continue
    map.set(g.tableLabel, [...(map.get(g.tableLabel) ?? []), g.name])
  }
  const tables = [...map.entries()]
    .map(([label, guests]) => ({ label, guests }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
  return { published: true, tables, mine: viewer.role === 'guest' ? viewer.user.tableLabel || null : null }
}

type Row = { id: number; name: string; score: number; answered: number; last: string }

async function scoreboard() {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'quiz-answers', limit: 0, pagination: false, depth: 1, overrideAccess: true })
  const by = new Map<number, Row>()
  for (const a of res.docs as any[]) {
    const g = a.guest
    if (!g || typeof g !== 'object') continue
    const row = by.get(g.id) ?? { id: g.id, name: g.name, score: 0, answered: 0, last: '' }
    row.score += a.correct ? 100 : 0
    row.answered += 1
    if (a.createdAt > row.last) row.last = a.createdAt
    by.set(g.id, row)
  }
  return [...by.values()]
    .sort((a, b) => b.score - a.score || a.last.localeCompare(b.last))
    .map((r, i) => ({ rank: i + 1, id: r.id, name: r.name, score: r.score, answered: r.answered }))
}

/** Everything the Games page needs for this viewer. Never includes the correct answers of unanswered questions. */
export async function getQuizState(viewer: Viewer, event: any) {
  const payload = await getPayloadClient()
  const status = (event.quizStatus ?? 'off') as 'off' | 'live' | 'ended'
  const guest = viewer.role === 'guest' ? viewer.user : null
  const eligible = !!guest?.unlocked
  const all = await scoreboard()
  const total = (await payload.count({ collection: 'quiz-questions' })).totalDocs

  const out: any = {
    status,
    eligible,
    isAdmin: viewer.role === 'admin',
    public: !viewer.role,
    total,
    leaderboard: all.slice(0, 10),
    questions: [] as any[],
    answers: {} as Record<string, any>,
    me: null as any,
  }

  if (guest) {
    const mine = all.find((r) => r.id === guest.id)
    out.me = { score: mine?.score ?? 0, answered: mine?.answered ?? 0, rank: mine?.rank ?? null }
  }

  if (status === 'live' && eligible) {
    const qs = await payload.find({ collection: 'quiz-questions', sort: 'order', limit: 0, pagination: false, depth: 0, overrideAccess: true })
    out.questions = (qs.docs as any[]).map((q) => ({ id: q.id, question: q.question, options: (q.options ?? []).map((o: any) => o.text) }))
    const answered = await payload.find({ collection: 'quiz-answers', where: { guest: { equals: guest.id } }, limit: 0, pagination: false, depth: 0, overrideAccess: true })
    for (const a of answered.docs as any[]) {
      const q = (qs.docs as any[]).find((x) => x.id === a.question)
      if (!q) continue
      out.answers[q.id] = { choice: a.choice, correct: !!a.correct, correctIndex: (q.options ?? []).findIndex((o: any) => o.isCorrect) }
    }
  }
  return out
}
