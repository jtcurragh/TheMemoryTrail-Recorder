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

  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && !isSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)
    try {
      await processWelcome(name.trim(), email.trim())
      setStoredUserEmail(email.trim().toLowerCase())
      setWelcomeComplete()
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
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
        {/* TODO: Insert Historic Graves logo — awaiting asset */}

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

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full min-h-[56px] bg-tmt-teal text-white text-lg font-bold px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Start Recording"
          >
            Start Recording
          </button>
        </form>
      </div>

      <p className="mt-8 text-sm text-govuk-muted">
        Your work saves automatically. We&apos;ll never share your details.
      </p>
    </main>
  )
}
