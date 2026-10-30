/**
 * Client-Side Rate Limiter & Cooldown Guard
 * Prevents rapid-fire brute forcing, auth credential stuffing,
 * and email sending abuse from the browser.
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

function getStorageRecord(key: string): AttemptRecord {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
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
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(record));
  } catch {
    // Ignore storage quota errors
  }
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
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch {
    // Ignore
  }
}

/**
 * Cooldown helper for time-delayed triggers (e.g., resend email button).
 */
export function getCooldownRemaining(key: string, cooldownSeconds: number = 60): number {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}cd_${key}`);
    if (!raw) return 0;
    const lastTrigger = Number(raw);
    const elapsedSeconds = Math.floor((Date.now() - lastTrigger) / 1000);
    return Math.max(0, cooldownSeconds - elapsedSeconds);
  } catch {
    return 0;
  }
}

export function setCooldown(key: string): void {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}cd_${key}`, String(Date.now()));
  } catch {
    // Ignore
  }
}
