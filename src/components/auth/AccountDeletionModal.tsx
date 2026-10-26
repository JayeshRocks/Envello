import React, { useState } from 'react';
import {
  ShieldAlert,
  Trash2,
  X,
  Download,
  AlertTriangle,
  Loader2,
  CheckCircle2,
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
  const { user, deleteAccount } = useAuth();
  const { showToast } = useToast();

  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionComplete, setDeletionComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userEmail = user?.email || '';
  const isConfirmed = confirmationInput.trim().toLowerCase() === userEmail.toLowerCase();

  const handleDismiss = () => {
    if (isDeleting) return; // Prevent closing mid-purge
    setConfirmationInput('');
    setErrorMessage(null);
    setDeletionComplete(false);
    onClose();
  };

  const { handleBackdropClick } = useModalDismiss(isOpen, handleDismiss);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const { error } = await deleteAccount();
      if (error) {
        setErrorMessage(error.message || 'Failed to delete account. Please try again.');
        setIsDeleting(false);
      } else {
        setDeletionComplete(true);
        showToast('Your account and all financial data have been permanently purged.', 'info');
        setTimeout(() => {
          handleDismiss();
        }, 2500);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unexpected error during account deletion.');
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deletion-modal-title"
    >
      <div className="max-w-lg w-full bg-neutral-900 rounded-t-3xl sm:rounded-2xl p-5 sm:p-8 space-y-5 border-t sm:border border-white/10 shadow-2xl relative modal-panel max-h-[94vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Mobile drag handle */}
        <div className="w-12 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-2 sm:hidden flex-shrink-0" />

        {/* Decorative alert stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 rounded-t-2xl" />

        {/* Close Button */}
        {!isDeleting && (
          <button
            onClick={handleDismiss}
            aria-label="Close dialog"
            className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="space-y-2 text-left">
          <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Permanent Account Deletion</span>
          </div>

          <h2 id="deletion-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Delete Account &amp; Financial Ledger
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            This action is permanent and immediate. All your records will be irrevocably purged from the database.
          </p>
        </div>

        {deletionComplete ? (
          /* =========================================================================
             SUCCESS / FAREWELL STATE
             ========================================================================= */
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Account Successfully Purged</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              All personal financial data, envelope ledgers, and authentication tokens have been permanently wiped from Envello under cryptographic row-level security.
            </p>
            <div className="text-[11px] text-neutral-500 pt-1">
              Redirecting you to the home page...
            </div>
          </div>
        ) : (
          /* =========================================================================
             DELETION CONFIRMATION FORM
             ========================================================================= */
          <form onSubmit={handleDelete} className="space-y-4">
            {/* Impact Details Card */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-white/5 space-y-2.5 text-xs text-neutral-300">
              <div className="text-rose-400 font-semibold flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>What will be permanently deleted:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-neutral-400 text-[11px] sm:text-xs">
                <li>All checking, savings, and cash accounts and balances.</li>
                <li>All envelopes, rollover policies, and historical period allocations.</li>
                <li>Full transaction journal records, audit timestamps, and payee notes.</li>
                <li>Credit card statements, debt tracking horizons, and fixed deposits.</li>
                <li>Authentication credentials, linked OAuth identities, and user profile.</li>
              </ul>
            </div>

            {/* Optional Export Callout */}
            {onOpenExport && (
              <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-sky-300 block">Want to save your data first?</span>
                  <span className="text-neutral-400 text-[11px] block">
                    Download a full CSV or JSON export of your financial records before deleting.
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

            {/* Error Message if Deletion Failed */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Typing Safeguard Input */}
            <div className="space-y-1.5 pt-1 text-left">
              <label htmlFor="delete-confirmation-input" className="block text-xs font-medium text-neutral-300">
                To confirm, type your email address{' '}
                <span className="font-mono text-white select-all bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                  {userEmail}
                </span>{' '}
                below:
              </label>
              <input
                id="delete-confirmation-input"
                type="text"
                autoComplete="off"
                disabled={isDeleting}
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={userEmail}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-base sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 font-mono transition"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDismiss}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs sm:text-sm font-semibold transition active:scale-95 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isConfirmed || isDeleting}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-95 flex items-center justify-center space-x-2 min-h-[44px] ${
                  isConfirmed && !isDeleting
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5'
                }`}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Purging Account &amp; Ledger...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Permanently Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
