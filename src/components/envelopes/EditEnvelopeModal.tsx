import React, { useState, useEffect } from 'react';
import {
  X,
  Settings2,
  Trash2,
  AlertCircle,
  Save,
  Mail,
  ShieldAlert,
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
} from 'lucide-react';
import type { EnvelopeWithAllocation, EnvelopeRolloverPolicy } from '@/types/accounting.types';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (envelope) {
      setName(envelope.name);
      setColor(envelope.color || '#38bdf8');
      setIcon(envelope.icon || 'Folder');
      setRolloverPolicy(envelope.rolloverPolicy);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="max-w-md w-full glass-card rounded-2xl p-6 sm:p-7 space-y-5 border border-white/10 shadow-2xl relative modal-panel">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            <Settings2 className="w-3.5 h-3.5" />
            <span>Manage Envelope</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Edit Category Details</h2>
          <p className="text-xs text-neutral-400">
            Customize icon, color palette, and rollover mechanics for this envelope.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Envelope Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={envelope.isSystemReserved}
              title={envelope.isSystemReserved ? 'System-reserved envelope name cannot be modified' : ''}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
            />
            {envelope.isSystemReserved && (
              <p className="text-[11px] text-neutral-500">
                System-reserved envelope names are protected.
              </p>
            )}
          </div>

          {/* Icon Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Category Icon</label>
            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {ICON_OPTIONS.map((item) => {
                const ItemIcon = item.icon;
                const isSelected = icon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIcon(item.name)}
                    className={`p-2 rounded-xl flex items-center justify-center transition border ${
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
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === preset.hex
                      ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black'
                      : 'opacity-70 hover:opacity-100'
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
              disabled={envelope.isSystemReserved}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
            >
              <option value="carry_forward" className="bg-neutral-900 text-white">
                Carry Forward (Keep unused funds in this envelope)
              </option>
              <option value="sweep_to_regular" className="bg-neutral-900 text-white">
                Sweep to Regular (Return unused surplus to main pool)
              </option>
              <option value="reset" className="bg-neutral-900 text-white">
                Reset (Zero out balance at month boundary)
              </option>
            </select>
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-semibold transition shadow-lg shadow-sky-500/25"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>

        {/* Delete Envelope section */}
        {!envelope.isSystemReserved && (
          <div className="pt-4 border-t border-white/5 space-y-2">
            {!showConfirmDelete ? (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="w-full py-2 px-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium flex items-center justify-center space-x-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Envelope Category</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2.5">
                <p className="text-xs text-red-300 font-medium leading-relaxed">
                  Are you sure you want to delete <span className="font-bold underline">{envelope.name}</span>? Existing past transactions categorized under this envelope will remain safely logged in your ledger.
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold transition"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
