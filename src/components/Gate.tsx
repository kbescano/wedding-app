'use client'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Lock, X } from 'lucide-react'
import { useAuth } from './AuthContext'
import { useToast } from './Toast'
import { initials } from '../lib/format'

export type Section = 'home' | 'memories' | 'messages' | 'games' | 'seating'

const COPY: Record<Section, [string, string, string]> = {
  home: ['By invitation only', 'Your invitation is sealed', 'Enter the code from your invitation to break the seal.'],
  memories: ['Guests only', 'Memories are for guests', 'Sign in with your invitation code to see and share photos.'],
  messages: [
    'Guests only',
    'Leave a message for the couple',
    'Sign in with your invitation code to read and write messages.',
  ],
  games: ['Guests only', 'Games are for guests', 'Sign in with your invitation code to join the quiz.'],
  seating: ['Guests only', 'Find your seat', 'Sign in with your invitation code to see where you’re sitting.'],
}

function formatTyped(v: string) {
  const clean = v
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
}

/** Invitation-code field + button. Shared by the sealed-page card and the sign-in modal. */
type CodeFormProps = {
  onDone?: (res: { guest: { id: number; name: string } }) => void
  autoFocus?: boolean
}

export function CodeForm({ onDone, autoFocus = false }: CodeFormProps) {
  const { login, loginNotice, setLoginNotice } = useAuth()
  const params = useSearchParams()
  const [code, setCode] = useState(() => formatTyped(params.get('code') || ''))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setLoginNotice('')
    try {
      const res = await login(code)
      onDone?.(res)
    } catch (err) {
      setError((err as Error).message)
      setShake((n) => n + 1)
      setBusy(false)
    }
  }

  const message = error || loginNotice

  return (
    <>
      <motion.form
        key={shake}
        onSubmit={submit}
        className="code-form"
        animate={shake ? { x: [0, -10, 9, -6, 4, 0] } : undefined}
        transition={{ duration: 0.45 }}
      >
        <label className="sr-only" htmlFor="invite-code">
          Invitation code
        </label>
        <input
          id="invite-code"
          className="code-input"
          value={code}
          onChange={(e) => setCode(formatTyped(e.target.value))}
          placeholder="ABCD-1234"
          autoComplete="off"
          autoCapitalize="characters"
          autoFocus={autoFocus}
          spellCheck={false}
          aria-invalid={!!message}
        />
        <button className="btn btn-primary" disabled={busy || code.length < 8}>
          {busy ? 'Opening…' : 'Open'} <ArrowRight size={16} />
        </button>
      </motion.form>

      <AnimatePresence>
        {message && (
          <motion.p
            className="form-error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </>
  )
}

function Seal() {
  const { pub } = useAuth()
  return (
    <motion.div
      className="seal"
      initial={{ rotate: -40, scale: 0.4, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.25 }}
    >
      <span>{initials(pub?.partner1, pub?.partner2) || '&'}</span>
    </motion.div>
  )
}

function LockCard({ section }: { section: Section }) {
  const [eyebrow, title, blurb] = COPY[section] || COPY.home
  return (
    <motion.div
      className="lockcard"
      role="dialog"
      aria-label="Enter your invitation code"
      initial={{ opacity: 0, y: 36, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -24, scale: 1.05, filter: 'blur(6px)' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <Seal />
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="lock-title">{title}</h2>
      <p className="lock-blurb">{blurb}</p>
      <CodeForm />
      <p className="lock-foot">
        <Lock size={12} /> Your code was sent by the couple.{' '}
        <a href="/admin" className="text-link">
          Couple sign-in
        </a>
      </p>
    </motion.div>
  )
}

/**
 * Sign-in dialog for visitors who can already look around (open access is on)
 * but need a code to add photos, write messages, RSVP or play.
 */
export function SignInModal() {
  const { signInOpen, closeSignIn, role } = useAuth()
  const toast = useToast()

  useEffect(() => {
    if (!signInOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSignIn()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [signInOpen, closeSignIn])

  return (
    <AnimatePresence>
      {signInOpen && !role && (
        <motion.div
          className="signin-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeSignIn}
        >
          <motion.div
            className="lockcard"
            role="dialog"
            aria-label="Sign in with your invitation code"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Seal />
            <button className="icon-btn lock-close" onClick={closeSignIn} aria-label="Close">
              <X size={18} />
            </button>
            <p className="eyebrow">Invited guests</p>
            <h2 className="lock-title">Sign in with your code</h2>
            <p className="lock-blurb">
              Add photos, write messages, RSVP and play the quiz with your personal invitation code.
            </p>
            <CodeForm
              autoFocus
              onDone={(res) => {
                closeSignIn()
                toast(`Welcome, ${res.guest.name}`)
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Wraps a page. Visitors who can't view yet see it blurred with placeholder content only;
 * once they sign in (or the couple turn on open access) the blur dissolves in place.
 */
export default function Gate({ section = 'home', children }: { section?: Section; children: ReactNode }) {
  const { canView, unlockedAt } = useAuth()
  const locked = !canView
  const recent = useRef(unlockedAt && Date.now() - unlockedAt < 4000).current
  const [state, setState] = useState(locked || recent ? 'locked' : 'open')

  useEffect(() => {
    if (locked) return setState('locked')
    if (state !== 'locked') return
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setState('opening')))
    return () => cancelAnimationFrame(id)
  }, [locked]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state !== 'opening') return
    const t = setTimeout(() => setState('open'), 1900)
    return () => clearTimeout(t)
  }, [state])

  return (
    <>
      <div className={`gate-content is-${state}`} inert={locked} aria-hidden={locked || undefined}>
        {children}
      </div>
      <AnimatePresence>
        {locked && (
          <div className="lock-layer">
            <LockCard section={section} />
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
