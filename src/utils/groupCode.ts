/**
 * Derives a short group code from a group name.
 * Examples: "Clonfert Trails" -> "clonfert", "Clashmore Trails" -> "clashmore"
 * Rule: first word only, lowercase, strip punctuation, truncate to 12 chars.
 */
export function deriveGroupCode(groupName: string): string {
  if (!groupName.trim()) return ''

  const firstWord = groupName.trim().split(/\s+/)[0] ?? ''
  const cleaned = firstWord.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  return cleaned.slice(0, 12)
}
