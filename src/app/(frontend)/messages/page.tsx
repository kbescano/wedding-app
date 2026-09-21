import MessagesView from '@/components/views/MessagesView'
import { getMessages } from '@/lib/data'
import { getEventRaw, getViewer } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const viewer = await getViewer()
  const canView = Boolean(viewer.role) || Boolean((await getEventRaw()).openAccess)
  return <MessagesView messages={canView ? await getMessages(viewer) : []} />
}
