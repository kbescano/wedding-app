/**
 * Verifies that the dashboard and couple-only data stay couple-only, with Open access both ON and OFF.
 * Needs the site running (npm run dev, or npm start) and a couple login + one guest code:
 *
 *   COUPLE_EMAIL=couple@example.com COUPLE_PASSWORD='...' GUEST_CODE=WELC-OME7 npm run check:access
 *
 * It flips the Open access checkbox while it runs and puts it back to how it found it.
 */
const base = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
const { COUPLE_EMAIL, COUPLE_PASSWORD, GUEST_CODE } = process.env
if (!COUPLE_EMAIL || !COUPLE_PASSWORD || !GUEST_CODE) {
  console.error('Set COUPLE_EMAIL, COUPLE_PASSWORD and GUEST_CODE (see the comment at the top of this file).')
  process.exit(2)
}

const json = { 'Content-Type': 'application/json' }
const cookieFrom = (res) => res.headers.getSetCookie().map((c) => c.split(';')[0]).filter((c) => !c.endsWith('=')).join('; ')

async function call(method, path, { cookie = '', body } = {}) {
  const res = await fetch(base + path, { method, headers: { ...(body ? json : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: 'follow' })
  return { status: res.status, text: await res.text(), res }
}

let failures = 0
const check = (ok, label) => {
  if (!ok) failures++
  console.log(`  ${ok ? '✓' : '✗'} ${label}`)
}

const login = await call('POST', '/api/users/login', { body: { email: COUPLE_EMAIL, password: COUPLE_PASSWORD } })
if (login.status !== 200) {
  console.error(`Couple login failed (${login.status}). Check COUPLE_EMAIL / COUPLE_PASSWORD.`)
  process.exit(2)
}
const couple = cookieFrom(login.res)
const guestLogin = await call('POST', '/api/guests/code-login', { body: { code: GUEST_CODE } })
if (guestLogin.status !== 200) {
  console.error(`Guest login failed (${guestLogin.status}). Check GUEST_CODE.`)
  process.exit(2)
}
const guest = cookieFrom(guestLogin.res)

const event = JSON.parse((await call('GET', '/api/globals/event', { cookie: couple })).text)
const original = !!event.openAccess
const secret = event.partner1 // must never appear in any admin page served to a non-couple visitor

const setOpen = (openAccess) => call('POST', '/api/globals/event', { cookie: couple, body: { openAccess } })

try {
  for (const open of [true, false]) {
    await setOpen(open)
    console.log(`\nOpen access ${open ? 'ON' : 'OFF'}`)

    for (const [who, cookie] of [['signed-out visitor', ''], ['guest', guest]]) {
      console.log(` ${who}`)
      for (const path of ['/api/users', '/api/quiz-questions', '/api/quiz-answers', '/api/access', '/api/payload-preferences', '/api/payload-locked-documents']) {
        check((await call('GET', path, { cookie })).status === 403, `GET ${path} is refused`)
      }
      check((await call('POST', '/api/globals/event', { cookie, body: { openAccess: !open } })).status === 403, 'cannot change the Wedding global (Open access included)')
      check((await call('POST', '/api/users', { cookie, body: { email: 'x@example.com', password: 'abcdefgh1!' } })).status === 403, 'cannot create a couple login')
      check((await call('POST', '/api/guests', { cookie, body: { name: 'x' } })).status === 403, 'cannot create guests')
      check((await call('POST', '/api/guests/quiz-tag', { cookie, body: { mode: 'all' } })).status === 403, 'cannot tag guests for the quiz')

      const guests = await call('GET', '/api/guests', { cookie })
      if (cookie) {
        const docs = JSON.parse(guests.text).docs ?? []
        check(docs.length === 1 && docs.every((d) => !('code' in d)), 'sees only their own guest record, without any invitation code')
      } else {
        check(guests.status === 403, 'GET /api/guests is refused')
      }

      for (const path of ['/admin', '/admin/globals/event', '/admin/collections/guests', '/admin/collections/guests/1']) {
        const page = await call('GET', path, { cookie })
        check(!page.text.includes(secret) && !/INVITATIONS|Tagged for quiz/i.test(page.text), `${path} shows no dashboard data`)
      }
      const home = await call('GET', '/', { cookie })
      check(!/Dashboard/.test(home.text), 'the site shows no "Dashboard" link')
    }

    console.log(' couple')
    check((await call('GET', '/api/users', { cookie: couple })).status === 200, 'GET /api/users works')
    check((await call('GET', '/api/quiz-questions', { cookie: couple })).status === 200, 'GET /api/quiz-questions works')
    check(/Dashboard/.test((await call('GET', '/', { cookie: couple })).text), 'the site shows the "Dashboard" link')
  }
} finally {
  await setOpen(original)
  console.log(`\nOpen access restored to ${original ? 'ON' : 'OFF'}.`)
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed: the dashboard is couple-only.')
process.exit(failures ? 1 : 0)
