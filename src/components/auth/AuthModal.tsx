import React, { useState } from 'react';
import { Mail, Lock, Sparkles, X, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'signIn' | 'signUp' | 'magicLink';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithEmail, signUpWithEmail, sendMagicLink, error, clearError } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
    setValidationError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    if (mode !== 'magicLink') {
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
        }
      } else if (mode === 'signUp') {
        const { error: err } = await signUpWithEmail(cleanEmail, password);
        if (!err) {
          setSuccessMessage('Account created! Please check your email to confirm registration.');
        }
      } else if (mode === 'magicLink') {
        const { error: err } = await sendMagicLink(cleanEmail);
        if (!err) {
          setSuccessMessage('Magic link sent! Check your inbox to sign in instantly.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="max-w-md w-full glass-card rounded-2xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-2xl relative modal-panel">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center space-x-2 text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Envello Authentication</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {mode === 'signIn' && 'Sign in to your ledger'}
            {mode === 'signUp' && 'Create your owner account'}
            {mode === 'magicLink' && 'Sign in with Magic Link'}
          </h2>
          <p className="text-xs text-neutral-400">
            {mode === 'signIn' && 'Enter your credentials to access your budgeting workspace.'}
            {mode === 'signUp' && 'Register your email address for private beta access.'}
            {mode === 'magicLink' && 'We will send a passwordless login link to your inbox.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-neutral-900 border border-white/5 text-xs font-medium">
          <button
            type="button"
            onClick={() => handleModeSwitch('signIn')}
            className={`py-1.5 rounded-lg transition ${
              mode === 'signIn' ? 'bg-sky-500 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('signUp')}
            className={`py-1.5 rounded-lg transition ${
              mode === 'signUp' ? 'bg-sky-500 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('magicLink')}
            className={`py-1.5 rounded-lg transition ${
              mode === 'magicLink' ? 'bg-sky-500 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Magic Link
          </button>
        </div>

        {/* Notifications / Errors */}
        {(error || validationError) && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error || validationError}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300 flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-neutral-400" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {mode !== 'magicLink' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                <span>Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          )}

          {mode === 'signUp' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                <span>Confirm Password</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium transition shadow-lg shadow-sky-500/25"
          >
            <span>{isSubmitting ? 'Processing...' : mode === 'signIn' ? 'Sign In' : mode === 'signUp' ? 'Create Account' : 'Send Magic Link'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-[#121217] px-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wider absolute">
            or
          </span>
        </div>

        {/* Google OAuth Option (Prepared for future activation) */}
        <div className="space-y-2">
          <button
            type="button"
            disabled
            className="w-full flex items-center justify-center space-x-2.5 py-2.5 px-4 rounded-xl bg-neutral-900 border border-white/10 text-neutral-400 text-xs font-medium opacity-60 cursor-not-allowed transition"
            title="Google OAuth can be enabled once Google Cloud Client ID is configured."
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-400 font-normal">
              Coming Soon
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
