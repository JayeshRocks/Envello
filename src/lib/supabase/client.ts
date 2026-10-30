import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { env, isSupabaseConfigured } from '@/lib/env';

export { isSupabaseConfigured };

/**
 * Strongly-typed Supabase PostgreSQL Client
 * Configured with PKCE OAuth flow, automatic token refresh,
 * and zero-trust session management.
 */
export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
