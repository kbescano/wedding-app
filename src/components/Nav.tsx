'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Armchair, Gamepad2, Images, KeyRound, Lock, LogOut, MailOpen, MessageCircleHeart, LayoutDashboard } from 'lucide-react'
import { useAuth } from './AuthContext.jsx'
import { useToast } from './Toast.jsx'
import { initials } from '../lib/format.js'

const ITEMS = [
  { to: '/', label: 'Invitation', icon: MailOpen },
  { to: '/memories', label: 'Memories', icon: Images },
  { to: '/messages', label: 'Messages', icon: MessageCircleHeart },
  { to: '/games', label: 'Games', icon: Gamepad2 },
  { to: '/seating', label: 'Seating', icon: Armchair },
]

const useActive = () => {
  const pathname = usePathname()
  return (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to))
}

export function TopNav() {
  const { pub, role, guest, logout, canView, openAccess, openSignIn } = useAuth()
  const toast = useToast()
  const router = useRouter()
  const isActive = useActive()
  const locked = !canView

  const signOut = async () => {
    await logout()
    router.push('/')
    toast(openAccess ? 'Signed out.' : 'Signed out. The invitation is sealed again.')
  }

  return (
    <motion.header
      className="topnav"
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href="/" className="brand" aria-label="Home">
        <span className="brand-mark">{initials(pub?.partner1, pub?.partner2).split('').join(' & ')}</span>
      </Link>

      <nav className="topnav-links" aria-label="Main">
        {ITEMS.map(({ to, label }) => {
          const active = isActive(to)
          return (
            <Link key={to} href={to} className="topnav-link" aria-current={active ? 'page' : undefined}>
              <span>{label}</span>
              {locked && <Lock size={11} className="lock-dot" aria-hidden />}
              {active && <motion.i layoutId="nav-underline" className="topnav-underline" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
            </Link>
          )
        })}
      </nav>

      <div className="topnav-user">
        {role === 'admin' && (
          <a href="/admin" className="chip-link">
            <LayoutDashboard size={14} /> <span>Dashboard</span>
          </a>
        )}
        {!role && canView && (
          <button className="chip-link" onClick={openSignIn}>
            <KeyRound size={14} /> <span>Guest sign-in</span>
          </button>
        )}
        {role === 'guest' && <span className="hello">Hello, {guest.name.split(' ')[0]}</span>}
        {role && (
          <button className="icon-btn" onClick={signOut} aria-label="Sign out" title="Sign out">
            <LogOut size={17} />
          </button>
        )}
      </div>
    </motion.header>
  )
}

export function BottomNav() {
  const { canView } = useAuth()
  const isActive = useActive()
  return (
    <motion.nav
      className="bottomnav"
      aria-label="Main"
      initial={{ y: 90 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {ITEMS.map(({ to, label, icon: Icon }) => {
        const active = isActive(to)
        return (
          <Link key={to} href={to} className="bottomnav-link" aria-current={active ? 'page' : undefined}>
            {active && <motion.i layoutId="bottom-pill" className="bottomnav-pill" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            <span className="bottomnav-icon">
              <Icon size={20} strokeWidth={active ? 2.2 : 1.7} />
              {!canView && <Lock size={9} className="lock-badge" aria-hidden />}
            </span>
            <span className="bottomnav-label">{label}</span>
          </Link>
        )
      })}
    </motion.nav>
  )
}
