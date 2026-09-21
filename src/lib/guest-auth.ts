import crypto from 'node:crypto'

/**
 * Guests sign in with the personal invitation code the couple send them. No email or password.
 * A successful login sets a signed, HTTP-only cookie; the `guest-code` strategy on the Guests
 * collection turns that cookie back into `req.user`. Regenerating a guest's code invalidates
 * every cookie issued for the old code (the token carries a fingerprint of the code).
 */
export const GUEST_COOKIE = 'wedding-guest'
export const GUEST_TTL_SECONDS = 60 * 60 * 24 * 60

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L

export function generateCode(): string {
  const bytes = crypto.randomBytes(8)
  let code = ''
  for (let i = 0; i < 8; i++) code += ALPHABET[bytes[i] % ALPHABET.length]
  return code
}

export const normalizeCode = (input: unknown): string =>
  String(input ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

export const formatCode = (code = ''): string => (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code)

const secret = () => process.env.PAYLOAD_SECRET || ''
export const codeFingerprint = (code: string) =>
  crypto.createHash('sha256').update(`${secret()}:${code}`).digest('hex').slice(0, 12)
const sign = (body: string) => crypto.createHmac('sha256', secret()).update(body).digest('base64url')

export function createGuestToken(guest: { id: number | string; code?: string | null }): string {
  const exp = Math.floor(Date.now() / 1000) + GUEST_TTL_SECONDS
  const body = `${guest.id}.${exp}.${codeFingerprint(guest.code ?? '')}`
  return `${body}.${sign(body)}`
}

export function readGuestToken(token?: string | null): { id: string; fingerprint: string } | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 4) return null
  const [id, exp, fingerprint, signature] = parts
  const expected = sign(`${id}.${exp}.${fingerprint}`)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  if (Number(exp) < Date.now() / 1000) return null
  return { id, fingerprint }
}

export function parseCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

export const guestCookie = (token: string, secure: boolean) =>
  `${GUEST_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${GUEST_TTL_SECONDS}${secure ? '; Secure' : ''}`

export const clearGuestCookie = () => `${GUEST_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
