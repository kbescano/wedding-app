'use client'
import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

const btn: React.CSSProperties = {
  padding: '10px 14px',
  minHeight: 40,
  border: '1px solid var(--theme-elevation-200)',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
}

/** Bulk quiz tagging above the guest list. (Or tag guests one by one with the “Tagged for the quiz” checkbox.) */
export const GuestTools: React.FC = () => {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const run = async (mode: 'attending' | 'all' | 'none', done: string) => {
    setBusy(true)
    try {
      const res = await fetch('/api/guests/quiz-tag', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Something went wrong.')
      toast.success(done)
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
      <span style={{ fontSize: 13, color: 'var(--theme-elevation-600)' }}>Quiz tagging:</span>
      <button type="button" style={btn} disabled={busy} onClick={() => run('attending', 'Everyone who RSVP’d yes is tagged.')}>
        Tag everyone attending
      </button>
      <button type="button" style={btn} disabled={busy} onClick={() => run('all', 'Every guest is tagged.')}>Tag all guests</button>
      <button type="button" style={btn} disabled={busy} onClick={() => run('none', 'All tags cleared.')}>Clear tags</button>
    </div>
  )
}
