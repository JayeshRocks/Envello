import React, { createContext, useEffect, useState, useCallback } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export interface SignUpResult {
  error: AuthError | null;
  session: Session | null;
  user: User | null;
  alreadyRegistered: boolean;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAllowlisted: boolean | null; // null = checking, true/false = checked
  isLoading: boolean;
  error: string | null;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (value: boolean) => void;
  needsPasswordSetup: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<SignUpResult>;
  sendMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  resendVerificationEmail: (email: string) => Promise<{ error: AuthError | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

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
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
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

  const signUpWithEmail = async (email: string, password: string): Promise<SignUpResult> => {
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          has_set_password: true,
        },
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      return { error: signUpError, session: null, user: null, alreadyRegistered: false };
    }
    const alreadyRegistered = Boolean(
      data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0
    );
    return {
      error: null,
      session: data.session,
      user: data.user,
      alreadyRegistered,
    };
  };

  const resendVerificationEmail = async (email: string) => {
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (resendError) {
      setError(resendError.message);
      return { error: resendError };
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

  const resetPasswordForEmail = async (email: string) => {
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (resetError) {
      setError(resetError.message);
      return { error: resetError };
    }
    return { error: null };
  };

  const updatePassword = async (password: string) => {
    setError(null);
    const { data, error: updateError } = await supabase.auth.updateUser({
      password,
      data: {
        has_set_password: true,
      },
    });
    if (updateError) {
      setError(updateError.message);
      return { error: updateError };
    }
    if (data.user) {
      setUser(data.user);
    }
    setIsPasswordRecovery(false);
    return { error: null };
  };

  const clearError = () => setError(null);

  const needsPasswordSetup = Boolean(
    user &&
    (user.app_metadata?.provider === 'email' || user.app_metadata?.providers?.includes('email')) &&
    user.app_metadata?.provider !== 'google' &&
    !user.app_metadata?.providers?.includes('google') &&
    user.user_metadata?.has_set_password !== true
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAllowlisted,
        isLoading,
        error,
        isPasswordRecovery,
        setIsPasswordRecovery,
        needsPasswordSetup,
        signInWithEmail,
        signUpWithEmail,
        sendMagicLink,
        resendVerificationEmail,
        resetPasswordForEmail,
        updatePassword,
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
