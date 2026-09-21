export const parseDate = (date: string, time = '00:00'): Date => {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh || 0, mm || 0)
}

export const longDate = (date: string): string =>
  parseDate(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export const shortDate = (date: string): string =>
  parseDate(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export const weekday = (date: string): string => parseDate(date).toLocaleDateString('en-GB', { weekday: 'long' })

export const clock = (time?: string): string => {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export const timeAgo = (iso: string): string => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export const formatCode = (code = ''): string => (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code)

export const initials = (a = '', b = ''): string => `${a.trim()[0] || ''}${b.trim()[0] || ''}`.toUpperCase()

export type CalendarEvent = {
  partner1: string
  partner2: string
  date: string
  time?: string
  venue?: string
  address?: string
}

/** Download a calendar file for the wedding. */
export function downloadCalendar(event: CalendarEvent): void {
  const start = parseDate(event.date, event.time || '16:00')
  const end = new Date(start.getTime() + 6 * 3600e3)
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wedding//EN',
    'BEGIN:VEVENT',
    `UID:wedding-${event.date}@invitation`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`${event.partner1} & ${event.partner2}'s Wedding`)}`,
    `LOCATION:${esc([event.venue, event.address].filter(Boolean).join(', '))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'wedding.ics' })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Shrink big phone photos before upload (faster on cellular, gentler on storage). */
export async function prepareImage(file: File, max = 2200): Promise<File> {
  if (file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.86))
    return blob && blob.size < file.size ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}
