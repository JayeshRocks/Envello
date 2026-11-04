import React, { useState, useEffect } from 'react';
import {
  X,
  Settings2,
  Trash2,
  AlertCircle,
  Save,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Home,
  Dumbbell,
  Coffee,
  Gift,
  Folder,
  Heart,
  ShoppingBag,
  Car,
  Plane,
  Utensils,
  Book,
  PiggyBank,
} from 'lucide-react';
import type { EnvelopeWithAllocation, EnvelopeRolloverPolicy } from '@/types/accounting.types';
import { formatINR } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

interface EditEnvelopeModalProps {
  envelope: EnvelopeWithAllocation | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (
    envelopeId: string,
    data: {
      name?: string;
      icon?: string;
      color?: string;
      rolloverPolicy?: EnvelopeRolloverPolicy;
      isProtected?: boolean;
    }
  ) => Promise<void>;
  onDelete: (envelopeId: string) => Promise<void>;
}

const COLOR_PRESETS = [
  { name: 'Sky', hex: '#38bdf8' },
  { name: 'Emerald', hex: '#34d399' },
  { name: 'Amber', hex: '#fbbf24' },
  { name: 'Indigo', hex: '#818cf8' },
  { name: 'Purple', hex: '#c084fc' },
  { name: 'Pink', hex: '#f472b6' },
  { name: 'Teal', hex: '#2dd4bf' },
  { name: 'Orange', hex: '#fb923c' },
  { name: 'Rose', hex: '#f43f5e' },
];

const ICON_OPTIONS = [
  { name: 'Folder', icon: Folder },
  { name: 'Mail', icon: Mail },
  { name: 'ShieldAlert', icon: ShieldAlert },
  { name: 'Home', icon: Home },
  { name: 'Dumbbell', icon: Dumbbell },
  { name: 'Coffee', icon: Coffee },
  { name: 'Gift', icon: Gift },
  { name: 'Heart', icon: Heart },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'Car', icon: Car },
  { name: 'Plane', icon: Plane },
  { name: 'Utensils', icon: Utensils },
  { name: 'Book', icon: Book },
  { name: 'PiggyBank', icon: PiggyBank },
];

export const EditEnvelopeModal: React.FC<EditEnvelopeModalProps> = ({
  envelope,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#38bdf8');
  const [icon, setIcon] = useState('Folder');
  const [rolloverPolicy, setRolloverPolicy] = useState<EnvelopeRolloverPolicy>('carry_forward');
  const [isProtected, setIsProtected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  useEffect(() => {
    if (envelope) {
      setName(envelope.name);
      setColor(envelope.color || '#38bdf8');
      setIcon(envelope.icon || 'Folder');
      setRolloverPolicy(envelope.rolloverPolicy);
      setIsProtected(Boolean(envelope.isProtected ?? envelope.isSystemReserved));
      setShowConfirmDelete(false);
      setError(null);
    }
  }, [envelope]);

  if (!isOpen || !envelope) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Envelope name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate(envelope.id, {
        name: cleanName,
        color,
        icon,
        rolloverPolicy,
        isProtected,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update envelope.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      await onDelete(envelope.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete envelope.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
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
            <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
              <Settings2 className="w-3.5 h-3.5" />
              <span>Customize Envelope</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Edit Category Details</h2>
            <p className="text-xs text-neutral-400">
              Customize name, icon, color palette, protected reserve status, and rollover mechanics.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name input (Full user control on all envelopes) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Envelope Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Icon Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Category Icon</label>
              <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 pt-1">
                {ICON_OPTIONS.map((item) => {
                  const ItemIcon = item.icon;
                  const isSelected = icon === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setIcon(item.name)}
                      className={`p-2.5 sm:p-2 rounded-xl flex items-center justify-center transition border min-h-[40px] active:scale-95 ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-500 text-sky-300 ring-2 ring-sky-500/30'
                          : 'bg-neutral-900/50 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                      title={item.name}
                    >
                      <ItemIcon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Theme Color</label>
              <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setColor(preset.hex)}
                    style={{ backgroundColor: preset.hex }}
                    className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full transition-transform active:scale-95 ${
                      color === preset.hex
                        ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            {/* Protected Reserve Feature Toggle */}
            <div className={`flex items-center justify-between p-3.5 rounded-xl transition-colors duration-200 ${
              isProtected ? 'bg-emerald-950/20 border border-emerald-500/30' : 'bg-neutral-950/70 border border-white/10'
            }`}>
              <div className="space-y-0.5 pr-3">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white">Protected Reserve</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Requires extra authorization confirmation before spending or transferring funds out of this envelope.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isProtected}
                onClick={() => setIsProtected(!isProtected)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isProtected ? 'bg-emerald-500' : 'bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isProtected ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Rollover Policy */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Month-End Rollover Policy</label>
              <select
                value={rolloverPolicy}
                onChange={(e) => setRolloverPolicy(e.target.value as EnvelopeRolloverPolicy)}
                className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
              >
                <option value="carry_forward" className="bg-neutral-900 text-white">
                  Carry Forward (Keep unused funds & account holds in this envelope for next month)
                </option>
                <option value="reset" className="bg-neutral-900 text-white">
                  Release to Respective Liquid Accounts (Return unused budget & holds back to bank accounts)
                </option>
              </select>

              {/* Dynamic Policy Explanatory Note */}
              <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-white/5 text-[11px] text-neutral-400 leading-relaxed font-sans">
                {rolloverPolicy === 'carry_forward' && (
                  <span>
                    <strong className="text-white">Carry Forward:</strong> Any unused funds remain reserved in this envelope into the next month, preserving backing liquid account holds without release.
                  </span>
                )}
                {(rolloverPolicy === 'reset' || rolloverPolicy === 'sweep_to_regular') && (
                  <span>
                    <strong className="text-white">Release to Respective Liquid Accounts:</strong> Unspent envelope funds and holds are released at month-end, returning money back to the respective liquid bank accounts&apos; free unallocated balances.
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-semibold transition shadow-lg shadow-sky-500/25 active:scale-[0.98] min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>

          {/* Delete Envelope section (Available for ALL envelopes — user has total control) */}
          <div className="pt-4 border-t border-white/5 space-y-2">
            {!showConfirmDelete ? (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium flex items-center justify-center space-x-1.5 transition min-h-[44px] active:scale-[0.98]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Envelope Category</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2.5">
                <p className="text-xs text-red-300 font-medium leading-relaxed">
                  Are you sure you want to delete <span className="font-bold underline">{envelope.name}</span>?
                  {envelope.availablePaise > 0n && (
                    <span className="block mt-1 font-semibold text-amber-300">
                      ⚠️ Note: This envelope currently has {formatINR(envelope.availablePaise)} available funds.
                    </span>
                  )}
                  <span className="block mt-1 text-[11px] text-neutral-400">
                    Existing past ledger transactions will remain safely recorded with historical amounts preserved.
                  </span>
                </p>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-2 px-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold transition min-h-[38px] active:scale-95"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition min-h-[38px] active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};