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

function validateUrl(url: string, fieldName: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Invalid protocol for ${fieldName}. Expected http: or https:`);
    }
    return url;
  } catch (err) {
    throw new Error(`[Envello Security] Invalid ${fieldName}: "${url}". ${err instanceof Error ? err.message : ''}`);
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

  const isConfigured = Boolean(
    rawUrl &&
    rawAnonKey &&
    rawUrl !== 'https://your-project-ref.supabase.co'
  );

  const supabaseUrl = isConfigured ? validateUrl(rawUrl, 'VITE_SUPABASE_URL') : (rawUrl || 'https://placeholder.supabase.co');
  const supabaseAnonKey = rawAnonKey || 'placeholder-key';

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
  env.VITE_SUPABASE_ANON_KEY !== 'placeholder-key'
);
