const USER_SETUP_COMPLETE_KEY = 'userSetupComplete'
const ACTIVE_TRAIL_ID_KEY = 'activeTrailId'

export function isUserSetupComplete(): boolean {
  return localStorage.getItem(USER_SETUP_COMPLETE_KEY) === 'true'
}

export function setUserSetupComplete(): void {
  localStorage.setItem(USER_SETUP_COMPLETE_KEY, 'true')
}

export function getActiveTrailId(): string | null {
  return localStorage.getItem(ACTIVE_TRAIL_ID_KEY)
}

export function setActiveTrailId(trailId: string): void {
  localStorage.setItem(ACTIVE_TRAIL_ID_KEY, trailId)
}
