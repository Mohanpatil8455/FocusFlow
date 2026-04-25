export function showDistractionPrompt({
  title = 'Distraction detected',
  message = 'You were away from your focus session.',
  actionLabel = 'Go to session',
} = {}) {
  window.dispatchEvent(
    new CustomEvent('ff:distraction', {
      detail: { title, message, actionLabel },
    }),
  )
}

export function showSessionSummaryPrompt({
  title = 'Session completed',
  message = '',
  actionLabel = 'Start another session',
} = {}) {
  window.dispatchEvent(
    new CustomEvent('ff:session-summary', {
      detail: { title, message, actionLabel },
    }),
  )
}

