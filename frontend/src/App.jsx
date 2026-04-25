import './App.css'
import { useEffect, useMemo, useState } from 'react'

import Navbar from './components/Navbar'
import VideoPlayer from './components/VideoPlayer'
import PDFViewer from './components/PDFViewer'
import NotesPanel from './components/NotesPanel'
import Timer from './components/Timer'
import Dashboard from './components/Dashboard'
import Home from './pages/Home'
import { FocusTracker } from './components/FocusTracker'
import AuthModal from './components/AuthModal'
import Login from './pages/Login'
import Register from './pages/Register'
import { getMe, logout } from './utils/api'
import ToastHost from './components/ToastHost'
import YourNotes from './pages/YourNotes'
import Profile from './pages/Profile'
import DistractionModal from './components/DistractionModal'
import FaceDetection from './components/FaceDetection'

function App() {
  const [page, setPage] = useState('home')
  const [user, setUser] = useState(null)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)

  const applyAuthUser = async (nextUser) => {
    setUser(nextUser)
    await FocusTracker.refreshFromServer()
  }

  useEffect(() => {
    FocusTracker.init()
  }, [])

  useEffect(() => {
    if (page === 'pdf') {
      FocusTracker.setMode('pdf')
      return
    }
    FocusTracker.setMode('lecture')
  }, [page])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const me = await getMe()
        if (!alive) return
        await applyAuthUser(me)
      } catch {
        // not logged in
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const navigate = (next) => {
    if (
      (next === 'lecture' || next === 'pdf' || next === 'notes' || next === 'profile' || next === 'dashboard') &&
      !user
    ) {
      setAuthPromptOpen(true)
      return
    }
    setPage(next)
  }

  const title = useMemo(() => {
    if (page === 'lecture') return 'Lecture Mode'
    if (page === 'pdf') return 'PDF Mode'
    if (page === 'dashboard') return 'Dashboard'
    if (page === 'notes') return 'Your Notes'
    if (page === 'profile') return 'Profile'
    if (page === 'login') return 'Login'
    if (page === 'register') return 'Register'
    return 'Home'
  }, [page])

  return (
    <div className="ff-app">
      <ToastHost />
      <DistractionModal onGoSession={() => navigate('lecture')} />
      <FaceDetection active={page === 'lecture' || page === 'pdf'} />
      <Navbar
        current={page}
        onNavigate={navigate}
        user={user}
        onOpenProfile={() => navigate('profile')}
        onLogout={async () => {
          try {
            await logout()
          } finally {
            FocusTracker.stopSession()
            await applyAuthUser(null)
            setPage('home')
          }
        }}
      />

      <main className="ff-main">
        <div className="ff-mainHeader">
          <div className="ff-h2">{title}</div>
          <Timer
            isAuthed={!!user}
            onRequireLogin={() => {
              setAuthPromptOpen(true)
            }}
          />
        </div>

        <AuthModal
          open={authPromptOpen}
          onClose={() => setAuthPromptOpen(false)}
          message="Please login first. Dashboard insights and workspace data are user-specific."
          onLogin={() => {
            setAuthPromptOpen(false)
            setPage('login')
          }}
          onRegister={() => {
            setAuthPromptOpen(false)
            setPage('register')
          }}
        />

        {page === 'home' ? <Home onNavigate={navigate} isAuthed={!!user} /> : null}

        {page === 'login' ? (
          <Login
            onAuthed={async (u) => {
              await applyAuthUser(u)
            }}
            onNavigate={setPage}
          />
        ) : null}

        {page === 'register' ? (
          <Register
            onAuthed={async (u) => {
              await applyAuthUser(u)
            }}
            onNavigate={setPage}
          />
        ) : null}

        {page === 'dashboard' ? (
          <div className="ff-stack">
            <Dashboard />
          </div>
        ) : null}

        {page === 'notes' ? (
          <div className="ff-stack">
            <YourNotes />
          </div>
        ) : null}

        {page === 'profile' ? (
          <div className="ff-stack">
            <Profile user={user} />
          </div>
        ) : null}

        {page === 'lecture' ? (
          <div className="ff-split">
            <div className="ff-left">
              <VideoPlayer />
            </div>
            <div className="ff-right">
              <NotesPanel />
            </div>
          </div>
        ) : null}

        {page === 'pdf' ? (
          <div className="ff-split">
            <div className="ff-left">
              <PDFViewer />
            </div>
            <div className="ff-right">
              <NotesPanel />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default App
