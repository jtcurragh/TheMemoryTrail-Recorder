import { describe, it, expect } from 'vitest'
import {
  generatePOIId,
  generateFilename,
} from './idGeneration'

describe('generatePOIId', () => {
  it('formats graveyard trail ID with location-g-DDMMYY-HHmmss-SSS', () => {
    const id = generatePOIId('clonfert', 'graveyard')
    expect(id).toMatch(/^clonfert-g-\d{6}-\d{6}-\d{3}$/)
  })

  it('formats parish trail ID with location-p-DDMMYY-HHmmss-SSS', () => {
    const id = generatePOIId('clashmore', 'parish')
    expect(id).toMatch(/^clashmore-p-\d{6}-\d{6}-\d{3}$/)
  })

  it('uses g for graveyard and p for parish', () => {
    expect(generatePOIId('ardmore', 'graveyard')).toMatch(/-g-\d{6}-\d{6}-\d{3}$/)
    expect(generatePOIId('ardmore', 'parish')).toMatch(/-p-\d{6}-\d{6}-\d{3}$/)
  })
})

describe('generateFilename', () => {
  it('returns id with .jpg extension', () => {
    expect(generateFilename('clonfert-p-260226-142347-123')).toBe('clonfert-p-260226-142347-123.jpg')
    expect(generateFilename('clashmore-g-260226-142347-456')).toBe('clashmore-g-260226-142347-456.jpg')
  })
})
