import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  Sparkles,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  UserPlus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

type AuthMode = 'signIn' | 'signUp' | 'magicLink' | 'resetPassword';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onOpenPrivacy = () => {},
  onOpenTerms = () => {},
}) => {
  const {
    signInWithEmail,
    signUpWithEmail,
    sendMagicLink,
    resendVerificationEmail,
    resetPasswordForEmail,
    updatePassword,
    isPasswordRecovery,
    setIsPasswordRecovery,
    signInWithGoogle,
    error,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [showOwnerTip, setShowOwnerTip] = useState(false);
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);
  const [accountExistsFromMagicLink, setAccountExistsFromMagicLink] = useState(false);

  const { handleBackdropClick } = useModalDismiss(isOpen, onClose);

  // If Supabase fires a password recovery event (e.g. user clicked password reset link in email)
  useEffect(() => {
    if (isPasswordRecovery) {
      setMode('resetPassword');
      clearError();
      setValidationError(null);
    }
  }, [isPasswordRecovery, clearError]);

  if (!isOpen) return null;

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
    setValidationError(null);
    setSuccessMessage(null);
    setResendSuccess(null);
    setIsUnconfirmed(false);
    setAccountExistsFromMagicLink(false);
  };

  const handleGoogleSignIn = async () => {
    clearError();
    setValidationError(null);
    setIsGoogleSubmitting(true);
    try {
      const { error: err } = await signInWithGoogle();
      if (err) {
        setValidationError(err.message || 'Google authentication failed.');
      }
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : 'Google authentication failed.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const formatAuthError = (msg?: string | null): string => {
    if (!msg) return 'An error occurred during authentication.';
    if (msg.toLowerCase().includes('rate limit')) {
      return 'Email rate limit exceeded by Supabase (~3-4 emails/hour on free tier). Tip: Turn off "Confirm email" in Supabase Dashboard → Authentication → Providers → Email to sign up instantly without needing email verification!';
    }
    return msg;
  };

  const handleResendVerification = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setValidationError('Please enter a valid email address first.');
      return;
    }

    setIsResending(true);
    setResendSuccess(null);
    clearError();
    try {
      const { error: resendErr } = await resendVerificationEmail(cleanEmail);
      if (resendErr) {
        setValidationError(formatAuthError(resendErr.message));
      } else {
        setResendSuccess(`Verification email sent to ${cleanEmail}! Please check your Inbox and Spam/Junk folder.`);
      }
    } catch (err: unknown) {
      setValidationError(formatAuthError(err instanceof Error ? err.message : null));
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);
    setSuccessMessage(null);
    setResendSuccess(null);
    setAccountExistsFromMagicLink(false);

    const cleanEmail = email.trim();

    // If currently fulfilling a Password Recovery flow (updating password directly)
    if (isPasswordRecovery) {
      if (!password || password.length < 6) {
        setValidationError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match.');
        return;
      }
      setIsSubmitting(true);
      try {
        const { error: updateErr } = await updatePassword(password);
        if (updateErr) {
          setValidationError(updateErr.message);
        } else {
          setIsPasswordRecovery(false);
          setSuccessMessage('Password saved successfully! You are now logged in.');
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    if (mode === 'signIn' || mode === 'signUp') {
      if (!password || password.length < 6) {
        setValidationError('Password must be at least 6 characters.');
        return;
      }
    }

    if (mode === 'signUp') {
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signIn') {
        const { error: err } = await signInWithEmail(cleanEmail, password);
        if (!err) {
          onClose();
        } else if (err.message && err.message.toLowerCase().includes('email not confirmed')) {
          setIsUnconfirmed(true);
          setValidationError('Your email has not been confirmed yet.');
        } else if (err.message && err.message.toLowerCase().includes('invalid login credentials')) {
          setValidationError(
            'Invalid login credentials. If you originally logged in with a Magic Link, your account does not have a password yet — click "Set or Reset Password" below.'
          );
        }
      } else if (mode === 'signUp') {
        const result = await signUpWithEmail(cleanEmail, password);
        if (result.error) {
          setValidationError(formatAuthError(result.error.message));
        } else if (result.alreadyRegistered) {
          // Supabase anti-enumeration detection: user already exists (likely created via Magic Link or Google)
          setAccountExistsFromMagicLink(true);
          setValidationError(
            `An account for ${cleanEmail} already exists (likely created originally with Magic Link or Google).`
          );
        } else if (result.session) {
          // Direct session granted (auto-confirm enabled on Supabase)
          onClose();
        } else {
          // Genuine new signup awaiting email verification
          setIsUnconfirmed(true);
          setSuccessMessage(`Account created for ${cleanEmail}! Supabase sent a verification link.`);
        }
      } else if (mode === 'magicLink') {
        const { error: err } = await sendMagicLink(cleanEmail);
        if (err) {
          setValidationError(formatAuthError(err.message));
        } else {
          setSuccessMessage('Magic link sent! Check your inbox to sign in instantly.');
        }
      } else if (mode === 'resetPassword') {
        const { error: err } = await resetPasswordForEmail(cleanEmail);
        if (err) {
          setValidationError(formatAuthError(err.message));
        } else {
          setSuccessMessage(
            `Password setup link sent to ${cleanEmail}! Click the link in your email to choose your password.`
          );
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="max-w-md w-full glass-card rounded-t-3xl sm:rounded-2xl p-5 sm:p-8 space-y-4 sm:space-y-6 border-t sm:border border-white/10 shadow-2xl relative modal-panel max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-2 sm:hidden flex-shrink-0" />
        {/* Subtle decorative glow header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500" />

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 sm:p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[38px] min-w-[38px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 text-left">
          <div className="inline-flex items-center space-x-2 text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            {isPasswordRecovery || mode === 'resetPassword' ? (
              <KeyRound className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>
              {isPasswordRecovery
                ? 'Password Recovery'
                : mode === 'resetPassword'
                ? 'Password Management'
                : 'Envello Authentication'}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {isPasswordRecovery && 'Create Your New Password'}
            {!isPasswordRecovery && mode === 'signIn' && 'Sign in to your ledger'}
            {!isPasswordRecovery && mode === 'signUp' && 'Create your owner account'}
            {!isPasswordRecovery && mode === 'magicLink' && 'Sign in with Magic Link'}
            {!isPasswordRecovery && mode === 'resetPassword' && 'Set or Reset Password'}
          </h2>
          <p className="text-xs text-neutral-400">
            {isPasswordRecovery && 'Enter and confirm your new account password below.'}
            {!isPasswordRecovery && mode === 'signIn' && 'Enter your credentials to access your private budgeting workspace.'}
            {!isPasswordRecovery && mode === 'signUp' && 'Register your email address for private beta access.'}
            {!isPasswordRecovery && mode === 'magicLink' && 'We will send a passwordless login link to your inbox.'}
            {!isPasswordRecovery &&
              mode === 'resetPassword' &&
              'Receive a secure link to create or update your account password.'}
          </p>
        </div>

        {/* Primary OAuth Action: Google Sign In (hidden during password recovery or reset) */}
        {!isPasswordRecovery && mode !== 'resetPassword' && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting || isSubmitting}
              className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-white text-xs sm:text-sm font-semibold border border-white/10 shadow-sm transition-all duration-200 active:scale-[0.98] hover:border-white/20 disabled:opacity-50"
            >
              {isGoogleSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              ) : (
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isGoogleSubmitting ? 'Connecting with Google...' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#121217] px-3 text-[11px] font-medium text-neutral-400 uppercase tracking-wider absolute">
                or with email
              </span>
            </div>
          </>
        )}

        {/* Fluid Mode Switcher (hidden during password recovery) */}
        {!isPasswordRecovery && (
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-neutral-900 border border-white/5 text-xs font-medium">
            <button
              type="button"
              onClick={() => handleModeSwitch('signIn')}
              className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all duration-200 active:scale-95 ${
                mode === 'signIn'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('signUp')}
              className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all duration-200 active:scale-95 ${
                mode === 'signUp'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('magicLink')}
              className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all duration-200 active:scale-95 ${
                mode === 'magicLink'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Magic Link</span>
            </button>
          </div>
        )}

        {/* Notifications / Validation alerts */}
        {(error || validationError) && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start space-x-2.5 animate-slide-down">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed">{error || validationError}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-start space-x-2.5 animate-slide-down">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {resendSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-start space-x-2.5 animate-slide-down">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span className="leading-relaxed">{resendSuccess}</span>
          </div>
        )}

        {/* Helper when user already exists via Magic Link */}
        {accountExistsFromMagicLink && (
          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-xs space-y-2.5 animate-slide-down text-left">
            <div className="flex items-start space-x-2 text-sky-200">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-sky-400" />
              <div className="space-y-1">
                <p className="font-semibold text-sky-300">How to add a password to this account:</p>
                <p className="text-[11px] text-sky-200/90 leading-relaxed">
                  Because this account was created with a Magic Link, you don&apos;t have a password set yet. You can set one via email link or sign in with Magic Link:
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleModeSwitch('resetPassword')}
                className="py-2 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 text-xs font-semibold border border-sky-500/30 transition text-center"
              >
                Set Account Password
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('magicLink')}
                className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-white/10 transition text-center"
              >
                Sign in with Magic Link
              </button>
            </div>
          </div>
        )}

        {/* Verification assistance card for unconfirmed / new signups */}
        {(isUnconfirmed || (error && error.toLowerCase().includes('email not confirmed'))) && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-2.5 animate-slide-down">
            <div className="flex items-start space-x-2 text-amber-200">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
              <div className="space-y-1 text-left">
                <p className="font-semibold text-amber-300">Didn&apos;t receive the confirmation email?</p>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Supabase emails may land in your <strong>Spam/Junk</strong> or <strong>Promotions</strong> folder.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-semibold border border-amber-500/30 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                <span>{isResending ? 'Sending email...' : 'Resend Verification Email'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOwnerTip(!showOwnerTip)}
                className="text-[11px] text-amber-400/90 hover:text-amber-300 underline flex items-center space-x-1"
              >
                <span>Owner Setup Tip</span>
                {showOwnerTip ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {showOwnerTip && (
              <div className="pt-2 border-t border-amber-500/20 text-[11px] text-neutral-300 space-y-1.5 leading-relaxed bg-black/40 p-2.5 rounded-lg text-left">
                <p className="font-semibold text-white">🔧 Why isn&apos;t the email arriving?</p>
                <p>
                  Supabase&apos;s free tier uses a shared sender with strict hourly rate limits (~3/hr) and often gets spam-filtered by Google.
                </p>
                <p className="font-medium text-amber-300">To fix this in 10 seconds in Supabase:</p>
                <ol className="list-decimal list-inside space-y-1 text-neutral-400 pl-1">
                  <li>
                    Go to <strong>Authentication &rarr; Providers &rarr; Email</strong>
                  </li>
                  <li>
                    Toggle off <strong>&quot;Confirm email&quot;</strong> &rarr; Save (allows instant login)
                  </li>
                  <li>
                    Or go to <strong>Authentication &rarr; Users</strong> &rarr; click <strong>...</strong> on the user &rarr; <strong>&quot;Confirm user&quot;</strong>
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input (hidden during password recovery when setting new password) */}
          {!isPasswordRecovery && (
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-medium text-neutral-300 flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-2 focus:ring-sky-500/40"
              />
            </div>
          )}

          {/* Password input */}
          {(isPasswordRecovery || (mode !== 'magicLink' && mode !== 'resetPassword')) && (
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-300 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{isPasswordRecovery ? 'New Password' : 'Password'}</span>
                </label>
                {!isPasswordRecovery && mode === 'signIn' && (
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('resetPassword')}
                    className="text-[11px] text-sky-400 hover:text-sky-300 transition"
                  >
                    Forgot or need to set password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-2 focus:ring-sky-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password input (Sign Up mode or Password Recovery) */}
          {(mode === 'signUp' || isPasswordRecovery) && (
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-medium text-neutral-300 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                <span>Confirm Password</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-2 focus:ring-sky-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isGoogleSubmitting}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-neutral-950 font-bold text-sm shadow-xl shadow-sky-500/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                <span>
                  {isPasswordRecovery
                    ? 'Saving password...'
                    : mode === 'signIn'
                    ? 'Signing in...'
                    : mode === 'signUp'
                    ? 'Creating account...'
                    : mode === 'resetPassword'
                    ? 'Sending setup link...'
                    : 'Sending link...'}
                </span>
              </>
            ) : (
              <>
                <span>
                  {isPasswordRecovery
                    ? 'Save New Password'
                    : mode === 'signIn'
                    ? 'Sign In to Workspace'
                    : mode === 'signUp'
                    ? 'Create Owner Account'
                    : mode === 'resetPassword'
                    ? 'Send Password Setup Link'
                    : 'Send Passwordless Link'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Prompt */}
        {!isPasswordRecovery && (
          <div className="pt-2 text-center text-xs text-neutral-400">
            {mode === 'signIn' ? (
              <span>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signUp')}
                  className="text-sky-400 hover:text-sky-300 font-semibold transition"
                >
                  Sign up for beta
                </button>
              </span>
            ) : mode === 'signUp' ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signIn')}
                  className="text-sky-400 hover:text-sky-300 font-semibold transition"
                >
                  Sign in
                </button>
              </span>
            ) : mode === 'resetPassword' ? (
              <span>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signIn')}
                  className="text-sky-400 hover:text-sky-300 font-semibold transition"
                >
                  Back to Sign In
                </button>
              </span>
            ) : (
              <span>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signIn')}
                  className="text-sky-400 hover:text-sky-300 font-semibold transition"
                >
                  Sign in with password
                </button>
              </span>
            )}
          </div>
        )}

        {/* Regulatory & Terms Agreement Notice */}
        <div className="pt-2 border-t border-white/5 text-center">
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            By continuing, you agree to Envello&apos;s{' '}
            <button
              type="button"
              onClick={onOpenTerms}
              className="text-neutral-400 hover:text-white underline decoration-white/30 hover:decoration-white font-medium transition"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="text-neutral-400 hover:text-white underline decoration-white/30 hover:decoration-white font-medium transition"
            >
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
