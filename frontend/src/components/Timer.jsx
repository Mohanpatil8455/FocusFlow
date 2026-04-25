import { useEffect, useRef, useState } from 'react'
import { FocusTracker } from './FocusTracker'
import { getSession, saveTimer as apiSaveTimer } from '../utils/api'
import { clampNumber, formatDuration } from '../utils/timeUtils'
import { toast } from '../utils/toast'
import { showSessionSummaryPrompt } from '../utils/distractionPrompt'

export default function Timer({ defaultMinutes = 25, isAuthed = false, onRequireLogin }) {
  const defaultSeconds = clampNumber(defaultMinutes, 1, 180) * 60

  const [durationMinutes, setDurationMinutes] = useState(clampNumber(defaultMinutes, 1, 180))
  const [remaining, setRemaining] = useState(defaultSeconds)
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(true)

  const intervalRef = useRef(null)

  useEffect(() => {
    FocusTracker.init()
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const session = await getSession()
        if (!alive) return
        const t = session?.timer
        const mins = clampNumber(typeof t?.durationMinutes === 'number' ? t.durationMinutes : defaultMinutes, 1, 180)
        setDurationMinutes(mins)
        setRemaining(typeof t?.remainingSeconds === 'number' ? Math.max(0, Math.floor(t.remainingSeconds)) : mins * 60)
        setRunning(!!t?.running)
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [defaultMinutes])

  useEffect(() => {
    if (loading) return
    ;(async () => {
      try {
        await apiSaveTimer({ durationMinutes, remainingSeconds: remaining, running })
      } catch {
        // ignore; UI still works
      }
    })()
  }, [remaining, running, durationMinutes, loading])

  useEffect(() => {
    FocusTracker.setTimerRunning(running)
  }, [running])

  useEffect(() => {
    if (running) FocusTracker.startSession()
    else FocusTracker.stopSession()
  }, [running])

  useEffect(() => {
    if (!isAuthed && running) {
      setRunning(false)
      FocusTracker.stopSession()
    }
  }, [isAuthed, running])

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      intervalRef.current = null
      return
    }

    intervalRef.current = window.setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) return 0
        return s - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [running])

  useEffect(() => {
    if (running && remaining === 0) {
      const stats = FocusTracker.getSnapshot()
      const lecture = stats.modeSessionStats?.lecture || { focusSeconds: 0, distractionSeconds: 0 }
      const pdf = stats.modeSessionStats?.pdf || { focusSeconds: 0, distractionSeconds: 0 }
      setRunning(false)
      toast('Focus session complete', { type: 'info' })
      showSessionSummaryPrompt({
        title: 'Session complete',
        message: `Session focus: ${formatDuration(stats.sessionFocusSeconds)}. Session distraction: ${formatDuration(
          stats.sessionDistractionSeconds,
        )}. Lecture mode (F/D): ${formatDuration(lecture.focusSeconds)} / ${formatDuration(
          lecture.distractionSeconds,
        )}. PDF mode (F/D): ${formatDuration(pdf.focusSeconds)} / ${formatDuration(pdf.distractionSeconds)}.`,
        actionLabel: 'Go to session',
      })
    }
  }, [remaining, running])

  return (
    <section className="ff-timer">
      <div className="ff-timerTop">
        <div>
          <div className="ff-panelTitle">Focus Timer</div>
          <div className="ff-panelHint">
            {isAuthed ? 'Set your session length (1–180 min)' : 'Login required to start tracking'}
          </div>
        </div>
        <div className="ff-timerValue">{formatDuration(remaining)}</div>
      </div>

      <div className="ff-row ff-rowTight" style={{ justifyContent: 'space-between' }}>
        <label className="ff-muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Minutes
          <input
            className="ff-input"
            style={{ flex: '0 0 110px', minWidth: 110, padding: '8px 10px' }}
            type="number"
            min={1}
            max={180}
            value={durationMinutes}
            disabled={running || loading}
            onChange={(e) => {
              const n = Number(e.target.value)
              const next = clampNumber(Number.isFinite(n) ? n : defaultMinutes, 1, 180)
              setDurationMinutes(next)
              setRemaining((prev) => {
                // If timer hasn't started (or was reset), keep remaining aligned to the chosen duration.
                if (!running) return next * 60
                return prev
              })
            }}
          />
        </label>
        <div className="ff-row ff-rowTight">
          <button
            type="button"
            className="ff-btn"
            disabled={running || loading}
            onClick={() => {
              setDurationMinutes(25)
              setRemaining(25 * 60)
            }}
          >
            25
          </button>
          <button
            type="button"
            className="ff-btn"
            disabled={running || loading}
            onClick={() => {
              setDurationMinutes(50)
              setRemaining(50 * 60)
            }}
          >
            50
          </button>
        </div>
      </div>

      <div className="ff-row ff-rowTight">
        <button
          type="button"
          className={`ff-btn ${running ? '' : 'ff-btnPrimary'}`}
          onClick={() => {
            if (!isAuthed) {
              onRequireLogin?.()
              return
            }
            setRunning(true)
          }}
          disabled={loading || running || remaining === 0}
        >
          Start
        </button>
        <button type="button" className="ff-btn" onClick={() => setRunning(false)} disabled={loading || !running}>
          Pause
        </button>
        <button
          type="button"
          className="ff-btn"
          onClick={() => {
            setRunning(false)
            setRemaining(durationMinutes * 60)
          }}
          disabled={loading}
        >
          Reset
        </button>
      </div>
    </section>
  )
}

