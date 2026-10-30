/**
 * Client-Side Rate Limiter & Cooldown Guard
 * Prevents rapid-fire brute forcing, auth credential stuffing,
 * and email sending abuse from the browser.
 * Uses an in-memory fallback store with sessionStorage synchronization
 * for full compatibility with browsers, private modes, and headless test runners.
 */

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
}

interface AttemptRecord {
  attempts: number[];
}

const STORAGE_PREFIX = 'envello_rl_';

// In-memory fallback map for environments without sessionStorage (e.g. Node.js CI, private browsing)
const memoryStore = new Map<string, string>();

function getRawItem(key: string): string | null {
  try {
    if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.getItem === 'function') {
      const val = sessionStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {
    // Fall back to memoryStore
  }
  return memoryStore.get(key) ?? null;
}

function setRawItem(key: string, value: string): void {
  memoryStore.set(key, value);
  try {
    if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.setItem === 'function') {
      sessionStorage.setItem(key, value);
    }
  } catch {
    // In-memory storage is already populated
  }
}

function removeRawItem(key: string): void {
  memoryStore.delete(key);
  try {
    if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.removeItem === 'function') {
      sessionStorage.removeItem(key);
    }
  } catch {
    // In-memory storage is already cleared
  }
}

export function clearRateLimitStorage(): void {
  memoryStore.clear();
  try {
    if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.clear === 'function') {
      sessionStorage.clear();
    }
  } catch {
    // Ignore
  }
}

function getStorageRecord(key: string): AttemptRecord {
  try {
    const raw = getRawItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return { attempts: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.attempts)) {
      return parsed;
    }
    return { attempts: [] };
  } catch {
    return { attempts: [] };
  }
}

function setStorageRecord(key: string, record: AttemptRecord): void {
  setRawItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(record));
}

/**
 * Checks rate limit status for a given key within a rolling time window.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes default
): RateLimitStatus {
  const now = Date.now();
  const record = getStorageRecord(key);

  // Filter out attempts older than the window
  const activeAttempts = record.attempts.filter((ts) => now - ts < windowMs);

  if (activeAttempts.length >= maxAttempts) {
    const oldest = activeAttempts[0];
    const resetAt = oldest + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      resetAt,
    };
  }

  return {
    allowed: true,
    remaining: maxAttempts - activeAttempts.length,
    retryAfterSeconds: 0,
    resetAt: now + windowMs,
  };
}

/**
 * Records an attempt for the given rate limit key.
 */
export function recordAttempt(
  key: string,
  windowMs: number = 15 * 60 * 1000
): RateLimitStatus {
  const now = Date.now();
  const record = getStorageRecord(key);
  const activeAttempts = record.attempts.filter((ts) => now - ts < windowMs);
  activeAttempts.push(now);

  setStorageRecord(key, { attempts: activeAttempts });
  return checkRateLimit(key, 5, windowMs);
}

/**
 * Clears recorded attempts on successful action (e.g. successful login).
 */
export function resetRateLimit(key: string): void {
  removeRawItem(`${STORAGE_PREFIX}${key}`);
}

/**
 * Cooldown helper for time-delayed triggers (e.g., resend email button).
 */
export function getCooldownRemaining(key: string, cooldownSeconds: number = 60): number {
  try {
    const raw = getRawItem(`${STORAGE_PREFIX}cd_${key}`);
    if (!raw) return 0;
    const lastTrigger = Number(raw);
    const elapsedSeconds = Math.floor((Date.now() - lastTrigger) / 1000);
    return Math.max(0, cooldownSeconds - elapsedSeconds);
  } catch {
    return 0;
  }
}

export function setCooldown(key: string): void {
  setRawItem(`${STORAGE_PREFIX}cd_${key}`, String(Date.now()));
}
