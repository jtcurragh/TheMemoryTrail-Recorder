const WELCOME_COMPLETE_KEY = 'welcomeComplete'
const USER_EMAIL_KEY = 'userEmail'
const ACTIVE_TRAIL_ID_KEY = 'activeTrailId'

export function isWelcomeComplete(): boolean {
  return localStorage.getItem(WELCOME_COMPLETE_KEY) === 'true'
}

export function setWelcomeComplete(): void {
  localStorage.setItem(WELCOME_COMPLETE_KEY, 'true')
}

export function getStoredUserEmail(): string | null {
  return localStorage.getItem(USER_EMAIL_KEY)
}

export function setStoredUserEmail(email: string): void {
  localStorage.setItem(USER_EMAIL_KEY, email)
}

/** @deprecated Use isWelcomeComplete */
export function isUserSetupComplete(): boolean {
  return isWelcomeComplete()
}

/** @deprecated Use setWelcomeComplete */
export function setUserSetupComplete(): void {
  setWelcomeComplete()
}

export function getActiveTrailId(): string | null {
  return localStorage.getItem(ACTIVE_TRAIL_ID_KEY)
}

export function setActiveTrailId(trailId: string): void {
  localStorage.setItem(ACTIVE_TRAIL_ID_KEY, trailId)
}
