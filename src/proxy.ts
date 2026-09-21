import { NextResponse, type NextRequest } from 'next/server'

const GUEST_COOKIE = 'wedding-guest'
const COUPLE_COOKIE = 'payload-token'

const hasCookie = (cookie: string, name: string) => new RegExp(`(?:^|;\\s*)${name}=`).test(cookie)

/**
 * The dashboard (Payload admin) belongs to the couple only, whatever "Open access" is set to.
 *
 *  1. Payload's internal endpoints (/api/access, /api/payload-*) exist for the admin panel. Refuse them
 *     outright unless the request carries a couple session cookie.
 *  2. If this browser also holds a guest session (say, the couple were testing an invitation link), hide that
 *     cookie from /admin requests so the admin shows its normal login screen instead of an "Unauthorized"
 *     dead end. The guest cookie itself is left untouched.
 *
 * (Collections and the Wedding global have their own access rules in Payload; this is an extra layer.)
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const cookie = request.headers.get('cookie') ?? ''

  if ((pathname === '/api/access' || pathname.startsWith('/api/payload-')) && !hasCookie(cookie, COUPLE_COOKIE)) {
    return NextResponse.json({ errors: [{ message: 'You are not allowed to perform this action.' }] }, { status: 403 })
  }

  if (pathname.startsWith('/admin') && hasCookie(cookie, GUEST_COOKIE)) {
    const headers = new Headers(request.headers)
    headers.set(
      'cookie',
      cookie
        .split(';')
        .map((c) => c.trim())
        .filter((c) => !c.startsWith(`${GUEST_COOKIE}=`))
        .join('; '),
    )
    return NextResponse.next({ request: { headers } })
  }

  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*', '/api/:path*'] }
