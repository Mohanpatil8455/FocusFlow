export function toast(message, { type = 'info', durationMs = 3500 } = {}) {
  window.dispatchEvent(
    new CustomEvent('ff:toast', {
      detail: { message: String(message || ''), type, durationMs },
    }),
  )
}

