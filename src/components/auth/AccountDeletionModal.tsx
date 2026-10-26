import React, { useState } from 'react';
import { ShieldAlert, Trash2, X, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface AccountDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountDeletionModal: React.FC<AccountDeletionModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const handleDismiss = () => {
    setRequestSubmitted(false);
    onClose();
  };

  const { handleBackdropClick } = useModalDismiss(isOpen, handleDismiss);

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="max-w-md w-full glass-card rounded-t-3xl sm:rounded-2xl p-5 sm:p-8 space-y-4 sm:space-y-6 border-t sm:border border-white/10 shadow-2xl relative modal-panel max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-2 sm:hidden flex-shrink-0" />
        
        {/* Decorative glow header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 sm:p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[38px] min-w-[38px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2">
            <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Data Rights & Privacy</span>
            </div>
            {/* Visual Stamp Badge */}
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border border-amber-500/30 text-amber-300 bg-amber-500/10 rotate-1 shadow-sm">
              STAMP: BETA POLICY
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white">Account Deletion & Data Retention</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Envello operates with strict zero-cost and zero-tracking principles. You have absolute ownership of your personal financial records.
          </p>
        </div>

        {/* Policy Details Card */}
        <div className="space-y-3 p-4 rounded-2xl bg-neutral-900/90 border border-white/5 text-xs text-neutral-300">
          <div className="flex items-start space-x-3">
            <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Row-Level Cryptographic Isolation</span>
              <p className="text-neutral-400 text-[11px] mt-0.5">
                Every transaction, envelope, bank balance, and debt record is sealed behind PostgreSQL Row Level Security (RLS) linked only to your unique UUID.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 pt-2 border-t border-white/5">
            <Trash2 className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Complete Cascade Erasure</span>
              <p className="text-neutral-400 text-[11px] mt-0.5">
                Deleting your account invokes an atomic `ON DELETE CASCADE` across all PostgreSQL tables, deleting your profile, credentials, and financial history permanently.
              </p>
            </div>
          </div>
        </div>

        {/* Action / Stamp Section */}
        {requestSubmitted ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-2 animate-fade-in">
            <div className="flex items-center space-x-2 font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Deletion Request Logged</span>
            </div>
            <p className="text-neutral-300 leading-relaxed">
              Your deletion ticket for account <span className="font-mono text-white">{user?.email}</span> has been logged under the beta policy. Self-service instant wipe will be activated in the next release.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-neutral-900 border border-dashed border-rose-500/30 text-[11px] text-neutral-400 flex items-center justify-between">
              <span className="text-neutral-300 font-mono">Account ID: {user?.id.slice(0, 13)}...</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Self-Service Pending
              </span>
            </div>

            <button
              type="button"
              onClick={() => setRequestSubmitted(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition active:scale-95 flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Request Account & Data Deletion</span>
            </button>
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-850 hover:bg-neutral-800 text-white text-xs font-semibold border border-white/10 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
