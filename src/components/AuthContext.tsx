'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../lib/client-api'
import type { EventView, GuestView, PublicInfo, Role } from '../lib/views'

/** What the server decides about the visitor (see app/(frontend)/layout.tsx). */
export type AuthInitial = {
  role: Role
  guest: GuestView | null
  pub: PublicInfo
  canView: boolean
  event: EventView
}

export type AuthValue = {
  ready: true
  pub: PublicInfo
  role: Role
  guest: GuestView | null
  /** True when the visitor may see the pages: signed in, or the couple turned on Open access. */
  canView: boolean
  openAccess: boolean
  event: EventView
  unlockedAt: number
  loginNotice: string
  setLoginNotice: (message: string) => void
  signInOpen: boolean
  openSignIn: () => void
  closeSignIn: () => void
  login: (code: string) => Promise<{ guest: { id: number; name: string } }>
  logout: () => Promise<void>
  /** Show a fresher copy of the guest (e.g. after an RSVP) until the server refresh arrives. */
  setGuest: (guest: GuestView | null) => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}

/**
 * The server decides who is looking and what they may see, and hands it down as `initial`.
 * Signing in or out just calls Payload, then refreshes the server-rendered tree.
 */
export function AuthProvider({ initial, children }: { initial: AuthInitial; children: ReactNode }) {
  const router = useRouter()
  const [guestOverride, setGuestOverride] = useState<GuestView | null>(null)
  const [unlockedAt, setUnlockedAt] = useState(0)
  const [loginNotice, setLoginNotice] = useState('')
  const [signInOpen, setSignInOpen] = useState(false)

  useEffect(() => setGuestOverride(null), [initial.guest])

  /* Signed-out visitors: notice when the couple flip "Open access" on or off. */
  useEffect(() => {
    if (initial.role) return
    const id = setInterval(() => !document.hidden && router.refresh(), 15000)
    return () => clearInterval(id)
  }, [initial.role, router])

  const login = useCallback(
    async (code: string) => {
      const res = await api.post<{ guest: { id: number; name: string } }>('/api/guests/code-login', { code })
      setUnlockedAt(Date.now())
      setLoginNotice('')
      router.refresh()
      return res
    },
    [router],
  )

  const logout = useCallback(async () => {
    await api.post(initial.role === 'admin' ? '/api/users/logout' : '/api/guests/code-logout')
    setUnlockedAt(0)
    router.refresh()
  }, [initial.role, router])

  const value = useMemo<AuthValue>(
    () => ({
      ready: true,
      pub: initial.pub,
      role: initial.role,
      guest: guestOverride ?? initial.guest,
      canView: initial.canView,
      openAccess: initial.pub.openAccess,
      event: initial.event,
      unlockedAt,
      loginNotice,
      setLoginNotice,
      signInOpen,
      openSignIn: () => setSignInOpen(true),
      closeSignIn: () => setSignInOpen(false),
      login,
      logout,
      setGuest: setGuestOverride,
    }),
    [initial, guestOverride, unlockedAt, loginNotice, signInOpen, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
