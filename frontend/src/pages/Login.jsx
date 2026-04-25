import { useState } from 'react'
import { login } from '../utils/api'

export default function Login({ onAuthed, onNavigate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  return (
    <section className="ff-auth">
      <div className="ff-panel">
        <div className="ff-panelHeader">
          <div>
            <div className="ff-panelTitle">Login</div>
            <div className="ff-panelHint">Access Lecture/PDF modes and sync to MongoDB.</div>
          </div>
        </div>

        {error ? <div className="ff-warning">{error}</div> : null}

        <div className="ff-row" style={{ marginTop: 10 }}>
          <input className="ff-input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="ff-row" style={{ marginTop: 10 }}>
          <input
            className="ff-input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="ff-row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="ff-btn" onClick={() => onNavigate('register')}>
            Create account
          </button>
          <button
            type="button"
            className="ff-btn ff-btnPrimary"
            disabled={loading || !email.trim() || !password}
            onClick={async () => {
              setLoading(true)
              setError('')
              try {
                const user = await login({ email, password })
                onAuthed(user)
                onNavigate('home')
              } catch (e) {
                setError('Invalid email or password')
              } finally {
                setLoading(false)
              }
            }}
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </div>
      </div>
    </section>
  )
}

