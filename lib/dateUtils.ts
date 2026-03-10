/** Format "2026-03-11" -> "Tue, Mar 11" */
export function fmtDateWithDay(dateStr: string): string {
  if (!dateStr) return ''
  // Use noon to avoid any UTC-midnight timezone drift
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.toLocaleDateString('en-US', { weekday: 'short' })
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  return `${day}, ${month} ${d.getDate()}`
}
