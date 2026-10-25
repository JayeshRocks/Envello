import React, { createContext, useEffect, useState, useCallback } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAllowlisted: boolean | null; // null = checking, true/false = checked
  isLoading: boolean;
  error: string | null;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  sendMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshAllowlistStatus: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAllowlisted, setIsAllowlisted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if current authenticated user's email is on the server allowlist
  const checkAllowlist = useCallback(async (userEmail?: string) => {
    if (!isSupabaseConfigured || !userEmail) {
      setIsAllowlisted(false);
      return;
    }

    try {
      const { data, error: queryError } = await supabase
        .from('allowed_users')
        .select('email')
        .eq('email', userEmail.toLowerCase().trim())
        .maybeSingle();

      if (queryError) {
        console.error('[Envello Auth] Error verifying allowlist:', queryError.message);
        setIsAllowlisted(false);
      } else {
        setIsAllowlisted(Boolean(data));
      }
    } catch (err) {
      console.error('[Envello Auth] Unexpected error verifying allowlist:', err);
      setIsAllowlisted(false);
    }
  }, []);

  // Sync session on mount and subscribe to auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession }, error: sessionError }) => {
      if (sessionError) {
        console.error('[Envello Auth] Error getting session:', sessionError.message);
      }
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user?.email) {
        checkAllowlist(initialSession.user.email).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // 2. Real-time auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user?.email) {
        await checkAllowlist(newSession.user.email);
      } else {
        setIsAllowlisted(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAllowlist]);

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message);
      return { error: signInError };
    }
    return { error: null };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (signUpError) {
      setError(signUpError.message);
      return { error: signUpError };
    }
    return { error: null };
  };

  const sendMagicLink = async (email: string) => {
    setError(null);
    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (magicLinkError) {
      setError(magicLinkError.message);
      return { error: magicLinkError };
    }
    return { error: null };
  };

  const signInWithGoogle = async () => {
    setError(null);
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (googleError) {
      setError(googleError.message);
      return { error: googleError };
    }
    return { error: null };
  };

  const signOut = async () => {
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return { error: signOutError };
    }
    setUser(null);
    setSession(null);
    setIsAllowlisted(null);
    return { error: null };
  };

  const refreshAllowlistStatus = async () => {
    if (user?.email) {
      await checkAllowlist(user.email);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAllowlisted,
        isLoading,
        error,
        signInWithEmail,
        signUpWithEmail,
        sendMagicLink,
        signInWithGoogle,
        signOut,
        refreshAllowlistStatus,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
