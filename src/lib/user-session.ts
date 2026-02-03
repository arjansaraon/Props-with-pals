/**
 * User session management for localStorage.
 * Stores user metadata (name, isCaptain) keyed by pool invite code.
 * Secrets are NOT stored here - they're in httpOnly cookies.
 */

const STORAGE_PREFIX = 'pwp_';

export interface UserSession {
  name: string;
  isCaptain: boolean;
}

/**
 * Check if localStorage is available (SSR safety)
 */
function isLocalStorageAvailable(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Save user session for a pool
 */
export function saveUserSession(poolCode: string, session: UserSession): void {
  if (!isLocalStorageAvailable()) return;

  try {
    const key = `${STORAGE_PREFIX}${poolCode}`;
    localStorage.setItem(key, JSON.stringify(session));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Get user session for a pool
 */
export function getUserSession(poolCode: string): UserSession | null {
  if (!isLocalStorageAvailable()) return null;

  try {
    const key = `${STORAGE_PREFIX}${poolCode}`;
    const data = localStorage.getItem(key);
    if (!data) return null;

    return JSON.parse(data) as UserSession;
  } catch {
    return null;
  }
}

/**
 * Get all user sessions (all pools the user has joined)
 */
export function getAllUserSessions(): Record<string, UserSession> {
  if (!isLocalStorageAvailable()) return {};

  const sessions: Record<string, UserSession> = {};

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;

      const poolCode = key.slice(STORAGE_PREFIX.length);
      const data = localStorage.getItem(key);
      if (!data) continue;

      try {
        sessions[poolCode] = JSON.parse(data) as UserSession;
      } catch {
        // Skip corrupted entries
      }
    }
  } catch {
    // Ignore errors
  }

  return sessions;
}

/**
 * Remove user session for a pool
 */
export function removeUserSession(poolCode: string): void {
  if (!isLocalStorageAvailable()) return;

  try {
    const key = `${STORAGE_PREFIX}${poolCode}`;
    localStorage.removeItem(key);
  } catch {
    // Ignore errors
  }
}
