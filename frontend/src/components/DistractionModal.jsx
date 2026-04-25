import { useEffect, useState } from 'react'

export default function DistractionModal({ onGoSession }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('Distraction detected')
  const [message, setMessage] = useState('You were away from your focus workspace.')
  const [actionLabel, setActionLabel] = useState('Go to session')

  useEffect(() => {
    const onEvt = (e) => {
      setTitle(e?.detail?.title || 'Distraction detected')
      setMessage(e?.detail?.message || 'You were away from your focus workspace.')
      setActionLabel(e?.detail?.actionLabel || 'Go to session')
      setOpen(true)
    }

    const onSummary = (e) => {
      setTitle(e?.detail?.title || 'Session completed')
      setMessage(e?.detail?.message || '')
      setActionLabel(e?.detail?.actionLabel || 'Go to session')
      setOpen(true)
    }

    window.addEventListener('ff:distraction', onEvt)
    window.addEventListener('ff:session-summary', onSummary)
    return () => {
      window.removeEventListener('ff:distraction', onEvt)
      window.removeEventListener('ff:session-summary', onSummary)
    }
  }, [])

  if (!open) return null

  return (
    <div className="ff-modalBackdrop" role="dialog" aria-modal="true">
      <div className="ff-modal">
        <div className="ff-panelTitle">{title}</div>
        <div className="ff-panelHint" style={{ marginTop: 6 }}>
          {message}
        </div>
        <div className="ff-row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
          <button type="button" className="ff-btn" onClick={() => setOpen(false)}>
            Dismiss
          </button>
          <button
            type="button"
            className="ff-btn ff-btnPrimary"
            onClick={() => {
              setOpen(false)
              onGoSession?.()
            }}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

