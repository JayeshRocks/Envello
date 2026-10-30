import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  recordAttempt,
  resetRateLimit,
  getCooldownRemaining,
  setCooldown,
} from './rateLimiter';

describe('rateLimiter', () => {
  const testKey = 'test_user_rate_limit';

  beforeEach(() => {
    resetRateLimit(testKey);
    sessionStorage.clear();
  });

  it('allows requests when within attempt threshold', () => {
    const status = checkRateLimit(testKey, 3, 10000);
    expect(status.allowed).toBe(true);
    expect(status.remaining).toBe(3);
    expect(status.retryAfterSeconds).toBe(0);
  });

  it('blocks requests after max attempts are exhausted', () => {
    recordAttempt(testKey, 10000);
    recordAttempt(testKey, 10000);
    recordAttempt(testKey, 10000);

    const status = checkRateLimit(testKey, 3, 10000);
    expect(status.allowed).toBe(false);
    expect(status.remaining).toBe(0);
    expect(status.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets attempts after resetRateLimit is called', () => {
    recordAttempt(testKey, 10000);
    recordAttempt(testKey, 10000);
    resetRateLimit(testKey);

    const status = checkRateLimit(testKey, 3, 10000);
    expect(status.allowed).toBe(true);
    expect(status.remaining).toBe(3);
  });

  it('calculates cooldown remaining correctly', () => {
    expect(getCooldownRemaining(testKey, 60)).toBe(0);
    setCooldown(testKey);
    const remaining = getCooldownRemaining(testKey, 60);
    expect(remaining).toBeGreaterThan(50);
    expect(remaining).toBeLessThanOrEqual(60);
  });
});
