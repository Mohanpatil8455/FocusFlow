import { useEffect, useMemo, useState } from 'react'

function genId() {
  return Math.random().toString(36).slice(2)
}

export default function ToastHost() {
  const [toasts, setToasts] = useState([])

  const api = useMemo(() => {
    return {
      push: (t) => setToasts((prev) => [...prev, t]),
      remove: (id) => setToasts((prev) => prev.filter((x) => x.id !== id)),
    }
  }, [])

  useEffect(() => {
    const onToast = (e) => {
      const detail = e?.detail || {}
      const id = genId()
      const toast = {
        id,
        message: detail.message || '',
        type: detail.type || 'info',
        durationMs: typeof detail.durationMs === 'number' ? detail.durationMs : 3500,
      }
      api.push(toast)
      window.setTimeout(() => api.remove(id), toast.durationMs)
    }

    window.addEventListener('ff:toast', onToast)
    return () => window.removeEventListener('ff:toast', onToast)
  }, [api])

  if (toasts.length === 0) return null

  return (
    <div className="ff-toasts" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className={`ff-toast ff-toast--${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}

