async function apiFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${method} ${path} failed: ${res.status} ${text}`)
  }
  return res.json()
}

export async function getMe() {
  const data = await apiFetch('/api/auth/me')
  return data.user
}

export async function register({ name = '', email, password }) {
  const data = await apiFetch('/api/auth/register', { method: 'POST', body: { name, email, password } })
  return data.user
}

export async function login({ email, password }) {
  const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } })
  return data.user
}

export async function logout() {
  const data = await apiFetch('/api/auth/logout', { method: 'POST' })
  return data.ok
}

export async function getSession() {
  const data = await apiFetch('/api/session')
  return data.session
}

export async function saveNotes(text) {
  const data = await apiFetch('/api/session/notes', { method: 'PATCH', body: { text } })
  return data.session
}

export async function addStats({ deltaFocusSeconds = 0, deltaDistractionSeconds = 0 }) {
  const data = await apiFetch('/api/session/stats', {
    method: 'PATCH',
    body: { deltaFocusSeconds, deltaDistractionSeconds },
  })
  return data.session
}

export async function saveTimer({ durationMinutes, remainingSeconds, running }) {
  const data = await apiFetch('/api/session/timer', {
    method: 'PATCH',
    body: { durationMinutes, remainingSeconds, running },
  })
  return data.session
}

export async function resetStats() {
  const data = await apiFetch('/api/session/reset-stats', { method: 'POST' })
  return data.session
}

export async function createNoteSnapshot({ title = '', content }) {
  const data = await apiFetch('/api/notes', { method: 'POST', body: { title, content } })
  return data.note
}

export async function getMyNotes() {
  const data = await apiFetch('/api/notes')
  return data.notes || []
}

