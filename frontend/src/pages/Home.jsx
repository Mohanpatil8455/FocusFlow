import Dashboard from '../components/Dashboard'

export default function Home({ onNavigate, isAuthed }) {
  return (
    <div className="ff-home">
      
      <section className="ff-hero">
        <div className="ff-heroContent">
          <h1 className="ff-h1">FocusFlow</h1>

          <p className="ff-lead">
            A unified workspace for lectures, PDFs, and notes—plus real-time focus vs distraction tracking.
          </p>

          <div className="ff-row">
            <button
              type="button"
              className="ff-btn ff-btnPrimary"
              onClick={() => onNavigate('lecture')}
            >
              Start Lecture Mode
            </button>

            <button
              type="button"
              className="ff-btn"
              onClick={() => onNavigate('pdf')}
            >
              Start PDF Mode
            </button>

            <button
              type="button"
              className="ff-btn"
              onClick={() => onNavigate('dashboard')}
            >
              View Dashboard
            </button>
          </div>
        </div>
      </section>

      <div className="ff-grid2">
        <div className="ff-panel">
          <div className="ff-panelHeader">
            <div>
              <div className="ff-panelTitle">How tracking works</div>
              <div className="ff-panelHint">
                Simple rules designed to avoid “blocking”.
              </div>
            </div>
          </div>

          <ul className="ff-list">
            <li>Visible + focused tab = counts as focus time</li>
            <li>Tab hidden / window blur = counts as distraction time</li>
            <li>Lecture playing = focus (no interaction needed)</li>
            <li>Paused &gt; 60s = warning</li>
          </ul>
        </div>

        <div className="ff-panel">
          <div className="ff-panelHeader">
            <div>
              <div className="ff-panelTitle">Session Workflow</div>
              <div className="ff-panelHint">Behavior-awareness, not blocking.</div>
            </div>
          </div>
          <ul className="ff-list">
            <li>Login to unlock focus sessions and data sync</li>
            <li>Set your preferred focus duration</li>
            <li>Start session and study inside Lecture/PDF modes</li>
            <li>Review focus vs distraction insights in real time</li>
          </ul>
        </div>
      </div>

      {isAuthed ? <Dashboard /> : null}
    </div>
  )
}