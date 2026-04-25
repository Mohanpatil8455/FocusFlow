import { useEffect, useMemo, useState } from 'react'
import { getMyNotes } from '../utils/api'

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ''
  }
}

export default function YourNotes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await getMyNotes()
        if (!alive) return
        setNotes(data)
      } catch (e) {
        if (!alive) return
        setError('Failed to load your notes')
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((n) => {
      const title = String(n.title || '').toLowerCase()
      const content = String(n.content || '').toLowerCase()
      return title.includes(q) || content.includes(q)
    })
  }, [notes, query])

  return (
    <section className="ff-panel">
      <div className="ff-panelHeader">
        <div>
          <div className="ff-panelTitle">Your Notes</div>
          <div className="ff-panelHint">Saved session notes from MongoDB.</div>
        </div>
        <input
          className="ff-input"
          style={{ minWidth: 220, flex: '0 0 260px' }}
          placeholder="Search notes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? <div className="ff-muted">Loading notes...</div> : null}
      {error ? <div className="ff-warning">{error}</div> : null}

      {!loading && !error ? (
        <div className="ff-notesList">
          {filtered.length === 0 ? (
            <div className="ff-empty">No notes saved yet. Use “Save now” in Notes panel.</div>
          ) : (
            filtered.map((n) => (
              <article key={n._id} className="ff-noteCard">
                <div className="ff-noteHead">
                  <div className="ff-panelTitle">{n.title || 'Untitled note'}</div>
                  <div className="ff-muted">{formatDate(n.createdAt)}</div>
                </div>
                <pre className="ff-noteText">{n.content || ''}</pre>
              </article>
            ))
          )}
        </div>
      ) : null}
    </section>
  )
}

