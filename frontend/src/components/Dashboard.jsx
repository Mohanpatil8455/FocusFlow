import { useEffect, useState } from 'react'
import { FocusTracker } from './FocusTracker'
import { formatDuration, formatPercent } from '../utils/timeUtils'

function compute(snapshot) {
  const focus = snapshot.totalFocusSeconds || 0
  const distract = snapshot.totalDistractionSeconds || 0
  const total = focus + distract
  const focusPct = formatPercent(focus, total)
  const focusPctValue = total ? Math.round((focus / total) * 100) : 0
  const distractPctValue = total ? Math.round((distract / total) * 100) : 0
  const lost = distract
  return { focus, distract, total, focusPct, focusPctValue, distractPctValue, lost }
}

export default function Dashboard() {
  const [snap, setSnap] = useState(() => FocusTracker.getSnapshot())

  useEffect(() => FocusTracker.subscribe(setSnap), [])

  const { focus, distract, focusPct, focusPctValue, distractPctValue, lost } = compute(snap)
  const lecture = snap.modeSessionStats?.lecture || { focusSeconds: 0, distractionSeconds: 0 }
  const pdf = snap.modeSessionStats?.pdf || { focusSeconds: 0, distractionSeconds: 0 }
  const pieStyle = {
    background: `conic-gradient(#00e5ff 0% ${focusPctValue}%, #f59e0b ${focusPctValue}% 100%)`,
  }

  return (
    <section className="ff-dashboard">
      <div className="ff-panelHeader">
        <div>
          <div className="ff-panelTitle">Productivity Insights</div>
          <div className="ff-panelHint">Awareness, not restriction.</div>
        </div>
        <div className="ff-row ff-rowTight">
          <button type="button" className="ff-btn" onClick={() => FocusTracker.resetTotals()}>
            Reset stats
          </button>
        </div>
      </div>

      <div className="ff-cards ff-cardsPrimary">
        <div className="ff-card ff-cardPrimary">
          <div className="ff-cardLabel">Total Focus Time</div>
          <div className="ff-cardValue">{formatDuration(focus)}</div>
        </div>
        <div className="ff-card ff-cardWarn">
          <div className="ff-cardLabel">Total Distraction Time</div>
          <div className="ff-cardValue">{formatDuration(distract)}</div>
        </div>
        <div className="ff-card">
          <div className="ff-cardLabel">Focus Percentage</div>
          <div className="ff-cardValue">{focusPct}</div>
        </div>
        <div className="ff-card ff-cardDanger">
          <div className="ff-cardLabel">Time Lost</div>
          <div className="ff-cardValue">{formatDuration(lost)}</div>
        </div>
      </div>

      <div className="ff-insightsGrid">
        <div className="ff-card ff-chartCard">
          <div className="ff-cardLabel">Focus vs Distraction Split</div>
          <div className="ff-pieRow">
            <div className="ff-pieChart" style={pieStyle}>
              <div className="ff-pieHole">{focusPct}</div>
            </div>
            <div className="ff-legend">
              <div className="ff-legendItem">
                <span className="ff-dot ff-dotFocus" />
                Focus: {focusPctValue}%
              </div>
              <div className="ff-legendItem">
                <span className="ff-dot ff-dotDistract" />
                Distracted: {distractPctValue}%
              </div>
            </div>
          </div>
        </div>

        <div className="ff-card ff-chartCard">
          <div className="ff-cardLabel">Weekly Trend (Preview)</div>
          <div className="ff-bars">
            {[62, 74, 68, 80, 72, 86, focusPctValue].map((v, i) => (
              <div key={i} className="ff-barCol">
                <div className="ff-barTrack">
                  <div className="ff-barFill" style={{ height: `${v}%` }} />
                </div>
                <div className="ff-barLabel">{['M', 'T', 'W', 'T', 'F', 'S', 'Now'][i]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ff-inlineNote">
        Tip: switch tabs to see distraction time increment in real-time.
      </div>

      <div className="ff-cards" style={{ marginTop: 14 }}>
        <div className="ff-card">
          <div className="ff-cardLabel">Current Session Focus</div>
          <div className="ff-cardValue">{formatDuration(snap.sessionFocusSeconds || 0)}</div>
        </div>
        <div className="ff-card ff-cardWarn">
          <div className="ff-cardLabel">Current Session Distraction</div>
          <div className="ff-cardValue">{formatDuration(snap.sessionDistractionSeconds || 0)}</div>
        </div>
        <div className="ff-card">
          <div className="ff-cardLabel">Lecture Session (F / D)</div>
          <div className="ff-cardValue">
            {formatDuration(lecture.focusSeconds)} / {formatDuration(lecture.distractionSeconds)}
          </div>
        </div>
        <div className="ff-card">
          <div className="ff-cardLabel">PDF Session (F / D)</div>
          <div className="ff-cardValue">
            {formatDuration(pdf.focusSeconds)} / {formatDuration(pdf.distractionSeconds)}
          </div>
        </div>
      </div>
    </section>
  )
}

