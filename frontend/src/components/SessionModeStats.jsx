import { useEffect, useState } from 'react'
import { FocusTracker } from './FocusTracker'
import { formatDuration } from '../utils/timeUtils'

/**
 * Shows this focus session’s focus vs distraction time for the current study mode
 * (lecture or PDF), using data already tracked in FocusTracker.
 */
export default function SessionModeStats({ mode = 'lecture' }) {
  const [snap, setSnap] = useState(() => FocusTracker.getSnapshot())

  useEffect(() => FocusTracker.subscribe(setSnap), [])

  const key = mode === 'pdf' ? 'pdf' : 'lecture'
  const row = snap.modeSessionStats?.[key] || { focusSeconds: 0, distractionSeconds: 0 }
  const label = key === 'pdf' ? 'PDF mode (this session)' : 'Lecture mode (this session)'

  return (
    <div className="ff-sessionModeStats" role="status">
      <span className="ff-sessionModeStats-label">{label}</span>
      <span className="ff-sessionModeStats-values">
        <span className="ff-sessionModeStats-focus">Focus {formatDuration(row.focusSeconds)}</span>
        <span className="ff-sessionModeStats-sep">·</span>
        <span className="ff-sessionModeStats-distract">
          Distraction {formatDuration(row.distractionSeconds)}
        </span>
      </span>
      {!snap.sessionRunning ? (
        <span className="ff-sessionModeStats-hint">Start the focus timer to record this session.</span>
      ) : null}
    </div>
  )
}
