/**
 * File Upload Security & Validation
 * Enforces strict file type allowlists, size limits, and magic byte verification
 * for banking statements, financial records, and data imports.
 */

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_EXTENSIONS = ['.csv', '.pdf', '.ofx', '.qfx', '.json'] as const;

export const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'text/plain',
  'application/pdf',
  'application/json',
  'application/x-ofx',
  'application/vnd.intu.qfx',
]);

export const FORBIDDEN_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'py', 'js', 'html', 'htm', 'svg', 'dll', 'bin'
]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file's name, extension, and declared size.
 */
export function validateFileMetadata(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // 1. File size check
  if (file.size <= 0) {
    return { valid: false, error: 'File is empty.' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File exceeds maximum allowed size of 5MB (${(file.size / (1024 * 1024)).toFixed(2)}MB).`,
    };
  }

  // 2. Extension check
  const fileName = file.name.toLowerCase();
  const extensionMatch = fileName.match(/\.([a-z0-9]+)$/);
  if (!extensionMatch) {
    return { valid: false, error: 'File must have an explicit extension (.csv, .pdf, .json, .ofx).' };
  }

  const ext = `.${extensionMatch[1]}`;
  const rawExt = extensionMatch[1];

  if (FORBIDDEN_EXTENSIONS.has(rawExt)) {
    return { valid: false, error: `Executable or script file type ".${rawExt}" is strictly prohibited.` };
  }

  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return {
      valid: false,
      error: `Unsupported file extension "${ext}". Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // 3. MIME type check
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported MIME type "${file.type}". Allowed formats: CSV, PDF, JSON, OFX.`,
    };
  }

  return { valid: true };
}

/**
 * Validates magic bytes of file contents to prevent MIME spoofing.
 */
export async function validateMagicBytes(file: File): Promise<FileValidationResult> {
  const metadataResult = validateFileMetadata(file);
  if (!metadataResult.valid) {
    return metadataResult;
  }

  try {
    const slice = file.slice(0, 16);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PDF check: starts with %PDF (0x25 0x50 0x44 0x46)
    if (file.name.toLowerCase().endsWith('.pdf')) {
      const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
      if (!isPdf) {
        return { valid: false, error: 'File content does not match standard PDF binary signature.' };
      }
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: `Failed to inspect file contents: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}
