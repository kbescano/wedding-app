import SeatingView from '@/components/views/SeatingView'
import { getSeating } from '@/lib/data'
import { getEventRaw, getViewer } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const viewer = await getViewer()
  const event = await getEventRaw()
  const canView = Boolean(viewer.role) || Boolean(event.openAccess)
  const seating = canView ? await getSeating(viewer, event) : { published: false, tables: [], mine: null }
  return <SeatingView seating={seating} />
}
