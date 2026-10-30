import { describe, it, expect } from 'vitest';
import {
  validateFileMetadata,
  MAX_FILE_SIZE_BYTES,
} from './fileUpload';

describe('fileUpload security', () => {
  it('approves legitimate CSV statement files within size bounds', () => {
    const file = new File(['date,amount,description'], 'hdfc_statement.csv', {
      type: 'text/csv',
    });
    const result = validateFileMetadata(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('approves legitimate PDF statement files', () => {
    const file = new File(['dummy-content'], 'icici_statement.pdf', {
      type: 'application/pdf',
    });
    const result = validateFileMetadata(file);
    expect(result.valid).toBe(true);
  });

  it('rejects files larger than 5MB', () => {
    const oversized = new File([''], 'huge.csv', { type: 'text/csv' });
    Object.defineProperty(oversized, 'size', { value: MAX_FILE_SIZE_BYTES + 1024 });

    const result = validateFileMetadata(oversized);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum allowed size');
  });

  it('rejects empty files', () => {
    const emptyFile = new File([], 'empty.csv', { type: 'text/csv' });
    const result = validateFileMetadata(emptyFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('File is empty');
  });

  it('rejects dangerous executable and script extensions', () => {
    const dangerousExtensions = [
      'malware.exe',
      'script.sh',
      'hack.bat',
      'payload.js',
      'page.html',
      'image.svg',
      'exploit.php',
    ];

    for (const name of dangerousExtensions) {
      const file = new File(['content'], name, { type: 'text/plain' });
      const result = validateFileMetadata(file);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/prohibited|Unsupported/);
    }
  });
});
