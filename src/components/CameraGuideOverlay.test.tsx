import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CameraGuideOverlay } from './CameraGuideOverlay'

describe('CameraGuideOverlay', () => {
  it('renders four corner markers', () => {
    render(<CameraGuideOverlay />)
    const corners = screen.getAllByTestId('guide-corner')
    expect(corners).toHaveLength(4)
  })

  it('has no solid border or filled background on the overlay', () => {
    const { container } = render(<CameraGuideOverlay />)
    const overlay = container.querySelector('[data-testid="camera-guide-overlay"]')
    expect(overlay).toBeInTheDocument()

    const className = overlay?.getAttribute('class') ?? ''
    // Must not have solid border styles that imply a capture frame
    expect(className).not.toMatch(/\bborder-[0-9]+\b/)
    expect(className).not.toMatch(/\bborder-solid\b/)
    expect(className).not.toMatch(/\bborder-dashed\b/)
    expect(className).not.toMatch(/\bborder-dotted\b/)
    expect(className).not.toMatch(/\bbg-\S+/)
  })
})
