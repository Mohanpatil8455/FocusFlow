import { useEffect, useMemo, useRef, useState } from 'react'
import { FocusTracker } from './FocusTracker'
import SessionModeStats from './SessionModeStats'

function extractYouTubeId(url) {
  if (!url) return ''
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '')
    if (u.searchParams.get('v')) return u.searchParams.get('v')
    const parts = u.pathname.split('/')
    const embedIdx = parts.indexOf('embed')
    if (embedIdx !== -1 && parts[embedIdx + 1]) return parts[embedIdx + 1]
    return ''
  } catch {
    return url.trim()
  }
}

function loadYouTubeIframeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT)
      return
    }

    const existing = document.querySelector('script[data-ff-youtube="1"]')
    if (existing) {
      const check = window.setInterval(() => {
        if (window.YT && window.YT.Player) {
          window.clearInterval(check)
          resolve(window.YT)
        }
      }, 50)
      return
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.async = true
    tag.dataset.ffYoutube = '1'
    document.head.appendChild(tag)

    window.onYouTubeIframeAPIReady = () => resolve(window.YT)
  })
}

export default function VideoPlayer() {
  const [input, setInput] = useState('')
  const [videoId, setVideoId] = useState('')
  const [status, setStatus] = useState('Paste a YouTube link to begin.')
  const [warning, setWarning] = useState('')

  const mountRef = useRef(null)
  const playerRef = useRef(null)
  /** True when we paused YouTube because the webcam lost a face (so we only resume in that case). */
  const pausedForFaceMissingRef = useRef(false)

  const resolvedId = useMemo(() => extractYouTubeId(videoId || input), [videoId, input])

  useEffect(() => {
    FocusTracker.init()
  }, [])

  useEffect(() => {
    const YT_PLAYING = 1

    const onWatchAttention = (e) => {
      const hasFace = e.detail?.hasFace
      const p = playerRef.current
      if (!p || typeof p.getPlayerState !== 'function' || typeof p.pauseVideo !== 'function') return

      if (hasFace === false) {
        try {
          if (p.getPlayerState() === YT_PLAYING) {
            p.pauseVideo()
            pausedForFaceMissingRef.current = true
          }
        } catch {
          // ignore
        }
      } else if (hasFace === true) {
        try {
          if (pausedForFaceMissingRef.current && typeof p.playVideo === 'function') {
            p.playVideo()
            pausedForFaceMissingRef.current = false
          }
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener('ff:watch-attention', onWatchAttention)
    return () => window.removeEventListener('ff:watch-attention', onWatchAttention)
  }, [])

  useEffect(() => {
    if (!resolvedId) return
    let cancelled = false

    ;(async () => {
      const YT = await loadYouTubeIframeAPI()
      if (cancelled) return
      if (!mountRef.current) return

      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy()
        playerRef.current = null
      }

      setWarning('')
      setStatus('Loading video…')

      playerRef.current = new YT.Player(mountRef.current, {
        videoId: resolvedId,
        height: '100%',
        width: '100%',
        playerVars: { autoplay: 0, modestbranding: 1, rel: 0 },
        events: {
          onReady: () => {
            setStatus('Ready')
          },
          onStateChange: (e) => {
            const state = e.data
            const PLAYING = 1
            const PAUSED = 2
            const ENDED = 0

            if (state === PLAYING) {
              setStatus('Playing')
              setWarning('')
              FocusTracker.setVideoPlaying(true)
              return
            }

            FocusTracker.setVideoPlaying(false)

            if (state === PAUSED) {
              setStatus('Paused')
              return
            }

            if (state === ENDED) {
              setStatus('Ended')
              setWarning('')
            }
          },
        },
      })
    })()

    return () => {
      cancelled = true
      pausedForFaceMissingRef.current = false
    }
  }, [resolvedId])

  useEffect(() => {
    return () => {
      if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy()
    }
  }, [])

  return (
    <section className="ff-panel">
      <div className="ff-panelHeader">
        <div>
          <div className="ff-panelTitle">YouTube Lecture</div>
          <div className="ff-panelHint">
            Playing counts as focus. Paused too long triggers a warning.
          </div>
        </div>
      </div>

      <SessionModeStats mode="lecture" />

      <div className="ff-row">
        <input
          className="ff-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste YouTube link or video ID…"
        />
        <button
          type="button"
          className="ff-btn ff-btnPrimary"
          onClick={() => setVideoId(input)}
          disabled={!input.trim()}
        >
          Load
        </button>
      </div>

      <div className="ff-videoWrap">
        {resolvedId ? (
          <div ref={mountRef} className="ff-videoMount" />
        ) : (
          <div className="ff-empty">No video loaded.</div>
        )}
      </div>

      <div className="ff-statusRow">
        <div className="ff-badge">Status: {status}</div>
        {warning ? <div className="ff-warning">{warning}</div> : null}
      </div>
    </section>
  )
}