import { useEffect, useRef, useState } from 'react'

/**
 * Optional face detection overlay (face-api.js via CDN).
 * Completely separate from FocusTracker and distraction modals.
 *
 * Props:
 * - active: when true, camera + detection run; when false, everything stops and cleans up.
 */

const FACE_API_CDN = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
// npm package path has no /weights on jsDelivr (404). Use official repo files on jsDelivr GitHub CDN.
const MODEL_BASE_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights'
const DETECT_INTERVAL_MS = 2000

/** Load face-api.js UMD bundle once; exposes global `faceapi`. */
function loadFaceApiScript() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.faceapi) {
      resolve(window.faceapi)
      return
    }

    const existing = document.querySelector('script[data-ff-faceapi="1"]')
    if (existing) {
      const onLoad = () => {
        const api = window.faceapi
        if (!api || !api.nets) reject(new Error('face-api global missing'))
        else resolve(api)
      }
      if (window.faceapi && window.faceapi.nets) {
        resolve(window.faceapi)
        return
      }
      existing.addEventListener('load', onLoad, { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('face-api script failed')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = FACE_API_CDN
    script.async = true
    script.dataset.ffFaceapi = '1'
    script.onload = () => {
      const api = window.faceapi
      if (!api || !api.nets) reject(new Error('face-api global missing'))
      else resolve(api)
    }
    script.onerror = () => reject(new Error('face-api script failed'))
    document.head.appendChild(script)
  })
}

export default function FaceDetection({ active = false }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const modelsReadyRef = useRef(false)
  const faceWarningShownRef = useRef(false)
  /** Last webcam face presence; used to emit `ff:watch-attention` only on change. */
  const lastFacePresentRef = useRef(undefined)

  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [cameraOk, setCameraOk] = useState(false)
  const [showFaceAlert, setShowFaceAlert] = useState(false)

  useEffect(() => {
    if (!active) {
      faceWarningShownRef.current = false
      lastFacePresentRef.current = undefined
      setShowFaceAlert(false)
      return
    }

    let cancelled = false

    const setup = async () => {
      try {
        const faceapi = await loadFaceApiScript()
        if (cancelled || !active) return

        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_BASE_URL)
        if (cancelled || !active) return

        // CPU backend is more reliable than WebGL on some GPUs/drivers.
        try {
          if (faceapi.tf && typeof faceapi.tf.setBackend === 'function') {
            await faceapi.tf.setBackend('cpu')
            await faceapi.tf.ready()
          }
        } catch {
          // ignore; default backend may still work
        }

        modelsReadyRef.current = true
        setModelsLoaded(true)

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (cancelled || !active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        const video = videoRef.current
        if (!video) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        video.srcObject = stream
        await new Promise((resolve) => {
          const done = () => {
            video.removeEventListener('loadeddata', done)
            resolve()
          }
          if (video.readyState >= 2) resolve()
          else video.addEventListener('loadeddata', done, { once: true })
        })
        await video.play().catch(() => {})
        setCameraOk(true)

        const runDetect = async () => {
          if (cancelled || !modelsReadyRef.current) return
          const v = videoRef.current
          if (!v || v.readyState < 2) return

          try {
            const faceapiGlobal = window.faceapi
            const detections = await faceapiGlobal.detectAllFaces(
              v,
              new faceapiGlobal.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.5,
              }),
            )

            const hadFace = detections.length > 0

            if (hadFace) {
              // Face visible again → allow future warnings
              faceWarningShownRef.current = false
              setShowFaceAlert(false)
            } else if (!faceWarningShownRef.current) {
              faceWarningShownRef.current = true
              setShowFaceAlert(true)
            }

            // Tell lecture YouTube player to pause/resume (VideoPlayer listens; no FocusTracker coupling).
            const prev = lastFacePresentRef.current
            if (prev === undefined || prev !== hadFace) {
              lastFacePresentRef.current = hadFace
              window.dispatchEvent(
                new CustomEvent('ff:watch-attention', { detail: { hasFace: hadFace } }),
              )
            }
          } catch {
            // Fail silently (e.g. transient canvas/video errors)
          }
        }

        intervalRef.current = window.setInterval(runDetect, DETECT_INTERVAL_MS)
      } catch {
        // Camera denied or model/script failure — no UI noise
        modelsReadyRef.current = false
        setModelsLoaded(false)
        setCameraOk(false)
      }
    }

    setup()

    return () => {
      cancelled = true
      window.dispatchEvent(new CustomEvent('ff:watch-attention', { detail: { hasFace: true } }))
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      const video = videoRef.current
      if (video) {
        video.srcObject = null
      }
      modelsReadyRef.current = false
      faceWarningShownRef.current = false
      lastFacePresentRef.current = undefined
      setModelsLoaded(false)
      setCameraOk(false)
      setShowFaceAlert(false)
    }
  }, [active])

  if (!active) return null

  return (
    <>
      {/* Small webcam preview — fixed corner, does not block the main layout */}
      <div className="ff-faceDetection" aria-hidden="true">
        <video ref={videoRef} className="ff-faceDetection-video" playsInline muted />
        {!cameraOk && modelsLoaded ? (
          <span className="ff-faceDetection-hint">Camera…</span>
        ) : null}
      </div>

      {/* Own alert — not tied to ff:distraction / FocusTracker */}
      {showFaceAlert ? (
        <div className="ff-faceDetection-alertBackdrop" role="alertdialog" aria-live="polite">
          <div className="ff-faceDetection-alert">
            <div className="ff-faceDetection-alertTitle">Attention</div>
            <p className="ff-faceDetection-alertMsg">Face not detected! Please stay attentive.</p>
            <button
              type="button"
              className="ff-btn ff-btnPrimary"
              onClick={() => setShowFaceAlert(false)}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
