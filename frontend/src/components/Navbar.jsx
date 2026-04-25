import { useEffect, useRef, useState } from 'react'

export default function Navbar({ current, onNavigate, user, onLogout, onOpenProfile }) {
  const items = [
    { id: 'home', label: 'Home' },
    { id: 'lecture', label: 'Lecture Mode' },
    { id: 'pdf', label: 'PDF Mode' },
    { id: 'dashboard', label: 'Dashboard' },
  ]
  if (user) items.push({ id: 'notes', label: 'Your Notes' })

  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <header className="ff-navbar">
      <div className="ff-brand">
        <div className="ff-logo" aria-hidden="true">
          FF
        </div>
        <div className="ff-brandText">
          <div className="ff-title">FocusFlow</div>
          <div className="ff-subtitle">Focus workspace + awareness</div>
        </div>
      </div>

      <nav className="ff-nav">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`ff-navBtn ${current === item.id ? 'is-active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}

        {user ? (
          <div className="ff-profileMenu" ref={menuRef}>
            <button type="button" className="ff-userBtn" onClick={() => setOpen((v) => !v)}>
              <span className="ff-userAvatar">{(user.name || user.email || 'U').charAt(0).toUpperCase()}</span>
            </button>

            {open ? (
              <div className="ff-dropdown">
                <button
                  type="button"
                  className="ff-dropdownItem"
                  onClick={() => {
                    setOpen(false)
                    onOpenProfile?.()
                  }}
                >
                  Profile
                </button>
                <button
                  type="button"
                  className="ff-dropdownItem"
                  onClick={() => {
                    setOpen(false)
                    onLogout?.()
                  }}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <button
              type="button"
              className={`ff-navBtn ${current === 'login' ? 'is-active' : ''}`}
              onClick={() => onNavigate('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`ff-navBtn ${current === 'register' ? 'is-active' : ''}`}
              onClick={() => onNavigate('register')}
            >
              Register
            </button>
          </>
        )}
      </nav>
    </header>
  )
}

