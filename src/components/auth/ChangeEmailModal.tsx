import React, { useState } from 'react';
import { Mail, AlertCircle, CheckCircle2, Loader2, X, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUserEmail } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDismiss = () => {
    setNewEmail('');
    setConfirmStep(false);
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, handleDismiss);

  if (!isOpen) return null;

  const currentEmail = user?.email || '';

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (clean === currentEmail.toLowerCase()) {
      setError('The new email address cannot be the same as your current email.');
      return;
    }

    setConfirmStep(true);
  };

  const handleExecuteChange = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const { error: err } = await updateUserEmail(newEmail);
      if (err) {
        setError(err.message || 'Failed to request email change.');
      } else {
        setSuccessMessage(
          `A confirmation link has been sent to ${newEmail}. Please check your inbox and click the link to finalize the change.`
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error updating email.');
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
        
        {/* Decorative glow header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-sky-500 to-indigo-500" />

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
            <Mail className="w-3.5 h-3.5" />
            <span>Email Preferences</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Change Account Email</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Update the primary email address used to sign in to your Envello workspace.
          </p>
        </div>

        {/* Current Email Display */}
        <div className="p-3 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-between">
          <span className="text-xs text-neutral-400">Current Email:</span>
          <span className="text-xs font-mono font-medium text-neutral-200">{currentEmail}</span>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successMessage ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-2 animate-fade-in">
              <div className="flex items-center space-x-2 font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verification Link Dispatched</span>
              </div>
              <p className="leading-relaxed text-neutral-300">{successMessage}</p>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold border border-white/10 transition"
            >
              Done
            </button>
          </div>
        ) : !confirmStep ? (
          /* Step 1: Input new email */
          <form onSubmit={handleProceedToConfirm} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-300">
                New Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="your-new-email@example.com"
                  autoFocus
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder-neutral-500 text-base sm:text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Supabase will send a confirmation link via Resend. The change won't take effect until you verify the new email.
              </p>
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold border border-white/10 transition active:scale-95 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newEmail.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 text-xs sm:text-sm font-semibold shadow-md shadow-sky-500/25 transition active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 min-h-[44px]"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Confirmation Dialog */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-semibold text-amber-400">
                <ShieldAlert className="w-4 h-4" />
                <span>Confirm Email Update</span>
              </div>
              <p className="leading-relaxed text-neutral-300">
                Are you sure you want to change your workspace email from{' '}
                <span className="font-mono font-medium text-white">{currentEmail}</span> to{' '}
                <span className="font-mono font-medium text-white">{newEmail}</span>?
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setConfirmStep(false)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold border border-white/10 transition active:scale-95 min-h-[44px]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleExecuteChange}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 text-xs sm:text-sm font-semibold shadow-md shadow-sky-500/25 transition active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 min-h-[44px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Verification Link</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </ModalPortal>
);
};
