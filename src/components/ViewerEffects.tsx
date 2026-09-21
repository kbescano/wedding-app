'use client'
import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from './AuthContext'
import { useToast } from './Toast'

/** Personal invitation links (/i/CODE -> /?code=CODE) sign the guest in automatically. */
export default function ViewerEffects() {
  const { role, login, setLoginNotice } = useAuth()
  const toast = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const code = params.get('code')
  const tried = useRef('')

  useEffect(() => {
    if (!code) return
    const clear = () => router.replace(pathname, { scroll: false })
    if (role) return clear()
    if (tried.current === code) return
    tried.current = code
    login(code)
      .then((res) => {
        toast(`Welcome, ${res.guest.name}`)
        clear()
      })
      .catch((err: Error) => setLoginNotice(err.message))
  }, [code, role]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
