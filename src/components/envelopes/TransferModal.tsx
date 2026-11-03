import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { formatINR, toPaise } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

interface TransferModalProps {
  isOpen: boolean;
  sourceEnvelopeId?: string;
  envelopes: EnvelopeWithAllocation[];
  onClose: () => void;
  onTransfer: (fromEnvelopeId: string, toEnvelopeId: string, amountPaise: bigint) => Promise<void>;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  sourceEnvelopeId: initialFromEnvelopeId,
  envelopes,
  onClose,
  onTransfer,
}) => {
  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [reserveConfirmed, setReserveConfirmed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  useEffect(() => {
    if (envelopes.length >= 2) {
      const defaultFrom = initialFromEnvelopeId || envelopes[0].id;
      setFromId(defaultFrom);
      const defaultTo = envelopes.find((e) => e.id !== defaultFrom)?.id || envelopes[1].id;
      setToId(defaultTo);
      setAmountRupees('');
      setReserveConfirmed(false);
      setError(null);
    }
  }, [envelopes, initialFromEnvelopeId, isOpen]);

  if (!isOpen || envelopes.length < 2) return null;

  const fromEnvelope = envelopes.find((e) => e.id === fromId);
  const toEnvelope = envelopes.find((e) => e.id === toId);
  const isFromProtected = Boolean(fromEnvelope?.isProtected ?? fromEnvelope?.isSystemReserved);
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

    if (isFromProtected && !reserveConfirmed) {
      setError(`Please confirm that you explicitly authorize drawing funds from your protected reserve ("${fromEnvelope?.name}").`);
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
    <ModalPortal>
      <div
        onClick={handleBackdropClick}
        onTouchMove={handleBackdropTouchMove}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md sm:backdrop-blur-lg modal-overlay animate-fade-in"
      >
        <div className="max-w-md w-full bg-neutral-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4 sm:space-y-5 border border-white/15 shadow-2xl relative max-h-[90vh] sm:max-h-[88vh] overflow-y-auto modal-panel">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Envelope Reallocation</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Transfer Funds</h2>
            <p className="text-xs text-neutral-400">
              Shift allocated money between categories to rebalance unexpected monthly needs.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Source Envelope */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">From Envelope</label>
                <select
                  value={fromId}
                  onChange={(e) => {
                    setFromId(e.target.value);
                    setReserveConfirmed(false);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-indigo-500"
                >
                  {envelopes.map((env) => (
                    <option key={env.id} value={env.id} className="bg-neutral-900 text-white">
                      {env.name} ({formatINR(env.availablePaise)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Envelope */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">To Envelope</label>
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-indigo-500"
                >
                  {envelopes
                    .filter((e) => e.id !== fromId)
                    .map((env) => (
                      <option key={env.id} value={env.id} className="bg-neutral-900 text-white">
                        {env.name} ({formatINR(env.availablePaise)})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Transfer Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
                <span>Transfer Amount</span>
                {fromEnvelope && (
                  <span className="text-[11px] text-neutral-400 font-mono">
                    Max: {formatINR(fromEnvelope.availablePaise)}
                  </span>
                )}
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

            {/* Protected Reserve Confirmation Banner */}
            {isFromProtected && fromEnvelope && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
                <div className="flex items-center space-x-2 font-semibold text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Protected Reserve Alert</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-200/90">
                  "{fromEnvelope.name}" is designated as a protected reserve. Confirm you explicitly intend to transfer funds out of this reserve.
                </p>
                <label className="flex items-start space-x-2.5 pt-1 cursor-pointer select-none min-h-[36px]">
                  <input
                    type="checkbox"
                    checked={reserveConfirmed}
                    onChange={(e) => setReserveConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-white/20 text-amber-500 focus:ring-amber-500 bg-black/40 cursor-pointer"
                  />
                  <span className="text-[11px] text-amber-200 font-medium">
                    I explicitly confirm transferring funds out of {fromEnvelope.name}.
                  </span>
                </label>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || (isFromProtected && !reserveConfirmed)}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-semibold transition shadow-lg shadow-indigo-500/25 active:scale-[0.98] min-h-[44px]"
              >
                <span>{isSubmitting ? 'Transferring...' : `Move ${toEnvelope?.name ? `to ${toEnvelope.name}` : 'Funds'}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};