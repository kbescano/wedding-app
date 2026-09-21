import type { Access, FieldAccess, PayloadRequest } from 'payload'

/** Couple = users in the Payload admin. Guests = the `guests` auth collection (signed in by invitation code). */
export const isAdminUser = (user: any): boolean => user?.collection === 'users'
export const isGuestUser = (user: any): boolean => user?.collection === 'guests'

export const isAdmin: Access = ({ req }) => isAdminUser(req.user)
export const adminOnlyField: FieldAccess = ({ req }) => isAdminUser(req.user)

/** The couple's global "Open access" switch (Globals → Wedding). */
export async function isOpenAccess(req: PayloadRequest): Promise<boolean> {
  const event = await req.payload.findGlobal({ slug: 'event', depth: 0, req })
  return Boolean((event as any)?.openAccess)
}

/** Signed-in guests and the couple always; anyone else only while Open access is on. */
export const canView: Access = async ({ req }) => Boolean(req.user) || (await isOpenAccess(req))
