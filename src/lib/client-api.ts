import type { Photo } from '../payload-types'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

type PayloadErrorBody = {
  error?: string
  errors?: { message?: string; data?: { errors?: { message?: string }[] } }[]
}

/** Payload REST errors look like { errors: [{ message, data: { errors: [{ message }] } }] }. Our own endpoints use { error }. */
const messageFrom = (data: PayloadErrorBody | null): string =>
  data?.error ||
  data?.errors?.[0]?.data?.errors?.[0]?.message ||
  data?.errors?.[0]?.message ||
  'Something went wrong. Please try again.'

async function request<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin', headers: {} }
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection and try again.', 0)
  }
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new ApiError(messageFrom(data as PayloadErrorBody | null), res.status)
  return data as T
}

export const api = {
  get: <T = unknown>(url: string) => request<T>('GET', url),
  post: <T = unknown>(url: string, body: unknown = {}) => request<T>('POST', url, body),
  patch: <T = unknown>(url: string, body: unknown = {}) => request<T>('PATCH', url, body),
  del: <T = unknown>(url: string) => request<T>('DELETE', url),
}

/** Upload one photo to the Photos collection with progress (Payload REST: multipart `file` + `_payload`). Resolves with the created document. */
export function uploadPhoto(file: File, caption: string, onProgress?: (fraction: number) => void): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('_payload', JSON.stringify({ caption: caption || '' }))
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/photos?depth=0')
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.onload = () => {
      let data: ({ doc?: Photo } & PayloadErrorBody) | null = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.doc) resolve(data.doc)
      else reject(new ApiError(messageFrom(data), xhr.status))
    }
    xhr.onerror = () => reject(new ApiError('Upload failed. Check your connection.', 0))
    xhr.send(form)
  })
}

/** A readable message from anything thrown (a caught value is `unknown` in TypeScript). */
export const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : 'Something went wrong. Please try again.'
