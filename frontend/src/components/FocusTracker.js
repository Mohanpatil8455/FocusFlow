import { addStats, getSession, resetStats as apiResetStats } from '../utils/api'
import { showDistractionPrompt } from '../utils/distractionPrompt'

const PAUSE_WARNING_LIMIT_MS = 20 * 1000

function nowMs() {
  return Date.now()
}

function defaultState() {
  return {
    totalFocusSeconds: 0,
    totalDistractionSeconds: 0,
    lastTickMs: nowMs(),

    // Required state variables
    isTabVisible: !document.hidden,
    isWindowFocused: document.hasFocus(),
    isVideoPlaying: false,
    pauseStartTime: null,
    warningShown: false,
    pauseWarningShown: false,

    // Session controls
    sessionRunning: false,
    timerRunning: false,
    activeMode: 'lecture',
    sessionFocusSeconds: 0,
    sessionDistractionSeconds: 0,
    modeSessionStats: {
      lecture: { focusSeconds: 0, distractionSeconds: 0 },
      pdf: { focusSeconds: 0, distractionSeconds: 0 },
    },
    /** Webcam face present; false forces distraction time during an active session. */
    isFacePresent: true,
  }
}

let _state = null
let _initialized = false
let _intervalId = null
let _listeners = new Set()
let _onVisibilityChange = null
let _onWindowFocus = null
let _onWindowBlur = null
let _onWatchAttention = null

function getSafeMode(mode) {
  return mode === 'pdf' ? 'pdf' : 'lecture'
}

function emit() {
  for (const cb of _listeners) cb(getSnapshot())
}

// Priority logic:
// 0) Active session + no face on webcam => distraction (same counters as other distraction)
// 1) Playing video => focus
// 2) Visible tab + focused window => focus
// 3) Otherwise => distraction
function shouldCountFocus(state) {
  if (state.sessionRunning && state.isFacePresent === false) return false
  if (state.isVideoPlaying === true) return true
  if (state.isTabVisible === true && state.isWindowFocused === true) return true
  return false
}

// Instant distraction popup (not inside interval).
function showAwayPopupOnce() {
  if (!_state || !_state.sessionRunning || _state.warningShown) return
  _state.warningShown = true
  showDistractionPrompt({
    title: 'Distraction detected',
    message: 'You switched tabs or left the window!',
    actionLabel: 'Go to session',
  })
}

function isVideoControlInteraction() {
  const el = document.activeElement
  if (!el) return false

  const tag = el.tagName
  if (tag === 'VIDEO') return true
  if (tag !== 'IFRAME') return false

  const src = String(el.getAttribute('src') || '').toLowerCase()
  return src.includes('youtube') || src.includes('youtu.be') || src.includes('vimeo')
}

// Pause inactivity warning: show one popup if pause lasts > 60s.
function handleVideoPauseWarning(now) {
  if (!_state) return
  if (!_state.sessionRunning) return

  if (_state.isVideoPlaying) {
    _state.pauseStartTime = null
    _state.pauseWarningShown = false
    return
  }

  if (_state.pauseStartTime === null) {
    _state.pauseStartTime = now
    _state.pauseWarningShown = false
    return
  }

  const pausedDurationMs = now - _state.pauseStartTime
  if (pausedDurationMs > PAUSE_WARNING_LIMIT_MS && !_state.pauseWarningShown) {
    _state.pauseWarningShown = true
    showDistractionPrompt({
      title: 'Distraction detected',
      message: 'Video is paused for more than 20 seconds.',
      actionLabel: 'Go to session',
    })
  }
}

// One and only one timer for focus/distraction tracking.
function tick() {
  if (!_state) return

  const now = nowMs()
  handleVideoPauseWarning(now)

  if (!_state.sessionRunning) {
    _state.lastTickMs = now
    emit()
    return
  }

  const deltaSeconds = Math.floor(Math.max(0, now - _state.lastTickMs) / 1000)
  _state.lastTickMs = now

  if (deltaSeconds <= 0) {
    emit()
    return
  }

  let deltaFocusSeconds = 0
  let deltaDistractionSeconds = 0

  if (shouldCountFocus(_state)) {
    _state.totalFocusSeconds += deltaSeconds
    _state.sessionFocusSeconds += deltaSeconds
    _state.modeSessionStats[_state.activeMode].focusSeconds += deltaSeconds
    deltaFocusSeconds = deltaSeconds
  } else {
    _state.totalDistractionSeconds += deltaSeconds
    _state.sessionDistractionSeconds += deltaSeconds
    _state.modeSessionStats[_state.activeMode].distractionSeconds += deltaSeconds
    deltaDistractionSeconds = deltaSeconds
  }

  emit()

  ;(async () => {
    try {
      const session = await addStats({ deltaFocusSeconds, deltaDistractionSeconds })
      if (!_state) return
      _state.totalFocusSeconds = session?.totalFocusSeconds ?? _state.totalFocusSeconds
      _state.totalDistractionSeconds = session?.totalDistractionSeconds ?? _state.totalDistractionSeconds
      emit()
    } catch {
      // Keep local state even if network request fails.
    }
  })()
}

function init() {
  if (_initialized) return
  _initialized = true
  _state = defaultState()

  ;(async () => {
    try {
      const session = await getSession()
      if (!_state) return
      _state.totalFocusSeconds = session?.totalFocusSeconds || 0
      _state.totalDistractionSeconds = session?.totalDistractionSeconds || 0
      emit()
    } catch {
      // ignore
    }
  })()

  // Tab visibility listener
  _onVisibilityChange = () => {
    if (!_state) return
    _state.isTabVisible = !document.hidden
    if (_state.isTabVisible) {
      _state.warningShown = false
    } else {
      showAwayPopupOnce()
    }
    emit()
  }

  // Window focus listeners
  _onWindowFocus = () => {
    if (!_state) return
    _state.isWindowFocused = true
    _state.warningShown = false
    emit()
  }

  _onWindowBlur = () => {
    if (!_state) return
    _state.isWindowFocused = false
    // Ignore blur events caused by interacting with embedded video controls.
    if (!isVideoControlInteraction()) {
      showAwayPopupOnce()
    }
    emit()
  }

  document.addEventListener('visibilitychange', _onVisibilityChange)
  window.addEventListener('focus', _onWindowFocus)
  window.addEventListener('blur', _onWindowBlur)

  _onWatchAttention = (e) => {
    if (!_state) return
    const hasFace = e?.detail?.hasFace
    if (typeof hasFace !== 'boolean') return
    _state.isFacePresent = hasFace
    emit()
  }
  window.addEventListener('ff:watch-attention', _onWatchAttention)

  if (!_intervalId) {
    _intervalId = window.setInterval(tick, 1000)
  }

  emit()
}

function getSnapshot() {
  const s = _state || defaultState()
  return {
    totalFocusSeconds: s.totalFocusSeconds,
    totalDistractionSeconds: s.totalDistractionSeconds,
    isTabVisible: s.isTabVisible,
    isWindowFocused: s.isWindowFocused,
    isVideoPlaying: s.isVideoPlaying,
    pauseStartTime: s.pauseStartTime,
    warningShown: s.warningShown,
    pauseWarningShown: s.pauseWarningShown,
    sessionRunning: s.sessionRunning,
    timerRunning: s.timerRunning,
    activeMode: s.activeMode,
    sessionFocusSeconds: s.sessionFocusSeconds,
    sessionDistractionSeconds: s.sessionDistractionSeconds,
    modeSessionStats: {
      lecture: {
        focusSeconds: s.modeSessionStats?.lecture?.focusSeconds || 0,
        distractionSeconds: s.modeSessionStats?.lecture?.distractionSeconds || 0,
      },
      pdf: {
        focusSeconds: s.modeSessionStats?.pdf?.focusSeconds || 0,
        distractionSeconds: s.modeSessionStats?.pdf?.distractionSeconds || 0,
      },
    },
    isFacePresent: s.isFacePresent !== false,
  }
}

function subscribe(cb) {
  init()
  _listeners.add(cb)
  cb(getSnapshot())
  return () => _listeners.delete(cb)
}

async function refreshFromServer() {
  init()
  try {
    const session = await getSession()
    if (!_state) return
    _state.totalFocusSeconds = session?.totalFocusSeconds || 0
    _state.totalDistractionSeconds = session?.totalDistractionSeconds || 0
  } catch {
    if (!_state) return
    _state.totalFocusSeconds = 0
    _state.totalDistractionSeconds = 0
  } finally {
    if (!_state) return
    _state.sessionRunning = false
    _state.timerRunning = false
    _state.lastTickMs = nowMs()
    emit()
  }
}

function resetTotals() {
  init()
  _state.totalFocusSeconds = 0
  _state.totalDistractionSeconds = 0
  _state.lastTickMs = nowMs()
  emit()

  ;(async () => {
    try {
      await apiResetStats()
    } catch {
      // ignore
    }
  })()
}

function startSession() {
  init()
  _state.sessionRunning = true
  _state.lastTickMs = nowMs()
  _state.warningShown = false
  _state.pauseWarningShown = false
  _state.pauseStartTime = _state.isVideoPlaying ? null : nowMs()
  _state.sessionFocusSeconds = 0
  _state.sessionDistractionSeconds = 0
  _state.modeSessionStats = {
    lecture: { focusSeconds: 0, distractionSeconds: 0 },
    pdf: { focusSeconds: 0, distractionSeconds: 0 },
  }
  _state.isFacePresent = true
  emit()
}

function stopSession() {
  init()
  _state.sessionRunning = false
  _state.lastTickMs = nowMs()
  _state.warningShown = false
  _state.pauseWarningShown = false
  emit()
}

// Called by video events (play/pause/end) from VideoPlayer.
function setVideoPlaying(isPlaying) {
  init()
  const nextIsPlaying = !!isPlaying
  const wasPlaying = _state.isVideoPlaying
  _state.isVideoPlaying = nextIsPlaying

  if (nextIsPlaying) {
    _state.pauseStartTime = null
    _state.pauseWarningShown = false
  } else if (wasPlaying) {
    // Set pause start only on transition from playing -> paused.
    _state.pauseStartTime = nowMs()
    _state.pauseWarningShown = false
  }
  emit()
}

function setPausedTooLong() {
  // kept for backward compatibility
}

function setTimerRunning(isRunning) {
  init()
  _state.timerRunning = !!isRunning
  emit()
}

function setMode(mode) {
  init()
  _state.activeMode = getSafeMode(mode)
  emit()
}

export const FocusTracker = {
  init,
  subscribe,
  refreshFromServer,
  getSnapshot,
  resetTotals,
  startSession,
  stopSession,
  setVideoPlaying,
  setPausedTooLong,
  setTimerRunning,
  setMode,
}

