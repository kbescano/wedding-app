'use client'
import { toast, useFormFields } from '@payloadcms/ui'
import QRCode from 'qrcode'
import React, { useEffect, useState } from 'react'

const formatCode = (code = '') => (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code)

const btn: React.CSSProperties = {
  padding: '10px 14px',
  minHeight: 40,
  border: '1px solid var(--theme-elevation-200)',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
  textDecoration: 'none',
}

/** "Send login" panel on each guest: personal link, QR code and a ready-made message. */
export const InviteLink: React.FC = () => {
  const code = useFormFields(([fields]) => fields.code?.value as string | undefined)
  const name = useFormFields(([fields]) => fields.name?.value as string | undefined)
  const [qr, setQr] = useState('')
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), []) // after mount, so server and client render the same first pass
  const link = code && origin ? `${origin}/i/${formatCode(code)}` : ''
  const first = (name || 'there').split(' ')[0]
  const message = `Hi ${first}! You're invited to our wedding. Open your personal invitation here: ${link}\n\nYour invitation code: ${formatCode(code)}`

  useEffect(() => {
    if (link) QRCode.toDataURL(link, { margin: 1, width: 220, color: { dark: '#1E3B2E', light: '#FBF7EE' } }).then(setQr)
    else setQr('')
  }, [link])

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(done)
    } catch {
      toast.error('Couldn’t copy. Select the text and copy it manually.')
    }
  }

  return (
    <div style={{ margin: '0 0 24px', padding: 16, border: '1px dashed var(--theme-elevation-200)', borderRadius: 4 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Send login</div>
      {!code ? (
        <p style={{ margin: 0, color: 'var(--theme-elevation-600)' }}>
          Save this guest to create their personal invitation link and QR code.
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {qr && <img src={qr} alt={`QR code for ${name}'s invitation`} width={130} height={130} style={{ border: '1px solid var(--theme-elevation-100)' }} />}
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--theme-elevation-600)' }}>
              Invitation code
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>{formatCode(code)}</div>
            <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} style={{ width: '100%', marginBottom: 10, fontSize: 16 }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" style={btn} onClick={() => copy(link, 'Link copied')}>Copy link</button>
              <button type="button" style={btn} onClick={() => copy(message, 'Message copied')}>Copy message</button>
              <a style={btn} href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">WhatsApp</a>
              <a style={btn} href={`mailto:?subject=${encodeURIComponent('Your wedding invitation')}&body=${encodeURIComponent(message)}`}>Email</a>
              <a style={btn} href={`sms:?&body=${encodeURIComponent(message)}`}>Text</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
