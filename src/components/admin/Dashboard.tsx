import { getPayload } from 'payload'
import config from '@payload-config'

const card: React.CSSProperties = {
  padding: '14px 16px',
  border: '1px solid var(--theme-elevation-100)',
  background: 'var(--theme-elevation-50)',
  borderRadius: 4,
}

/** Shown above the collection list on /admin. */
export const Dashboard = async ({ user }: { user?: { collection?: string } | null }) => {
  // Couple only. This reads with full access, so never render it for anyone else, whatever Open access is set to.
  if (user?.collection !== 'users') return null

  const payload = await getPayload({ config })
  const [guests, attending, declined, photos, messages, event, tagged, answering] = await Promise.all([
    payload.count({ collection: 'guests' }),
    payload.find({ collection: 'guests', where: { rsvp: { equals: 'yes' } }, limit: 0, pagination: false, depth: 0 }),
    payload.count({ collection: 'guests', where: { rsvp: { equals: 'no' } } }),
    payload.count({ collection: 'photos' }),
    payload.count({ collection: 'messages' }),
    payload.findGlobal({ slug: 'event', depth: 0 }),
    payload.count({ collection: 'guests', where: { unlocked: { equals: true } } }),
    payload.count({ collection: 'quiz-questions' }),
  ])
  const headcount = attending.docs.reduce((n: number, g: any) => n + (g.rsvpCount || 0), 0)
  const pending = guests.totalDocs - attending.docs.length - declined.totalDocs
  const e = event as any

  const stats: [string, number, string?][] = [
    ['Invitations', guests.totalDocs],
    ['Attending', headcount, `${attending.docs.length} replies`],
    ['Declined', declined.totalDocs],
    ['Awaiting reply', pending],
    ['Photos', photos.totalDocs],
    ['Messages', messages.totalDocs],
    ['Tagged for quiz', tagged.totalDocs, `${answering.totalDocs} questions · quiz ${e.quizStatus}`],
  ]

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ margin: '0 0 4px' }}>
        {e.partner1} &amp; {e.partner2}
      </h2>
      <p style={{ margin: '0 0 16px', color: 'var(--theme-elevation-600)' }}>Wedding overview</p>

      <a
        href="/admin/globals/event"
        style={{
          ...card,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
          textDecoration: 'none',
          color: 'inherit',
          borderColor: e.openAccess ? 'var(--theme-warning-500)' : undefined,
        }}
      >
        <span>
          <strong>Open access is {e.openAccess ? 'ON' : 'off'}.</strong>{' '}
          {e.openAccess
            ? 'Anyone with the link can view every page without a code.'
            : 'The invitation is sealed until a guest enters their code.'}
        </span>
        <span style={{ textDecoration: 'underline' }}>Change in Wedding settings</span>
      </a>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px, 100%), 1fr))', gap: 12 }}>
        {stats.map(([label, value, hint]) => (
          <div key={label} style={card}>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
            {hint && <div style={{ fontSize: 12, color: 'var(--theme-elevation-600)', marginTop: 4 }}>{hint}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
