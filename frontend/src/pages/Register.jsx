import { useState } from 'react'
import { register } from '../utils/api'

export default function Register({ onAuthed, onNavigate }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  return (
    <section className="ff-auth">
      <div className="ff-panel">
        <div className="ff-panelHeader">
          <div>
            <div className="ff-panelTitle">Register</div>
            <div className="ff-panelHint">Create an account to sync notes and stats.</div>
          </div>
        </div>

        {error ? <div className="ff-warning">{error}</div> : null}

        <div className="ff-row" style={{ marginTop: 10 }}>
          <input className="ff-input" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="ff-row" style={{ marginTop: 10 }}>
          <input className="ff-input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="ff-row" style={{ marginTop: 10 }}>
          <input
            className="ff-input"
            placeholder="Password (min 6 chars)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="ff-row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="ff-btn" onClick={() => onNavigate('login')}>
            I already have an account
          </button>
          <button
            type="button"
            className="ff-btn ff-btnPrimary"
            disabled={loading || !email.trim() || password.length < 6}
            onClick={async () => {
              setLoading(true)
              setError('')
              try {
                const user = await register({ name, email, password })
                onAuthed(user)
                onNavigate('home')
              } catch (e) {
                setError('Registration failed (email may already exist)')
              } finally {
                setLoading(false)
              }
            }}
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </div>
    </section>
  )
}

