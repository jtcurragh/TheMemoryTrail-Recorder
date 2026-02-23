import { useState } from 'react'
import { processWelcome } from '../services/welcomeService'
import { setWelcomeComplete, setStoredUserEmail } from '../utils/storage'

interface WelcomeScreenProps {
  onComplete: () => void
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restoreProgress, setRestoreProgress] = useState<{
    current: number
    total: number
  } | null>(null)
  const [postCompleteMessage, setPostCompleteMessage] = useState<string | null>(
    null
  )

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    !isSubmitting &&
    !postCompleteMessage

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit && !postCompleteMessage) return

    setIsSubmitting(true)
    setError(null)
    setRestoreProgress(null)
    setPostCompleteMessage(null)
    try {
      const result = await processWelcome(name.trim(), email.trim(), {
        onProgress: (current, total) =>
          setRestoreProgress({ current, total }),
      })
      setStoredUserEmail(email.trim().toLowerCase())
      setWelcomeComplete()

      const meta = result.restoreMeta
      if (meta) {
        if (meta.trailCount === 0 && meta.poiCount === 0) {
          setPostCompleteMessage(
            'No data found for this email address. If you used a different email on your other device, please sign in with that address instead.'
          )
        } else if (meta.failedPhotos.length > 0) {
          setPostCompleteMessage(
            `Restored successfully, but ${meta.failedPhotos.length} photo${meta.failedPhotos.length !== 1 ? 's' : ''} could not be retrieved. You may need to re-photograph these POIs.`
          )
        } else {
          setPostCompleteMessage('Welcome back!')
        }
      } else {
        onComplete()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
      setRestoreProgress(null)
    }
  }

  const handleContinue = () => {
    setPostCompleteMessage(null)
    onComplete()
  }

  if (postCompleteMessage) {
    const isWarning =
      postCompleteMessage.includes('could not be retrieved') ||
      postCompleteMessage.includes('No data found')
    return (
      <main className="min-h-screen bg-white p-6 max-w-[680px] mx-auto flex flex-col">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-govuk-text mb-2">
            Historic Graves Trail
          </h1>
          <p className="text-lg text-govuk-muted mb-10">
            Recording our shared heritage
          </p>
          <div
            className={`mb-6 p-4 border-2 rounded ${
              isWarning
                ? 'bg-[#fef3c7] border-[#f59e0b] text-govuk-text'
                : 'bg-govuk-green/10 border-govuk-green text-govuk-text'
            }`}
            role="status"
            aria-live="polite"
          >
            <p className="text-lg font-medium">{postCompleteMessage}</p>
          </div>
          <button
            type="button"
            onClick={handleContinue}
            className="w-full min-h-[56px] bg-tmt-teal text-white text-lg font-bold px-4 py-3"
          >
            Continue
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white p-6 max-w-[680px] mx-auto flex flex-col">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-govuk-text mb-2">
          Historic Graves Trail
        </h1>
        <p className="text-lg text-govuk-muted mb-10">
          Recording our shared heritage
        </p>
        {/* TODO: Replace with Historic Graves logo SVG — awaiting asset */}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-6">
            <label htmlFor="name" className="sr-only">
              Your first and last name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your first and last name"
              className="block w-full min-h-[56px] px-4 py-3 text-lg border-2 border-govuk-border rounded-none mb-4"
              autoComplete="name"
            />
            <label htmlFor="email" className="sr-only">
              Your email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="block w-full min-h-[56px] px-4 py-3 text-lg border-2 border-govuk-border rounded-none"
              autoComplete="email"
            />
          </div>

          {error && (
            <p className="mb-4 text-govuk-red" role="alert">
              {error}
            </p>
          )}

          {isSubmitting && restoreProgress && (
            <p
              className="mb-4 text-govuk-muted text-lg"
              role="status"
              aria-live="polite"
            >
              Restoring… ({restoreProgress.current} of {restoreProgress.total}{' '}
              POIs)
            </p>
          )}

          {isSubmitting && !restoreProgress && (
            <p className="mb-4 text-govuk-muted text-lg" role="status">
              Setting up…
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full min-h-[56px] bg-tmt-teal text-white text-lg font-bold px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Start recording Trails"
          >
            Start recording Trails
          </button>
        </form>
      </div>

      <p className="mt-8 text-sm text-govuk-muted">
        Your work saves automatically. We&apos;ll never share your details.
      </p>
    </main>
  )
}
