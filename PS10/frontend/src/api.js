const BASE = import.meta.env.VITE_API_BASE || '/api'
const TOKEN_KEY = 'campuslink_token'

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t) } catch { /* private mode */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ } },
}

async function request(path, options = {}) {
  const token = tokenStore.get()
  const res = await fetch(BASE + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && !path.startsWith('/auth/')) {
    tokenStore.clear()
    window.dispatchEvent(new Event('campuslink:logout'))
  }
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${res.status})`)
  return data
}

export async function download(path, filename) {
  const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${tokenStore.get()}` } })
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  const url = URL.createObjectURL(await res.blob())
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

export async function upload(path, file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(BASE + path, { method: 'POST', body: fd, headers: tokenStore.get() ? { Authorization: `Bearer ${tokenStore.get()}` } : {} })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) { tokenStore.clear(); window.dispatchEvent(new Event('campuslink:logout')) }
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Upload failed (${res.status})`)
  return data
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
}
