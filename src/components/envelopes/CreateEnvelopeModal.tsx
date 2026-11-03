import React, { useState } from 'react';
import { X, FolderPlus, AlertCircle, ArrowRight } from 'lucide-react';
import type { EnvelopeRolloverPolicy } from '@/types/accounting.types';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

interface CreateEnvelopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    rolloverPolicy: EnvelopeRolloverPolicy;
    color?: string;
    icon?: string;
  }) => Promise<void>;
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
];

export const CreateEnvelopeModal: React.FC<CreateEnvelopeModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#38bdf8');
  const [rolloverPolicy, setRolloverPolicy] = useState<EnvelopeRolloverPolicy>('carry_forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please provide an envelope name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        name: cleanName,
        color,
        rolloverPolicy,
      });
      setName('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create envelope.');
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
          <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Custom Category</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Create New Envelope</h2>
          <p className="text-xs text-neutral-400">
            Designate a new budget category tailored to your spending patterns.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Envelope Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Books, Travel, Gadgets"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Color Preset Palette */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Category Color</label>
            <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-2 py-1">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setColor(preset.hex)}
                  style={{ backgroundColor: preset.hex }}
                  className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full transition-transform active:scale-95 ${
                    color === preset.hex ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={preset.name}
                />
              ))}
            </div>
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
                Carry Forward (Keep unused funds in this envelope)
              </option>
              <option value="sweep_to_regular" className="bg-neutral-900 text-white">
                Sweep to Spendable (Return unused surplus to main pool)
              </option>
              <option value="reset" className="bg-neutral-900 text-white">
                Reset (Zero out balance at month boundary)
              </option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold transition shadow-lg shadow-emerald-500/25 active:scale-[0.98] min-h-[44px]"
            >
              <span>{isSubmitting ? 'Creating Envelope...' : 'Create Envelope'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  </ModalPortal>
);
};
