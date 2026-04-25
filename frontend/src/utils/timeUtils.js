export function clampNumber(n, min, max) {
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0))
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60

  if (hrs > 0) return `${hrs}h ${String(mins).padStart(2, '0')}m`
  if (mins > 0) return `${mins}m ${String(secs).padStart(2, '0')}s`
  return `${secs}s`
}

export function formatPercent(numerator, denominator) {
  if (!denominator) return '0%'
  const pct = (numerator / denominator) * 100
  const rounded = Math.round(pct)
  return `${clampNumber(rounded, 0, 100)}%`
}

