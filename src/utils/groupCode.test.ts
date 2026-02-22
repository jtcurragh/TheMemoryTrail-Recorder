import { describe, it, expect } from 'vitest'
import { deriveGroupCode } from './groupCode'

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
