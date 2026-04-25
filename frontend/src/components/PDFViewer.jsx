import { useEffect, useMemo, useState } from 'react'
import { FocusTracker } from './FocusTracker'
import SessionModeStats from './SessionModeStats'

const PDF_KEY = 'focusflow_lastPdfName_v1'

function saveLastName(name) {
  try {
    localStorage.setItem(PDF_KEY, name || '')
  } catch {
    // ignore
  }
}

function loadLastName() {
  try {
    return localStorage.getItem(PDF_KEY) || ''
  } catch {
    return ''
  }
}

export default function PDFViewer() {
  const [fileUrl, setFileUrl] = useState('')
  const [fileName, setFileName] = useState(() => loadLastName())

  useEffect(() => {
    FocusTracker.init()
  }, [])

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl)
    }
  }, [fileUrl])

  const label = useMemo(() => (fileName ? `Open: ${fileName}` : 'Choose a PDF to start'), [fileName])

  return (
    <section className="ff-panel">
      <div className="ff-panelHeader">
        <div>
          <div className="ff-panelTitle">PDF Study</div>
          <div className="ff-panelHint">Stays in-app so you don’t bounce across tabs.</div>
        </div>
      </div>

      <SessionModeStats mode="pdf" />

      <div className="ff-row">
        <label className="ff-fileBtn">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              if (fileUrl) URL.revokeObjectURL(fileUrl)
              const url = URL.createObjectURL(f)
              setFileUrl(url)
              setFileName(f.name)
              saveLastName(f.name)
            }}
          />
          Upload PDF
        </label>
        <div className="ff-muted">{label}</div>
      </div>

      <div className="ff-pdfWrap">
        {fileUrl ? (
          <iframe className="ff-iframe" src={fileUrl} title="PDF viewer" />
        ) : (
          <div className="ff-empty">No PDF loaded.</div>
        )}
      </div>
    </section>
  )
}

