import GamesView from '@/components/views/GamesView'
import { getQuizState } from '@/lib/data'
import { getEventRaw, getViewer } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const viewer = await getViewer()
  const event = await getEventRaw()
  const canView = Boolean(viewer.role) || Boolean(event.openAccess)
  return <GamesView data={canView ? await getQuizState(viewer, event) : null} />
}
