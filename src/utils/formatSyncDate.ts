/**
 * Format sync timestamp for display: "Today at 14:32", "Yesterday at 09:15", or full date.
 */
export function formatSyncDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const time = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (dateOnly.getTime() === today.getTime()) {
    return `Today at ${time}`
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return `Yesterday at ${time}`
  }
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
