'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../lib/client-api.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

/**
 * The server decides who is looking and what they may see (see app/(frontend)/layout.tsx) and hands it down as
 * `initial`. Signing in or out just calls Payload, then refreshes the server-rendered tree.
 */
export function AuthProvider({ initial, children }) {
  const router = useRouter()
  const [guestOverride, setGuestOverride] = useState(null)
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
    async (code) => {
      const res = await api.post('/api/guests/code-login', { code })
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

  const value = useMemo(
    () => ({
      ready: true,
      pub: initial.pub,
      role: initial.role,
      guest: guestOverride ?? initial.guest,
      /** True when the visitor may see the pages: signed in, or the couple turned on Open access. */
      canView: initial.canView,
      openAccess: !!initial.pub?.openAccess,
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
