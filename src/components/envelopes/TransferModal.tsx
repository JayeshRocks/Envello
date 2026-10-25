import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, ShieldAlert, AlertCircle, ArrowRight } from 'lucide-react';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { toPaise, formatINR } from '@/lib/accounting/currency';

interface TransferModalProps {
  isOpen: boolean;
  envelopes: EnvelopeWithAllocation[];
  initialFromEnvelopeId?: string;
  onClose: () => void;
  onTransfer: (fromId: string, toId: string, amountPaise: bigint) => Promise<void>;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  envelopes,
  initialFromEnvelopeId,
  onClose,
  onTransfer,
}) => {
  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [emergencyConfirmed, setEmergencyConfirmed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (envelopes.length >= 2) {
      const defaultFrom = initialFromEnvelopeId || envelopes[0].id;
      setFromId(defaultFrom);
      const defaultTo = envelopes.find((e) => e.id !== defaultFrom)?.id || envelopes[1].id;
      setToId(defaultTo);
      setAmountRupees('');
      setEmergencyConfirmed(false);
      setError(null);
    }
  }, [envelopes, initialFromEnvelopeId, isOpen]);

  if (!isOpen || envelopes.length < 2) return null;

  const fromEnvelope = envelopes.find((e) => e.id === fromId);
  const toEnvelope = envelopes.find((e) => e.id === toId);
  const isFromEmergency = fromEnvelope?.slug === 'emergency';
  const transferPaise = toPaise(amountRupees || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fromId === toId) {
      setError('Cannot transfer funds to the same envelope.');
      return;
    }

    if (transferPaise <= 0n) {
      setError('Please enter a transfer amount greater than zero.');
      return;
    }

    if (fromEnvelope && transferPaise > fromEnvelope.availablePaise) {
      setError(`Transfer amount exceeds available balance in ${fromEnvelope.name} (${formatINR(fromEnvelope.availablePaise)}).`);
      return;
    }

    if (isFromEmergency && !emergencyConfirmed) {
      setError('Please confirm that you explicitly authorize drawing funds from your Emergency reserve.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onTransfer(fromId, toId, transferPaise);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transfer failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="max-w-md w-full glass-card rounded-2xl p-6 sm:p-7 space-y-5 border border-white/10 shadow-2xl relative modal-panel">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Envelope Reallocation</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Transfer Between Envelopes</h2>
          <p className="text-xs text-neutral-400">
            Move budgeted money between categories. Net liquid cash remains completely neutral.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* From Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">From</label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
              >
                {envelopes.map((env) => (
                  <option key={env.id} value={env.id} className="bg-neutral-900 text-white">
                    {env.name} ({formatINR(env.availablePaise)})
                  </option>
                ))}
              </select>
            </div>

            {/* To Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">To</label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
              >
                {envelopes
                  .filter((env) => env.id !== fromId)
                  .map((env) => (
                    <option key={env.id} value={env.id} className="bg-neutral-900 text-white">
                      {env.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Amount Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
              <span>Transfer Amount (₹ INR)</span>
              <span className="text-[11px] font-mono text-indigo-400">
                {formatINR(transferPaise)}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-medium text-sm">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl glass-input text-base font-mono text-white placeholder-neutral-500 focus:ring-1 focus:ring-indigo-500 tabular-nums"
              />
            </div>
          </div>

          {/* Emergency Protection Warning Banner (Mandatory Accounting Invariant) */}
          {isFromEmergency && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 space-y-2">
              <div className="flex items-center space-x-2 font-semibold text-red-300">
                <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>Protected Reserve Alert</span>
              </div>
              <p className="text-[11px] leading-relaxed text-red-200/90">
                Emergency funds are strictly reserved for critical situations. Withdrawing will reduce your safety net.
              </p>
              <label className="flex items-start space-x-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={emergencyConfirmed}
                  onChange={(e) => setEmergencyConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 text-red-500 focus:ring-red-500 bg-black/40"
                />
                <span className="text-[11px] text-red-200 font-medium">
                  I explicitly confirm withdrawing from Emergency reserve.
                </span>
              </label>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || (isFromEmergency && !emergencyConfirmed)}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-semibold transition shadow-lg shadow-indigo-500/25"
            >
              <span>{isSubmitting ? 'Transferring...' : `Move ${toEnvelope?.name ? `to ${toEnvelope.name}` : 'Funds'}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
