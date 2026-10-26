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
  needsNameSetup: boolean;
  displayName: string;
  updateProfileName: (displayName: string) => Promise<{ error: Error | null }>;
  updateUserEmail: (newEmail: string) => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<SignUpResult>;
  sendMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  resendVerificationEmail: (email: string) => Promise<{ error: AuthError | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  deletionStatus: 'active' | 'pending_deletion';
  scheduledDeletionAt: string | null;
  requestAccountDeletion: () => Promise<{ error: Error | null; scheduledDeletionAt?: string }>;
  cancelAccountDeletion: () => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  purgeAccountImmediately: () => Promise<{ error: Error | null }>;
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
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [deletionStatus, setDeletionStatus] = useState<'active' | 'pending_deletion'>('active');
  const [scheduledDeletionAt, setScheduledDeletionAt] = useState<string | null>(null);

  // Check if current user has an actual password in the authoritative database
  const checkHasPassword = useCallback(async (currentUser?: User | null) => {
    if (!currentUser) {
      setHasPassword(null);
      return;
    }

    if (currentUser.user_metadata?.has_set_password === true) {
      setHasPassword(true);
      return;
    }

    try {
      // Cast as any because custom RPC is added via migration
      const { data, error: rpcError } = await (supabase.rpc as any)('user_has_password');
      if (!rpcError && typeof data === 'boolean') {
        setHasPassword(data);
        return;
      }
    } catch {
      // Ignore if RPC is not present
    }

    setHasPassword(currentUser.user_metadata?.has_set_password === true);
  }, []);

  // Check 30-day deletion status and scheduled date from public.profiles
  const checkDeletionStatus = useCallback(async (currentUser?: User | null) => {
    if (!currentUser) {
      setDeletionStatus('active');
      setScheduledDeletionAt(null);
      return;
    }

    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('deletion_status, scheduled_deletion_at')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!profileError && data) {
        if (data.deletion_status === 'pending_deletion') {
          // If scheduled date has expired, trigger sweep and sign out
          if (data.scheduled_deletion_at && new Date(data.scheduled_deletion_at) <= new Date()) {
            await (supabase.rpc as any)('delete_user_account').catch(() => {});
            await supabase.auth.signOut().catch(() => {});
            setUser(null);
            setSession(null);
            setDeletionStatus('active');
            setScheduledDeletionAt(null);
            return;
          }
          setDeletionStatus('pending_deletion');
          setScheduledDeletionAt(data.scheduled_deletion_at);
          return;
        }
      }
      setDeletionStatus('active');
      setScheduledDeletionAt(null);
    } catch {
      setDeletionStatus('active');
      setScheduledDeletionAt(null);
    }
  }, []);

  // All authenticated users are authorized (whitelist gating removed)
  const checkAllowlist = useCallback(async (userEmail?: string) => {
    setIsAllowlisted(Boolean(userEmail));
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
      if (initialSession?.user) {
        checkHasPassword(initialSession.user);
        checkDeletionStatus(initialSession.user);
      }
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
      if (newSession?.user) {
        checkHasPassword(newSession.user);
        checkDeletionStatus(newSession.user);
      }
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
  }, [checkAllowlist, checkHasPassword, checkDeletionStatus]);

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
    setHasPassword(true);
    setIsPasswordRecovery(false);
    return { error: null };
  };

  const updateProfileName = async (newDisplayName: string): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('User not authenticated') };
    const cleanName = newDisplayName.trim();
    if (!cleanName) return { error: new Error('Name cannot be empty') };

    try {
      // 1. Update Supabase Auth user metadata
      const { data, error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          display_name: cleanName,
          full_name: cleanName,
          has_confirmed_name: true,
        },
      });

      if (authUpdateError) {
        return { error: authUpdateError };
      }

      if (data.user) {
        setUser(data.user);
      }

      // 2. Upsert into public.profiles for persistent relational queries
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          display_name: cleanName,
          updated_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('[Envello Auth] Warning updating profiles table:', dbErr);
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Failed to update name') };
    }
  };

  const updateUserEmail = async (newEmail: string): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('User not authenticated') };
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { error: new Error('Please enter a valid email address.') };
    }

    try {
      const { data, error: emailError } = await supabase.auth.updateUser(
        { email: cleanEmail },
        { emailRedirectTo: window.location.origin }
      );

      if (emailError) {
        return { error: emailError };
      }

      if (data.user) {
        setUser(data.user);
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Failed to request email change') };
    }
  };

  const requestAccountDeletion = async (): Promise<{ error: Error | null; scheduledDeletionAt?: string }> => {
    if (!user) return { error: new Error('User not authenticated') };
    setError(null);

    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('request_account_deletion', {});
      if (rpcError) {
        if (rpcError.message?.includes('schema cache') || rpcError.code === 'PGRST202') {
          return {
            error: new Error(
              'Database setup pending: Please run migration 20261027000001_account_deletion_grace_period.sql in your Supabase SQL Editor.'
            ),
          };
        }
        return { error: new Error(rpcError.message || 'Failed to request account deletion') };
      }

      const scheduledDate = data?.scheduled_deletion_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      setDeletionStatus('pending_deletion');
      setScheduledDeletionAt(scheduledDate);

      return { error: null, scheduledDeletionAt: scheduledDate };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Unexpected error requesting account deletion') };
    }
  };

  const cancelAccountDeletion = async (): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('User not authenticated') };
    setError(null);

    try {
      const { error: rpcError } = await (supabase.rpc as any)('cancel_account_deletion', {});
      if (rpcError) {
        if (rpcError.message?.includes('schema cache') || rpcError.code === 'PGRST202') {
          return {
            error: new Error(
              'Database setup pending: Please run migration 20261027000001_account_deletion_grace_period.sql in your Supabase SQL Editor.'
            ),
          };
        }
        return { error: new Error(rpcError.message || 'Failed to cancel account deletion') };
      }

      setDeletionStatus('active');
      setScheduledDeletionAt(null);

      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Unexpected error cancelling account deletion') };
    }
  };

  const purgeAccountImmediately = async (): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('User not authenticated') };
    setError(null);

    try {
      // 1. Invoke PostgreSQL SECURITY DEFINER RPC to delete user and cascade financial records immediately
      const { error: rpcError } = await (supabase.rpc as any)('delete_user_account', {});
      if (rpcError) {
        if (rpcError.message?.includes('schema cache') || rpcError.code === 'PGRST202') {
          return {
            error: new Error(
              'Database setup pending: Please run migration 20261027000001_account_deletion_grace_period.sql in your Supabase SQL Editor.'
            ),
          };
        }
        return { error: new Error(rpcError.message || 'Failed to execute immediate account deletion') };
      }

      // 2. Clear all local storage and session credentials
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageErr) {
        console.warn('[Envello Auth] Warning clearing browser storage:', storageErr);
      }

      // 3. Terminate local auth session
      await supabase.auth.signOut().catch(() => {});
      setUser(null);
      setSession(null);
      setIsAllowlisted(null);
      setDeletionStatus('active');
      setScheduledDeletionAt(null);

      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Unexpected error during immediate purge') };
    }
  };

  const deleteAccount = purgeAccountImmediately;

  const clearError = () => setError(null);

  const needsPasswordSetup = hasPassword === false;

  // Determine user display name: check display_name, full_name, name, or email prefix
  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split('@')[0] : 'User');

  // User needs to confirm their preferred name on first login if not set yet
  const needsNameSetup = Boolean(
    user &&
    !user.user_metadata?.has_confirmed_name &&
    typeof window !== 'undefined' &&
    !localStorage.getItem(`envello_dismissed_name_prompt_${user.id}`)
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
        needsNameSetup,
        displayName,
        updateProfileName,
        updateUserEmail,
        signInWithEmail,
        signUpWithEmail,
        sendMagicLink,
        resendVerificationEmail,
        resetPasswordForEmail,
        updatePassword,
        signInWithGoogle,
        signOut,
        deletionStatus,
        scheduledDeletionAt,
        requestAccountDeletion,
        cancelAccountDeletion,
        deleteAccount,
        purgeAccountImmediately,
        refreshAllowlistStatus,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
