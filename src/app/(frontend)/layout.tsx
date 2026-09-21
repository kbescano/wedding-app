import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/jost/index.css'
import '@/styles/base.css'
import '@/styles/pages.css'

import { AuthProvider } from '@/components/AuthContext'
import { ToastProvider } from '@/components/Toast'
import { BottomNav, TopNav } from '@/components/Nav'
import { SignInModal } from '@/components/Gate'
import ViewerEffects from '@/components/ViewerEffects'
import ScrollProgress from '@/components/ScrollProgress'
import { getEventRaw, getViewer } from '@/lib/site'
import { eventView, placeholderEvent, publicInfo } from '@/lib/views'

/** Everything here depends on who is looking, so it is rendered per request. */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const e = await getEventRaw()
  return { title: `${e.partner1} & ${e.partner2} · Wedding`, robots: { index: false, follow: false } }
}

export const viewport: Viewport = { themeColor: '#1E3B2E', viewportFit: 'cover', width: 'device-width', initialScale: 1 }

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer()
  const raw = await getEventRaw()
  const pub = publicInfo(raw)
  const canView = Boolean(viewer.role) || pub.openAccess
  // Signed-out visitors only ever receive placeholder details, so nothing real can leak from the page source.
  const event = canView ? eventView(raw) : placeholderEvent(pub)

  return (
    <html lang="en">
      <body>
        <AuthProvider initial={{ role: viewer.role, guest: viewer.guest, pub, canView, event }}>
          <ToastProvider>
            <ScrollProgress />
            <TopNav />
            {children}
            <BottomNav />
            <SignInModal />
            <Suspense fallback={null}>
              <ViewerEffects />
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
