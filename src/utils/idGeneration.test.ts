import { describe, it, expect } from 'vitest'
import {
  generatePOIId,
  generateFilename,
} from './idGeneration'

describe('generatePOIId', () => {
  it('formats graveyard trail ID with 3-digit sequence', () => {
    expect(generatePOIId('clonfert', 'graveyard', 1)).toBe('clonfert-g-001')
    expect(generatePOIId('clonfert', 'graveyard', 12)).toBe('clonfert-g-012')
  })

  it('formats parish trail ID with 3-digit sequence', () => {
    expect(generatePOIId('clonfert', 'parish', 1)).toBe('clonfert-p-001')
    expect(generatePOIId('clashmore', 'parish', 3)).toBe('clashmore-p-003')
  })

  it('pads sequence with leading zeros', () => {
    expect(generatePOIId('clonfert', 'graveyard', 1)).toBe('clonfert-g-001')
    expect(generatePOIId('clonfert', 'graveyard', 99)).toBe('clonfert-g-099')
  })
})

describe('generateFilename', () => {
  it('returns id with .jpg extension', () => {
    expect(generateFilename('clonfert-p-001')).toBe('clonfert-p-001.jpg')
    expect(generateFilename('clashmore-g-003')).toBe('clashmore-g-003.jpg')
  })
})
