import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeNotes,
  sanitizeEmail,
  isSafeUrl,
} from './sanitization';

describe('sanitization', () => {
  it('strips script tags and malicious HTML from single-line string', () => {
    const malicious = '<script>alert("xss")</script>Dinner with Friends';
    const clean = sanitizeString(malicious);
    expect(clean).toBe('alert("xss")Dinner with Friends');
    expect(clean).not.toContain('<script>');
  });

  it('strips dangerous control characters and null bytes', () => {
    const withNullByte = 'Salary\u0000Deposit\u0008';
    const clean = sanitizeString(withNullByte);
    expect(clean).toBe('SalaryDeposit');
  });

  it('enforces maximum character length bounds', () => {
    const longString = 'A'.repeat(500);
    const clean = sanitizeString(longString, 50);
    expect(clean.length).toBe(50);
  });

  it('sanitizes notes and descriptions safely', () => {
    const notes = '<b>Important Note:</b>\nCheck receipt <img src=x onerror=alert(1)>';
    const clean = sanitizeNotes(notes);
    expect(clean).toBe('Important Note:\nCheck receipt');
    expect(clean).not.toContain('<b>');
    expect(clean).not.toContain('<img');
  });

  it('normalizes and cleans email addresses', () => {
    const email = '  Owner.Test+Envello@Example.COM \u0000 ';
    const clean = sanitizeEmail(email);
    expect(clean).toBe('owner.test+envello@example.com');
  });

  describe('isSafeUrl', () => {
    it('approves legitimate https and http URLs', () => {
      expect(isSafeUrl('https://envello.app')).toBe(true);
      expect(isSafeUrl('https://example.com/api/v1')).toBe(true);
      expect(isSafeUrl('http://localhost:5173')).toBe(true);
    });

    it('rejects javascript: and data: and dangerous schemes', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeUrl('JAVASCRIPT:alert(document.cookie)')).toBe(false);
      expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeUrl('vbscript:msgbox("hacked")')).toBe(false);
      expect(isSafeUrl('file:///etc/passwd')).toBe(false);
    });

    it('rejects empty and malformed URLs', () => {
      expect(isSafeUrl('')).toBe(false);
      expect(isSafeUrl(null)).toBe(false);
      expect(isSafeUrl(undefined)).toBe(false);
    });
  });
});
