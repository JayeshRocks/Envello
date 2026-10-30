/**
 * Input Sanitization & Anti-XSS Utilities
 * Protects financial records and UI from script injection,
 * malicious HTML encoding, dangerous URI schemes, and control characters.
 */

// Strip HTML tags and control characters (including null bytes)
const STRIP_TAGS_REGEX = /<[^>]*>?/gm;
const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const DANGEROUS_SCHEMES_REGEX = /^(javascript|data|vbscript|file):/i;

/**
 * Sanitizes single-line user input (payee names, account names, envelope labels).
 * Trims whitespace, strips HTML tags, removes control characters, and enforces length bounds.
 */
export function sanitizeString(input: unknown, maxLength: number = 200): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(STRIP_TAGS_REGEX, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitizes multi-line user input (notes, descriptions).
 * Preserves safe newlines while stripping script tags, null bytes, and malicious tags.
 */
export function sanitizeNotes(input: unknown, maxLength: number = 2000): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(STRIP_TAGS_REGEX, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Normalizes and cleans email strings before auth requests.
 */
export function sanitizeEmail(email: unknown): string {
  if (typeof email !== 'string') return '';
  return email
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .slice(0, 254);
}

/**
 * Checks whether an external or user-provided URL is safe to navigate or link.
 * Prevents javascript: or data: URI execution.
 */
export function isSafeUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  if (DANGEROUS_SCHEMES_REGEX.test(trimmed)) {
    return false;
  }

  try {
    const base = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost';
    const parsed = new URL(trimmed, base);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
