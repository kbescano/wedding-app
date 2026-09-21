'use client'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/** Each route fades and rises in. */
export default function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      className={`page ${className}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.main>
  )
}
