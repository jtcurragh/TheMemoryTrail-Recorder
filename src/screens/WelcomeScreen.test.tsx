import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../db/database'
import { WelcomeScreen } from './WelcomeScreen'
import * as welcomeService from '../services/welcomeService'

vi.mock('../services/welcomeService', () => ({
  processWelcome: vi.fn(),
  checkEmailExists: vi.fn(),
}))

describe('WelcomeScreen', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()
    await db.delete()
    await db.open()
    vi.mocked(welcomeService.processWelcome).mockResolvedValue({
      isReturningUser: false,
      profile: {
        id: 'default',
        email: 'sheila@example.com',
        name: 'Sheila',
        groupName: "Sheila's recordings",
        groupCode: 'sheila',
        createdAt: new Date().toISOString(),
      },
    })
    vi.mocked(welcomeService.checkEmailExists).mockResolvedValue(false)
  })

  it('renders Historic Graves Trail heading', () => {
    render(
      <MemoryRouter>
        <WelcomeScreen onComplete={() => {}} />
      </MemoryRouter>
    )
    expect(
      screen.getByRole('heading', { name: /historic graves trail/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/recording our shared heritage/i)).toBeInTheDocument()
  })

  it('shows name and email inputs', () => {
    render(
      <MemoryRouter>
        <WelcomeScreen onComplete={() => {}} />
      </MemoryRouter>
    )
    expect(screen.getByPlaceholderText(/your first and last name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/your email address/i)).toBeInTheDocument()
  })

  it('disables Continue button when name or email is empty', () => {
    render(
      <MemoryRouter>
        <WelcomeScreen onComplete={() => {}} />
      </MemoryRouter>
    )
    const button = screen.getByRole('button', { name: /continue/i })
    expect(button).toBeDisabled()
  })

  it('enables Continue when name and email are filled', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <WelcomeScreen onComplete={() => {}} />
      </MemoryRouter>
    )
    await user.type(screen.getByPlaceholderText(/your first and last name/i), 'Sheila')
    await user.type(screen.getByPlaceholderText(/your email address/i), 'sheila@example.com')
    const button = screen.getByRole('button', { name: /continue/i })
    expect(button).toBeEnabled()
  })

  it('shows privacy message', () => {
    render(
      <MemoryRouter>
        <WelcomeScreen onComplete={() => {}} />
      </MemoryRouter>
    )
    expect(
      screen.getByText(/your work saves automatically/i)
    ).toBeInTheDocument()
  })

  it('for new email: shows parish field after Continue, then creates user with parish on Create My Trails', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    vi.mocked(welcomeService.checkEmailExists).mockResolvedValue(false)

    render(
      <MemoryRouter>
        <WelcomeScreen onComplete={onComplete} />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText(/your first and last name/i), 'Sheila')
    await user.type(screen.getByPlaceholderText(/your email address/i), 'sheila@example.com')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/parish or place name/i)).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText(/parish or place name/i), 'Ardmore')

    await waitFor(() => {
      expect(screen.getByText(/Ardmore Graveyard Trail and Ardmore Parish Trail/i)).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /create my trails/i }))

    await waitFor(() => {
      expect(welcomeService.processWelcome).toHaveBeenCalledWith(
        'Sheila',
        'sheila@example.com',
        expect.objectContaining({ parishName: 'Ardmore' })
      )
      expect(onComplete).toHaveBeenCalled()
    })
  })

  it('for returning email: does not show parish field, restores directly on Continue', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    vi.mocked(welcomeService.checkEmailExists).mockResolvedValue(true)
    vi.mocked(welcomeService.processWelcome).mockResolvedValue({
      isReturningUser: true,
      profile: {
        id: 'default',
        email: 'sheila@example.com',
        name: 'Sheila',
        groupName: 'Ardmore Tidy Towns',
        groupCode: 'ardmore',
        createdAt: new Date().toISOString(),
      },
      restoreMeta: { trailCount: 2, poiCount: 5, failedPhotos: [] },
    })

    render(
      <MemoryRouter>
        <WelcomeScreen onComplete={onComplete} />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText(/your first and last name/i), 'Sheila')
    await user.type(screen.getByPlaceholderText(/your email address/i), 'sheila@example.com')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(welcomeService.processWelcome).toHaveBeenCalledWith(
        'Sheila',
        'sheila@example.com',
        expect.objectContaining({ onProgress: expect.any(Function) })
      )
      expect(welcomeService.processWelcome).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ parishName: expect.anything() })
      )
    })
    expect(screen.queryByPlaceholderText(/parish or place name/i)).not.toBeInTheDocument()
  })

  it('parish field shows live preview of trail names', async () => {
    const user = userEvent.setup()
    vi.mocked(welcomeService.checkEmailExists).mockResolvedValue(false)

    render(
      <MemoryRouter>
        <WelcomeScreen onComplete={() => {}} />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText(/your first and last name/i), 'Sheila')
    await user.type(screen.getByPlaceholderText(/your email address/i), 'sheila@example.com')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/parish or place name/i)).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText(/parish or place name/i), 'Clonfert')

    await waitFor(() => {
      expect(screen.getByText(/Clonfert Graveyard Trail and Clonfert Parish Trail/i)).toBeInTheDocument()
    })
  })
})
