import React, { useState, useEffect } from 'react';
import { User, Sparkles, Loader2, AlertCircle, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

interface SetNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstTime?: boolean;
}

export const SetNameModal: React.FC<SetNameModalProps> = ({
  isOpen,
  onClose,
  isFirstTime = false,
}) => {
  const { user, updateProfileName } = useAuth();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize name:
  // If user signed in with Google, prefill with full_name or name from metadata
  // If not Google, keep empty (or existing custom display_name if in edit mode)
  useEffect(() => {
    if (!isOpen) return;

    const googleName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      '';

    const existingCustomName = user?.user_metadata?.display_name || '';

    if (existingCustomName) {
      setName(existingCustomName);
    } else if (googleName) {
      setName(googleName);
    } else {
      setName('');
    }

    setError(null);
    setSuccess(false);
  }, [isOpen, user]);

  const handleDismiss = () => {
    if (user?.id && isFirstTime) {
      localStorage.setItem(`envello_dismissed_name_prompt_${user.id}`, 'true');
    }
    onClose();
  };

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, handleDismiss);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();

    if (!cleanName) {
      setError('Please enter a name or nickname so we know what to call you.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const { error: err } = await updateProfileName(cleanName);
      if (err) {
        setError(err.message || 'Failed to update name.');
      } else {
        if (user?.id) {
          localStorage.removeItem(`envello_dismissed_name_prompt_${user.id}`);
        }
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error saving name.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div
        onClick={handleBackdropClick}
        onTouchMove={handleBackdropTouchMove}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md sm:backdrop-blur-lg modal-overlay animate-fade-in"
      >
        <div className="max-w-md w-full bg-neutral-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-4 sm:space-y-6 border border-white/15 shadow-2xl relative modal-panel max-h-[90vh] sm:max-h-[88vh] overflow-y-auto">
        
        {/* Subtle decorative glow header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />

        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center active:scale-95 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 text-left">
          <div className="inline-flex items-center space-x-2 text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isFirstTime ? 'Welcome to Envello' : 'Profile Settings'}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {isFirstTime ? 'What should we call you?' : 'Edit Display Name'}
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {isFirstTime
              ? 'Tell us your preferred name or nickname so we can personalize your personal finance dashboard.'
              : 'Update how your name appears across your workspace and reports.'}
          </p>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Name updated successfully!</span>
          </div>
        )}

        {/* Name Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-neutral-300">
              Your Name / Nickname
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting || success}
                placeholder="e.g. Alex, Priya, Jordan"
                autoFocus
                maxLength={40}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder-neutral-500 text-base sm:text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition disabled:opacity-50"
              />
            </div>
            {isFirstTime && (
              <p className="text-[11px] text-neutral-500">
                You can change this anytime from your account menu in the top right.
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center space-x-3">
            {isFirstTime && (
              <button
                type="button"
                onClick={handleDismiss}
                disabled={isSubmitting || success}
                className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold border border-white/10 transition active:scale-95 disabled:opacity-50 min-h-[44px]"
              >
                Skip for Now
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || success || !name.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 text-xs sm:text-sm font-semibold shadow-md shadow-sky-500/25 transition active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <span>{isFirstTime ? 'Save & Continue' : 'Update Name'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  </ModalPortal>
);
};
