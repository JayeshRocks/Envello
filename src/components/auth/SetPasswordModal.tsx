import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface SetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetPasswordModal: React.FC<SetPasswordModalProps> = ({ isOpen, onClose }) => {
  const { updatePassword, user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(`envello_dismissed_password_prompt_${user.id}`, 'true');
    }
    onClose();
  };

  const { handleBackdropClick } = useModalDismiss(isOpen, handleDismiss);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: err } = await updatePassword(password);
      if (err) {
        setError(err.message || 'Failed to set password.');
      } else {
        if (user?.id) {
          localStorage.removeItem(`envello_dismissed_password_prompt_${user.id}`);
        }
        setSuccess('Password created successfully! You can now log in using your password anytime.');
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error saving password.');
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
          onClick={handleDismiss}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 sm:p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[38px] min-w-[38px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 text-left">
          <div className="inline-flex items-center space-x-2 text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>First-Time Account Setup</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Create Account Password</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            You signed in using{' '}
            <span className="text-neutral-200 font-medium">
              {user?.app_metadata?.provider === 'google' || user?.app_metadata?.providers?.includes('google')
                ? 'Google'
                : 'a Magic Link'}
            </span>
            . Create a password for <span className="font-mono text-sky-300">{user?.email}</span> so you can also log in directly with your email and password on any browser.
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start space-x-2.5 animate-slide-down">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-start space-x-2.5 animate-slide-down">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span className="leading-relaxed">{success}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-neutral-300 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-neutral-400" />
              <span>New Password</span>
            </label>
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

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-neutral-300 flex items-center space-x-1.5">
              <KeyRound className="w-3.5 h-3.5 text-neutral-400" />
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-neutral-950 font-bold text-sm shadow-xl shadow-sky-500/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                <span>Saving Password...</span>
              </>
            ) : (
              <span>Save Account Password</span>
            )}
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-neutral-500 hover:text-neutral-400 transition underline"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
