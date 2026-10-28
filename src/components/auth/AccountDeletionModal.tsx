import React, { useState } from 'react';
import {
  ShieldAlert,
  Trash2,
  X,
  Download,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Calendar,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface AccountDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExport?: () => void;
}

export const AccountDeletionModal: React.FC<AccountDeletionModalProps> = ({
  isOpen,
  onClose,
  onOpenExport,
}) => {
  const {
    user,
    deletionStatus,
    scheduledDeletionAt,
    requestAccountDeletion,
    cancelAccountDeletion,
    purgeAccountImmediately,
  } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'schedule' | 'immediate'>('schedule');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const userEmail = user?.email || '';
  const isConfirmed = confirmationInput.trim().toLowerCase() === userEmail.toLowerCase();
  const isPendingDeletion = deletionStatus === 'pending_deletion';

  // Format scheduled deletion date for display
  const formattedScheduledDate = scheduledDeletionAt
    ? new Date(scheduledDeletionAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  // Calculate days remaining if pending deletion
  const daysRemaining = scheduledDeletionAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(scheduledDeletionAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : 30;

  const handleDismiss = () => {
    if (isSubmitting) return;
    setConfirmationInput('');
    setErrorMessage(null);
    setActionSuccessMessage(null);
    onClose();
  };

  const { handleBackdropClick } = useModalDismiss(isOpen, handleDismiss);

  // 1. Handle Requesting 30-Day Closure
  const handleScheduleDeletion = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await requestAccountDeletion();
      if (error) {
        setErrorMessage(error.message || 'Failed to schedule account closure.');
      } else {
        setActionSuccessMessage(
          `Your 30-day account closure has been initiated. Permanent deletion is scheduled for ${formattedScheduledDate}.`
        );
        showToast('30-day deletion grace period initiated.', 'info');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unexpected error scheduling closure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Handle Cancelling Deletion
  const handleCancelDeletion = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await cancelAccountDeletion();
      if (error) {
        setErrorMessage(error.message || 'Failed to cancel account deletion.');
      } else {
        setActionSuccessMessage('Account deletion cancelled! Your workspace remains active and secure.');
        showToast('Account restored to active status.', 'success');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unexpected error cancelling deletion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Handle Immediate Permanent Purge
  const handleImmediatePurge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await purgeAccountImmediately();
      if (error) {
        setErrorMessage(error.message || 'Failed to purge account.');
        setIsSubmitting(false);
      } else {
        setActionSuccessMessage('Your account and all records have been immediately purged.');
        showToast('Account and all financial data permanently erased.', 'info');
        setTimeout(() => {
          handleDismiss();
        }, 2200);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unexpected error during purge.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md sm:backdrop-blur-lg modal-overlay animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deletion-modal-title"
    >
      <div className="max-w-lg w-full bg-neutral-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-5 border border-white/15 shadow-2xl relative modal-panel max-h-[90vh] sm:max-h-[88vh] overflow-y-auto">
        {/* Decorative alert stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 rounded-t-2xl" />

        {/* Close Button */}
        {!isSubmitting && (
          <button
            onClick={handleDismiss}
            aria-label="Close dialog"
            className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="space-y-2 text-left">
          <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Account Closure &amp; Privacy Rights</span>
          </div>

          <h2 id="deletion-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {isPendingDeletion ? 'Account Scheduled for Closure' : 'Account Deletion & 30-Day Grace Period'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            {isPendingDeletion
              ? `Your account is currently in a 30-day grace period with ${daysRemaining} days remaining.`
              : 'Envello enforces a 30-day grace period on account deletion to protect you against accidental loss of financial history.'}
          </p>
        </div>

        {/* Success Feedback Callout */}
        {actionSuccessMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start space-x-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-white block">Status Updated</span>
              <p className="text-neutral-300 leading-relaxed">{actionSuccessMessage}</p>
            </div>
          </div>
        )}

        {/* Error Feedback Callout */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* =========================================================================
           STATE 1: ACCOUNT IS ALREADY PENDING DELETION (GRACE PERIOD ACTIVE)
           ========================================================================= */}
        {isPendingDeletion ? (
          <div className="space-y-4">
            {/* Grace Period Status Card */}
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock className="w-4 h-4" />
                  <span>30-Day Grace Period Active</span>
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {daysRemaining} Days Left
                </span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Permanent database purge is scheduled for{' '}
                <strong className="text-white">{formattedScheduledDate}</strong>. All your liquid accounts, envelope allocations, and transactions are currently intact.
              </p>
            </div>

            {/* Action 1: Cancel Deletion & Restore */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCancelDeletion}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all duration-200 active:scale-95 flex items-center justify-center space-x-2 min-h-[44px]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>Cancel Deletion &amp; Keep Account</span>
              </button>
              <p className="text-[11px] text-neutral-400 text-center">
                Restores your account to full active status immediately.
              </p>
            </div>

            {/* Action 2: Purge Immediately Toggle */}
            <div className="pt-3 border-t border-white/5 space-y-3">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'immediate' ? 'schedule' : 'immediate')}
                className="text-xs text-rose-400 hover:text-rose-300 underline font-medium block mx-auto transition"
              >
                {activeTab === 'immediate'
                  ? 'Hide Immediate Purge Option'
                  : 'Prefer to purge everything immediately without waiting?'}
              </button>

              {activeTab === 'immediate' && (
                <form onSubmit={handleImmediatePurge} className="p-4 rounded-xl bg-neutral-950 border border-rose-500/20 space-y-3 animate-fade-in text-left">
                  <p className="text-xs text-rose-300 font-medium">
                    To bypass the remaining {daysRemaining} days and purge all records right now, type your email address{' '}
                    <span className="font-mono text-white select-all bg-white/5 px-1 py-0.5 rounded border border-white/10">
                      {userEmail}
                    </span>:
                  </p>
                  <input
                    type="text"
                    autoComplete="off"
                    disabled={isSubmitting}
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    placeholder={userEmail}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-base sm:text-sm text-white placeholder-neutral-600 font-mono transition focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={!isConfirmed || isSubmitting}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center space-x-2 min-h-[44px] ${
                      isConfirmed && !isSubmitting
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Purge Immediately (Irreversible)</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* =========================================================================
             STATE 2: ACCOUNT IS ACTIVE (OFFER 30-DAY SCHEDULE OR IMMEDIATE PURGE)
             ========================================================================= */
          <div className="space-y-4">
            {/* Impact Details Card */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-white/5 space-y-2.5 text-xs text-neutral-300">
              <div className="text-rose-400 font-semibold flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Scope of permanent deletion:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-neutral-400 text-[11px] sm:text-xs">
                <li>All checking, savings, and cash accounts and balances.</li>
                <li>All envelopes, rollover policies, and historical period allocations.</li>
                <li>Full transaction journal records and notes.</li>
                <li>Credit card statements, debt tracking horizons, and fixed deposits.</li>
                <li>Authentication credentials and user profile.</li>
              </ul>
            </div>

            {/* Optional Export Callout */}
            {onOpenExport && (
              <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-sky-300 block">Download your data first</span>
                  <span className="text-neutral-400 text-[11px] block">
                    Save a full CSV or JSON export of your financial records before initiating closure.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleDismiss();
                    onOpenExport();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium transition active:scale-95 flex items-center space-x-1.5 flex-shrink-0 min-h-[38px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Data</span>
                </button>
              </div>
            )}

            {/* Segmented Mode Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-950 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition min-h-[40px] flex items-center justify-center space-x-1.5 ${
                  activeTab === 'schedule'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>30-Day Closure (Recommended)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('immediate')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition min-h-[40px] flex items-center justify-center space-x-1.5 ${
                  activeTab === 'immediate'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Immediate Wipe</span>
              </button>
            </div>

            {/* Tab 1 Content: 30-Day Scheduled Closure */}
            {activeTab === 'schedule' ? (
              <div className="space-y-3 p-4 rounded-2xl bg-neutral-950/60 border border-white/5 text-left">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">How 30-Day Closure Works:</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Your account will enter a pending deletion status until <strong className="text-white">{formattedScheduledDate}</strong>.
                    You can log in at any time during these 30 days to cancel this request and restore your data.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleScheduleDeletion}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-neutral-950 text-xs sm:text-sm font-bold transition-all duration-200 active:scale-95 flex items-center justify-center space-x-2 min-h-[44px] shadow-lg shadow-amber-600/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  <span>Schedule Account Closure (30 Days)</span>
                </button>
              </div>
            ) : (
              /* Tab 2 Content: Immediate Permanent Purge */
              <form onSubmit={handleImmediatePurge} className="space-y-3 p-4 rounded-2xl bg-neutral-950/60 border border-rose-500/20 text-left">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Immediate Irreversible Purge:</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    This bypasses the 30-day grace period. All records will be wiped from the database immediately.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label htmlFor="confirm-email-purge" className="block text-xs font-medium text-neutral-300">
                    To confirm immediate purge, type your email{' '}
                    <span className="font-mono text-white select-all bg-white/5 px-1 py-0.5 rounded border border-white/10">
                      {userEmail}
                    </span>:
                  </label>
                  <input
                    id="confirm-email-purge"
                    type="text"
                    autoComplete="off"
                    disabled={isSubmitting}
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    placeholder={userEmail}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-base sm:text-sm text-white placeholder-neutral-600 font-mono transition focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!isConfirmed || isSubmitting}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-95 flex items-center justify-center space-x-2 min-h-[44px] ${
                    isConfirmed && !isSubmitting
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-white" />
                  )}
                  <span>Permanently Purge Immediately</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Footer Dismiss Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs sm:text-sm font-semibold border border-white/5 transition min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
