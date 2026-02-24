import { describe, it, expect } from 'vitest'
import { deriveGroupCode, slugifyForFilename } from './groupCode'

describe('deriveGroupCode', () => {
  it('lowercases the group name', () => {
    expect(deriveGroupCode('Clonfert Trails')).toBe('clonfert')
  })

  it('strips punctuation', () => {
    expect(deriveGroupCode("Clonfert's Trails!")).toBe('clonferts')
  })

  it('replaces spaces with empty string (no hyphens)', () => {
    expect(deriveGroupCode('Clashmore Trails')).toBe('clashmore')
  })

  it('truncates to 12 characters', () => {
    expect(deriveGroupCode('Verylonggroupnamehere')).toBe('verylonggrou')
  })

  it('handles single word', () => {
    expect(deriveGroupCode('Clonfert')).toBe('clonfert')
  })

  it('handles empty string', () => {
    expect(deriveGroupCode('')).toBe('')
  })
})

describe('slugifyForFilename', () => {
  it('slugifies cover title for parish brochure', () => {
    expect(slugifyForFilename('Clonfert Parish Heritage Trail')).toBe(
      'clonfert-parish-heritage-trail'
    )
  })

  it('handles empty string', () => {
    expect(slugifyForFilename('')).toBe('export')
  })

  it('handles whitespace only', () => {
    expect(slugifyForFilename('   ')).toBe('export')
  })
})
