export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

/** Payload REST errors look like { errors: [{ message, data: { errors: [{ message }] } }] }. Our own endpoints use { error }. */
const messageFrom = (data) =>
  data?.error ||
  data?.errors?.[0]?.data?.errors?.[0]?.message ||
  data?.errors?.[0]?.message ||
  'Something went wrong. Please try again.'

async function request(method, url, body) {
  const opts = { method, credentials: 'same-origin', headers: {} }
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  let res
  try {
    res = await fetch(url, opts)
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection and try again.', 0)
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new ApiError(messageFrom(data), res.status)
  return data
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body = {}) => request('POST', url, body),
  patch: (url, body = {}) => request('PATCH', url, body),
  del: (url) => request('DELETE', url),
}

/** Upload one photo to the Photos collection with progress (Payload REST: multipart `file` + `_payload`). */
export function uploadPhoto(file, caption, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('_payload', JSON.stringify({ caption: caption || '' }))
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/photos?depth=0')
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.onload = () => {
      let data = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data.doc)
      else reject(new ApiError(messageFrom(data), xhr.status))
    }
    xhr.onerror = () => reject(new ApiError('Upload failed. Check your connection.', 0))
    xhr.send(form)
  })
}
