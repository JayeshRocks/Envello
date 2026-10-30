/**
 * Safe Environment Variable Loader & Validator
 * Enforces strict typing, validates required variables at startup,
 * and guards against accidental exposure of server secrets in the client bundle.
 */

export interface AppEnv {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_APP_NAME: string;
  VITE_APP_ENV: 'development' | 'production' | 'test';
  VITE_APP_URL: string;
  VITE_ENABLE_AUDIT_LOGGING: boolean;
}

function sanitizeUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed || trimmed === 'true' || trimmed === 'false' || trimmed.includes('your-project-ref')) {
    return 'https://placeholder.supabase.co';
  }
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'https://placeholder.supabase.co';
    }
    return trimmed;
  } catch {
    return 'https://placeholder.supabase.co';
  }
}

export function loadEnv(): AppEnv {
  const rawUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';

  const rawAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  // Guard against server keys accidentally injected with VITE_ prefix
  const allEnvKeys = Object.keys(import.meta.env);
  for (const key of allEnvKeys) {
    const lower = key.toLowerCase();
    if (
      lower.includes('service_role') ||
      lower.includes('secret') ||
      lower.includes('private_key')
    ) {
      console.error(
        `[CRITICAL SECURITY ALERT] Potential secret key detected in client environment: "${key}". ` +
        `Secrets must NEVER be prefixed with VITE_ or exposed to client builds.`
      );
    }
  }

  const supabaseUrl = sanitizeUrl(rawUrl);
  const supabaseAnonKey =
    !rawAnonKey || rawAnonKey === 'true' || rawAnonKey === 'false'
      ? 'placeholder-anon-key'
      : rawAnonKey;

  const appEnv: AppEnv = {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME || 'Envello',
    VITE_APP_ENV: (import.meta.env.VITE_APP_ENV as AppEnv['VITE_APP_ENV']) || (import.meta.env.PROD ? 'production' : 'development'),
    VITE_APP_URL: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
    VITE_ENABLE_AUDIT_LOGGING: import.meta.env.VITE_ENABLE_AUDIT_LOGGING === 'true',
  };

  return appEnv;
}

export const env = loadEnv();

export const isSupabaseConfigured = Boolean(
  env.VITE_SUPABASE_URL &&
  env.VITE_SUPABASE_ANON_KEY &&
  env.VITE_SUPABASE_URL !== 'https://your-project-ref.supabase.co' &&
  env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
  env.VITE_SUPABASE_ANON_KEY !== 'placeholder-key' &&
  env.VITE_SUPABASE_ANON_KEY !== 'placeholder-anon-key'
);
