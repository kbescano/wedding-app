export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, url, body) {
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, opts);
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection and try again.', 0);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new ApiError(data?.error || 'Something went wrong. Please try again.', res.status);
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body = {}) => request('POST', url, body),
  put: (url, body = {}) => request('PUT', url, body),
  del: (url) => request('DELETE', url),
};

/** Upload one photo with progress. */
export function uploadPhoto(file, caption, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('caption', caption || '');
    form.append('photo', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/photos');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data.photo);
      else reject(new ApiError(data?.error || 'Upload failed. Please try again.', xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('Upload failed. Check your connection.', 0));
    xhr.send(form);
  });
}
