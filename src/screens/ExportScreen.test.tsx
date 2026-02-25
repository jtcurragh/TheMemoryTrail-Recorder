import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../db/database'
import { createUserProfile } from '../db/userProfile'
import { createTrail } from '../db/trails'
import { ExportScreen } from './ExportScreen'
import { setStoredUserEmail } from '../utils/storage'

const BROCHURE_TRAIL_KEY = 'hgt_brochure_trail_id'

const mockArchiveTrailInSupabase = vi.fn()
vi.mock('../db/archive', () => ({
  archiveTrailInSupabase: (id: string) => mockArchiveTrailInSupabase(id),
}))

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
    mockArchiveTrailInSupabase.mockResolvedValue(undefined)
    setStoredUserEmail('test@example.com')
  })

  it('renders sections in correct order: Digital Brochure first, ZIP second, Archive third', async () => {
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

    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^export$/i })).toBeInTheDocument()
    })

    const digitalBrochure = screen.getByRole('heading', { name: /digital brochure/i })
    const archiveHeading = screen.getByRole('heading', { name: /complete & archive trail/i })
    const exportZipButton = screen.getByText(/Export \(ZIP\)/)

    expect(
      digitalBrochure.compareDocumentPosition(archiveHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(
      exportZipButton.compareDocumentPosition(archiveHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(
      digitalBrochure.compareDocumentPosition(exportZipButton) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('archive button is disabled when checkboxes are unchecked', async () => {
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

    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /complete & archive trail/i })).toBeInTheDocument()
    })

    const archiveButton = screen.getByRole('button', { name: /complete.*archive trail|tick both checkboxes/i })
    expect(archiveButton).toBeDisabled()
  })

  it('archive button becomes active only when both checkboxes are ticked', async () => {
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

    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /complete & archive trail/i })).toBeInTheDocument()
    })

    const zipCheckbox = screen.getByRole('checkbox', {
      name: /i have downloaded the zip export/i,
    })
    const pdfCheckbox = screen.getByRole('checkbox', {
      name: /i have generated and saved the digital brochure pdf/i,
    })
    const archiveButton = screen.getByRole('button', { name: /complete.*archive trail|tick both checkboxes/i })

    expect(archiveButton).toBeDisabled()

    await userEvent.click(zipCheckbox)
    expect(archiveButton).toBeDisabled()

    await userEvent.click(pdfCheckbox)
    expect(archiveButton).not.toBeDisabled()
  })

  it('confirmation dialog appears when archive button is clicked', async () => {
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

    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /complete & archive trail/i })).toBeInTheDocument()
    })

    const zipCheckbox = screen.getByRole('checkbox', {
      name: /i have downloaded the zip export/i,
    })
    const pdfCheckbox = screen.getByRole('checkbox', {
      name: /i have generated and saved the digital brochure pdf/i,
    })
    await userEvent.click(zipCheckbox)
    await userEvent.click(pdfCheckbox)

    const archiveButton = screen.getByRole('button', { name: /complete.*archive trail|tick both checkboxes/i })
    await userEvent.click(archiveButton)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
  })

  it('cancel dismisses archive dialog without clearing data', async () => {
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

    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /complete & archive trail/i })).toBeInTheDocument()
    })

    const zipCheckbox = screen.getByRole('checkbox', {
      name: /i have downloaded the zip export/i,
    })
    const pdfCheckbox = screen.getByRole('checkbox', {
      name: /i have generated and saved the digital brochure pdf/i,
    })
    await userEvent.click(zipCheckbox)
    await userEvent.click(pdfCheckbox)

    const archiveButton = screen.getByRole('button', { name: /complete.*archive trail|tick both checkboxes/i })
    await userEvent.click(archiveButton)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await userEvent.click(cancelButton)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const profile = await db.userProfile.get('default')
    expect(profile).toBeDefined()
    expect(profile?.email).toBe('test@example.com')
  })

  it('shows loading state during archive', async () => {
    let resolveArchive: () => void
    mockArchiveTrailInSupabase.mockImplementation(
      () => new Promise<void>((r) => { resolveArchive = r })
    )

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

    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /complete & archive trail/i })).toBeInTheDocument()
    })

    const zipCheckbox = screen.getByRole('checkbox', {
      name: /i have downloaded the zip export/i,
    })
    const pdfCheckbox = screen.getByRole('checkbox', {
      name: /i have generated and saved the digital brochure pdf/i,
    })
    await userEvent.click(zipCheckbox)
    await userEvent.click(pdfCheckbox)

    const archiveButton = screen.getByRole('button', { name: /complete.*archive trail|tick both checkboxes/i })
    await userEvent.click(archiveButton)

    const confirmButton = screen.getByRole('button', { name: /yes, archive trail/i })
    await userEvent.click(confirmButton)

    const archivingButton = screen.getByRole('button', { name: /archiving trail/i })
    expect(archivingButton).toBeDisabled()
    expect(archivingButton).toHaveTextContent('Archiving...')

    resolveArchive!()
  })

  it('shows error and does not clear data if archive fails', async () => {
    mockArchiveTrailInSupabase.mockRejectedValue(new Error('Network error'))

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

    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /complete & archive trail/i })).toBeInTheDocument()
    })

    const zipCheckbox = screen.getByRole('checkbox', {
      name: /i have downloaded the zip export/i,
    })
    const pdfCheckbox = screen.getByRole('checkbox', {
      name: /i have generated and saved the digital brochure pdf/i,
    })
    await userEvent.click(zipCheckbox)
    await userEvent.click(pdfCheckbox)

    const archiveButton = screen.getByRole('button', { name: /complete.*archive trail|tick both checkboxes/i })
    await userEvent.click(archiveButton)

    const confirmButton = screen.getByRole('button', { name: /yes, archive trail/i })
    await userEvent.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByText(/archive failed/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/your local data has not been cleared/i)).toBeInTheDocument()

    const profile = await db.userProfile.get('default')
    expect(profile).toBeDefined()
  })

  it('confirm triggers Dexie clear and shows success message', async () => {
    const reloadMock = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: reloadMock },
      writable: true,
    })

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

    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /complete & archive trail/i })).toBeInTheDocument()
    })

    const zipCheckbox = screen.getByRole('checkbox', {
      name: /i have downloaded the zip export/i,
    })
    const pdfCheckbox = screen.getByRole('checkbox', {
      name: /i have generated and saved the digital brochure pdf/i,
    })
    await userEvent.click(zipCheckbox)
    await userEvent.click(pdfCheckbox)

    const archiveButton = screen.getByRole('button', { name: /complete.*archive trail|tick both checkboxes/i })
    await userEvent.click(archiveButton)

    const confirmButton = screen.getByRole('button', { name: /yes, archive trail/i })
    await userEvent.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByText(/trail archived successfully/i)).toBeInTheDocument()
    })

    await waitFor(
      () => {
        expect(reloadMock).toHaveBeenCalled()
      },
      { timeout: 3500 }
    )

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    })
  })

  it('offline check blocks archive flow and shows appropriate message', async () => {
    const originalOnLine = navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

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

    render(<TestWrapper />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /complete & archive trail/i })).toBeInTheDocument()
    })

    const zipCheckbox = screen.getByRole('checkbox', {
      name: /i have downloaded the zip export/i,
    })
    const pdfCheckbox = screen.getByRole('checkbox', {
      name: /i have generated and saved the digital brochure pdf/i,
    })
    await userEvent.click(zipCheckbox)
    await userEvent.click(pdfCheckbox)

    const archiveButton = screen.getByRole('button', { name: /complete.*archive trail|tick both checkboxes/i })
    await userEvent.click(archiveButton)

    expect(screen.getByText(/you must be online to archive/i)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockArchiveTrailInSupabase).not.toHaveBeenCalled()

    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, writable: true })
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
      expect(screen.getByRole('heading', { name: /^export$/i })).toBeInTheDocument()
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
      expect(screen.getByRole('heading', { name: /^export$/i })).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText(/Selected trail: Graveyard Trail/i)).toBeInTheDocument()
    })

    const graveyardButton = screen.getByRole('button', { name: /graveyard trail/i })
    expect(graveyardButton).toHaveAttribute('aria-pressed', 'true')
  })
})
