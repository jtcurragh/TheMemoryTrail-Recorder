import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../db/database'
import { createUserProfile } from '../db/userProfile'
import { createTrail } from '../db/trails'
import { saveBrochureSetup } from '../db/brochureSetup'
import { BrochureSetupScreen } from './BrochureSetupScreen'

function TestWrapper({ trailId }: { trailId?: string }) {
  return (
    <MemoryRouter
      initialEntries={[
        { pathname: '/brochure-setup', state: trailId ? { trailId } : undefined },
      ]}
    >
      <BrochureSetupScreen />
    </MemoryRouter>
  )
}

describe('BrochureSetupScreen', () => {
  const mockBlob = new Blob(['test'], { type: 'image/jpeg' })

  beforeEach(async () => {
    vi.clearAllMocks()
    await db.delete()
    await db.open()
  })

  it('shows no trail message when trailId is missing', () => {
    render(<TestWrapper />)
    expect(
      screen.getByText(/no trail selected/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to export/i })).toBeInTheDocument()
  })

  it('shows trail not found when trailId does not exist', async () => {
    render(<TestWrapper trailId="nonexistent-trail" />)
    await waitFor(() => {
      expect(screen.getByText(/trail not found/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /back to export/i })).toBeInTheDocument()
  })

  it('renders form when trail exists', async () => {
    await createUserProfile({ email: 'sheila@example.com', name: 'Sheila', groupName: 'Ardmore', groupCode: 'ardmore' })
    await createTrail({
      groupCode: 'ardmore',
      trailType: 'graveyard',
      displayName: 'Ardmore Graveyard Trail',
    })

    render(<TestWrapper trailId="ardmore-graveyard" />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /brochure setup/i })).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/cover title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/community group name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/introduction/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save brochure setup/i })).toBeInTheDocument()
  })

  it('pre-populates group name from user profile', async () => {
    await createUserProfile({ email: 'sheila@example.com', name: 'Sheila', groupName: 'Ardmore Tidy Towns', groupCode: 'ardmore' })
    await createTrail({
      groupCode: 'ardmore',
      trailType: 'graveyard',
      displayName: 'Ardmore Graveyard Trail',
    })

    render(<TestWrapper trailId="ardmore-graveyard" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ardmore Tidy Towns')).toBeInTheDocument()
    })
  })

  it('pre-populates from existing brochure setup', async () => {
    await createUserProfile({ email: 'sheila@example.com', name: 'Sheila', groupName: 'Ardmore', groupCode: 'ardmore' })
    await createTrail({
      groupCode: 'ardmore',
      trailType: 'graveyard',
      displayName: 'Ardmore Graveyard Trail',
    })
    await saveBrochureSetup({
      id: 'ardmore-graveyard',
      trailId: 'ardmore-graveyard',
      coverTitle: 'Ardmore Heritage Trail',
      coverPhotoBlob: mockBlob,
      groupName: 'Ardmore Tidy Towns',
      creditsText: 'Local historians.',
      introText: 'Welcome to Ardmore.',
      funderLogos: [],
      mapBlob: null,
      updatedAt: '2025-02-20T12:00:00Z',
    })

    render(<TestWrapper trailId="ardmore-graveyard" />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ardmore Heritage Trail')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Ardmore Tidy Towns')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Welcome to Ardmore.')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Local historians.')).toBeInTheDocument()
    })
  })

  it('shows validation errors when required fields are empty', async () => {
    await createUserProfile({ email: 'sheila@example.com', name: 'Sheila', groupName: 'Ardmore', groupCode: 'ardmore' })
    await createTrail({
      groupCode: 'ardmore',
      trailType: 'graveyard',
      displayName: 'Ardmore Graveyard Trail',
    })

    render(<TestWrapper trailId="ardmore-graveyard" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save brochure setup/i })).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /save brochure setup/i }))

    await waitFor(() => {
      expect(screen.getByText(/cover title is required/i)).toBeInTheDocument()
    })
  })
})
