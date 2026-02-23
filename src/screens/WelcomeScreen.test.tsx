import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../db/database'
import { WelcomeScreen } from './WelcomeScreen'
import * as welcomeService from '../services/welcomeService'

vi.mock('../services/welcomeService', () => ({
  processWelcome: vi.fn(),
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

  it('disables Start Recording button when fields are empty', () => {
    render(
      <MemoryRouter>
        <WelcomeScreen onComplete={() => {}} />
      </MemoryRouter>
    )
    const button = screen.getByRole('button', { name: /start recording/i })
    expect(button).toBeDisabled()
  })

  it('enables Start Recording when both fields are filled', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <WelcomeScreen onComplete={() => {}} />
      </MemoryRouter>
    )
    await user.type(screen.getByPlaceholderText(/your first and last name/i), 'Sheila')
    await user.type(screen.getByPlaceholderText(/your email address/i), 'sheila@example.com')
    const button = screen.getByRole('button', { name: /start recording/i })
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

  it('calls onComplete on submit', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()

    render(
      <MemoryRouter>
        <WelcomeScreen onComplete={onComplete} />
      </MemoryRouter>
    )

    await user.type(screen.getByPlaceholderText(/your first and last name/i), 'Sheila')
    await user.type(screen.getByPlaceholderText(/your email address/i), 'sheila@example.com')
    await user.click(screen.getByRole('button', { name: /start recording/i }))

    await waitFor(() => {
      expect(welcomeService.processWelcome).toHaveBeenCalledWith('Sheila', 'sheila@example.com')
      expect(onComplete).toHaveBeenCalled()
    })
  })
})
