export default function AuthModal({ open, onClose, onLogin, onRegister, message }) {
  if (!open) return null

  return (
    <div className="ff-modalBackdrop" role="dialog" aria-modal="true">
      <div className="ff-modal">
        <div className="ff-panelTitle">Please login first</div>
        <div className="ff-panelHint" style={{ marginTop: 6 }}>
          {message ||
            'Lecture Mode and PDF Mode require an account so your notes and stats can be saved to MongoDB.'}
        </div>

        <div className="ff-row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
          <button type="button" className="ff-btn" onClick={onClose}>
            Not now
          </button>
          <button type="button" className="ff-btn" onClick={onRegister}>
            Register
          </button>
          <button type="button" className="ff-btn ff-btnPrimary" onClick={onLogin}>
            Login
          </button>
        </div>
      </div>
    </div>
  )
}

