import { useEffect, useMemo, useState } from 'react'
import { createNoteSnapshot, getSession, saveNotes } from '../utils/api'

export default function NotesPanel() {
  const [value, setValue] = useState('')
  const [savedAt, setSavedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const session = await getSession()
        if (!alive) return
        setValue(session?.notesText || '')
      } catch (e) {
        if (!alive) return
        setError(e?.message || 'Failed to load notes')
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const saveDebounced = useMemo(() => {
    let t = null
    return (next) => {
      if (t) window.clearTimeout(t)
      t = window.setTimeout(() => {
        ;(async () => {
          try {
            await saveNotes(next)
            setSavedAt(Date.now())
            setError('')
          } catch (e) {
            setError(e?.message || 'Failed to save notes')
          }
        })()
      }, 350)
    }
  }, [])

  useEffect(() => {
    saveDebounced(value)
  }, [value, saveDebounced])

  return (
    <aside className="ff-notes">
      <div className="ff-panelHeader">
        <div>
          <div className="ff-panelTitle">Notes</div>
          <div className="ff-panelHint">
            Autosaves to MongoDB{savedAt ? ` • saved` : ''}
          </div>
          {error ? <div className="ff-warning" style={{ marginTop: 8 }}>{error}</div> : null}
        </div>
      </div>

      <textarea
        className="ff-textarea"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={loading ? 'Loading notes…' : 'Write notes here… (saved to MongoDB)'}
        disabled={loading}
      />

      <div className="ff-notesFooter">
        <button type="button" className="ff-btn" onClick={() => setValue('')}>
          Clear
        </button>
        <button
          type="button"
          className="ff-btn ff-btnPrimary"
          onClick={() => {
            ;(async () => {
              try {
                await saveNotes(value)
                await createNoteSnapshot({
                  title: `Session note ${new Date().toLocaleString()}`,
                  content: value,
                })
                setSavedAt(Date.now())
                setError('')
              } catch (e) {
                setError(e?.message || 'Failed to save notes')
              }
            })()
          }}
          disabled={loading}
        >
          Save now
        </button>
      </div>
    </aside>
  )
}
