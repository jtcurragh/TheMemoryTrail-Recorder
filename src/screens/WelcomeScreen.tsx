import { useState } from 'react'
import { processWelcome, checkEmailExists } from '../services/welcomeService'
import logoSvg from '../assets/logo-banner.svg'
import { setWelcomeComplete, setStoredUserEmail } from '../utils/storage'

interface WelcomeScreenProps {
  onComplete: () => void
}

type Step = 'name-email' | 'parish' | 'done'

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [graveyardName, setGraveyardName] = useState('')
  const [parishName, setParishName] = useState('')
  const [step, setStep] = useState<Step>('name-email')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restoreProgress, setRestoreProgress] = useState<{
    current: number
    total: number
  } | null>(null)
  const [postCompleteMessage, setPostCompleteMessage] = useState<string | null>(
    null
  )
  const [isReOnboarding, setIsReOnboarding] = useState(false)

  const canContinue =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    !isSubmitting &&
    step === 'name-email'

  const canCreateTrails =
    graveyardName.trim().length > 0 &&
    parishName.trim().length > 0 &&
    !isSubmitting &&
    step === 'parish'

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canContinue) return

    setIsSubmitting(true)
    setError(null)
    try {
      const exists = await checkEmailExists(email.trim())
      if (exists) {
        const result = await processWelcome(name.trim(), email.trim(), {
          onProgress: (current, total) =>
            setRestoreProgress({ current, total }),
        })
        setStoredUserEmail(email.trim().toLowerCase())

        if (result.needsReOnboarding) {
          setIsReOnboarding(true)
          setStep('parish')
          return
        }

        setWelcomeComplete()

        const meta = result.restoreMeta
        if (meta) {
          if (meta.failedPhotos.length > 0) {
            setPostCompleteMessage(
              `Restored successfully, but ${meta.failedPhotos.length} photo${meta.failedPhotos.length !== 1 ? 's' : ''} could not be retrieved. You may need to re-photograph these POIs.`
            )
          } else {
            setPostCompleteMessage('Welcome back!')
          }
        } else {
          onComplete()
        }
      } else {
        setStep('parish')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
      setRestoreProgress(null)
    }
  }

  const handleCreateTrails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreateTrails) return

    setIsSubmitting(true)
    setError(null)
    try {
      const result = await processWelcome(name.trim(), email.trim(), {
        graveyardName: graveyardName.trim(),
        parishName: parishName.trim(),
      })
      setStoredUserEmail(email.trim().toLowerCase())
      setWelcomeComplete()
      onComplete()
      void result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDismissMessage = () => {
    setPostCompleteMessage(null)
    onComplete()
  }

  if (postCompleteMessage) {
    const isWarning =
      postCompleteMessage.includes('could not be retrieved') ||
      postCompleteMessage.includes('No data found')
    return (
      <main className="min-h-screen bg-[#f5f5f0] p-6 max-w-[680px] mx-auto flex flex-col">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold text-[#1a2a2a] mb-2">
            The Historic Graves Trail
          </h1>
          <p className="text-lg text-[#595959] mb-10">
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
            onClick={handleDismissMessage}
            className="w-full min-h-[56px] bg-[#2d7a6e] text-white text-lg font-bold px-4 py-3 rounded-[12px]"
          >
            Continue
          </button>
        </div>
      </main>
    )
  }

  if (step === 'parish') {
    return (
      <main className="min-h-screen bg-[#f5f5f0] p-6 max-w-[680px] mx-auto flex flex-col">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold text-[#1a2a2a] mb-2">
            {isReOnboarding
              ? `Welcome back, ${name.trim() || 'there'}. Let's set up your next trail.`
              : 'The Historic Graves Trail'}
          </h1>
          <p className="text-lg text-[#595959] mb-10">
            {isReOnboarding
              ? 'Enter the parish and graveyard for your new location.'
              : 'Recording our shared heritage'}
          </p>

          <form onSubmit={handleCreateTrails} noValidate>
            <div className="mb-6">
              <label htmlFor="graveyardName" className="sr-only">
                Graveyard name
              </label>
              <input
                id="graveyardName"
                type="text"
                value={graveyardName}
                onChange={(e) => setGraveyardName(e.target.value)}
                placeholder="Graveyard name (e.g. St. Declan's, Clonfert Cathedral)"
                className="block w-full min-h-[56px] px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg"
                autoComplete="organization"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="parishName" className="sr-only">
                Parish or place name
              </label>
              <input
                id="parishName"
                type="text"
                value={parishName}
                onChange={(e) => setParishName(e.target.value)}
                placeholder="Parish or place name (e.g. Ardmore, Clonfert)"
                className="block w-full min-h-[56px] px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg"
                autoComplete="organization"
              />
            </div>

            {graveyardName.trim() && parishName.trim() && (
              <div className="mb-6 space-y-1" aria-live="polite">
                <p className="text-lg text-[#0b0c0c]">
                  Your trails will be: {graveyardName.trim()} Graveyard Trail and{' '}
                  {parishName.trim()} Parish Trail
                </p>
              </div>
            )}

            {error && (
              <p className="mb-4 text-govuk-red" role="alert">
                {error}
              </p>
            )}

            {isSubmitting && (
              <p className="mb-4 text-govuk-muted text-lg" role="status">
                Setting up…
              </p>
            )}

            <button
              type="submit"
              disabled={!canCreateTrails}
              className="w-full min-h-[56px] bg-[#2d7a6e] text-white text-lg font-bold px-4 py-3 rounded-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Create my trails"
            >
              Create My Trails
            </button>
          </form>
        </div>

        <p className="mt-8 text-sm text-[#595959]">
          Your work saves automatically. We&apos;ll never share your details.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] p-6 max-w-[680px] mx-auto flex flex-col">
      <div className="flex-1">
        <img
          src={logoSvg}
          alt=""
          className="h-24 w-24 mx-auto mb-6"
          aria-hidden
        />
        <h1 className="text-3xl font-semibold text-[#1a2a2a] mb-2">
          The Historic Graves Trail
        </h1>
        <p className="text-lg text-[#595959] mb-10">
          Recording our shared heritage
        </p>

        <form onSubmit={handleContinue} noValidate>
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
              className="block w-full min-h-[56px] px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg mb-4"
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
              className="block w-full min-h-[56px] px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg"
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
              className="mb-4 text-[#595959] text-lg"
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
            disabled={!canContinue}
            className="w-full min-h-[56px] bg-tmt-teal text-white text-lg font-bold px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Continue"
          >
            Continue
          </button>
        </form>
      </div>

      <p className="mt-8 text-sm text-govuk-muted">
        Your work saves automatically. We&apos;ll never share your details.
      </p>
    </main>
  )
}
