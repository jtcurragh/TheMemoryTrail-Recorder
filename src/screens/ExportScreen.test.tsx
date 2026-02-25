import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../db/database'
import { createUserProfile } from '../db/userProfile'
import { createTrail } from '../db/trails'
import { ExportScreen } from './ExportScreen'

const BROCHURE_TRAIL_KEY = 'hgt_brochure_trail_id'

function TestWrapper() {
  return (
    <MemoryRouter>
      <ExportScreen />
    </MemoryRouter>
  )
}

describe('ExportScreen', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()
    await db.delete()
    await db.open()
  })

  it('restores selected brochure trail from localStorage when it matches a valid trail', async () => {
    await createUserProfile({
      email: 'test@example.com',
      name: 'Test',
      groupName: 'Test Parish',
      groupCode: 'test',
    })
    await createTrail({
      groupCode: 'test',
      trailType: 'graveyard',
      displayName: 'Test Graveyard Trail',
    })
    const parish = await createTrail({
      groupCode: 'test',
      trailType: 'parish',
      displayName: 'Test Parish Trail',
    })

    localStorage.setItem(BROCHURE_TRAIL_KEY, parish.id)

    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /export/i })).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText(/Selected trail: Parish Trail/i)).toBeInTheDocument()
    })

    const parishButton = screen.getByRole('button', { name: /parish trail/i })
    expect(parishButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('falls back to graveyard when stored trail id is invalid', async () => {
    await createUserProfile({
      email: 'test@example.com',
      name: 'Test',
      groupName: 'Test Parish',
      groupCode: 'test',
    })
    await createTrail({
      groupCode: 'test',
      trailType: 'graveyard',
      displayName: 'Test Graveyard Trail',
    })
    await createTrail({
      groupCode: 'test',
      trailType: 'parish',
      displayName: 'Test Parish Trail',
    })

    localStorage.setItem(BROCHURE_TRAIL_KEY, 'nonexistent-trail-id')

    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /export/i })).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText(/Selected trail: Graveyard Trail/i)).toBeInTheDocument()
    })

    const graveyardButton = screen.getByRole('button', { name: /graveyard trail/i })
    expect(graveyardButton).toHaveAttribute('aria-pressed', 'true')
  })
})
