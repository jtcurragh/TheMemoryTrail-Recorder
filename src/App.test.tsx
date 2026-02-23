import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.setItem('welcomeComplete', 'true')
    localStorage.setItem('userEmail', 'test@example.com')
  })

  it('renders The Memory Trail heading when welcome complete', () => {
    render(<App />)
    expect(screen.getByText(/the memory trail/i)).toBeInTheDocument()
  })
})
