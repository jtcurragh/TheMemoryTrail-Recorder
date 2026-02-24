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

/**
 * Slugifies a string for use in filenames.
 * Examples: "Clonfert Parish Heritage Trail" -> "clonfert-parish-heritage-trail"
 */
export function slugifyForFilename(text: string): string {
  if (!text.trim()) return 'export'
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'export'
}

/**
 * Derives a group code from email for email-based identity.
 * Examples: "sheila@community.ie" -> "sheila", "john.doe@example.com" -> "john-doe"
 * Rule: local part before @, lowercase, replace non-alphanumeric with hyphen, truncate to 12 chars.
 */
export function deriveGroupCodeFromEmail(email: string): string {
  if (!email.trim()) return ''
  const local = email.trim().split('@')[0] ?? ''
  const cleaned = local
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return (cleaned || 'user').slice(0, 12)
}
