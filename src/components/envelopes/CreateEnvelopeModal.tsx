import React, { useState } from 'react';
import {
  X,
  FolderPlus,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
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
  PiggyBank,
} from 'lucide-react';
import type { EnvelopeRolloverPolicy } from '@/types/accounting.types';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';
import { RolloverPolicySelector } from './RolloverPolicySelector';

interface CreateEnvelopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    rolloverPolicy: EnvelopeRolloverPolicy;
    color?: string;
    icon?: string;
    isProtected?: boolean;
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

export const CreateEnvelopeModal: React.FC<CreateEnvelopeModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#38bdf8');
  const [icon, setIcon] = useState('Folder');
  const [rolloverPolicy, setRolloverPolicy] = useState<EnvelopeRolloverPolicy>('carry_forward');
  const [isProtected, setIsProtected] = useState(false);
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
        icon,
        rolloverPolicy,
        isProtected,
      });
      setName('');
      setIcon('Folder');
      setColor('#38bdf8');
      setIsProtected(false);
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
              <span>Envelope Category</span>
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
                placeholder="e.g. Books, Travel, Gadgets, Taxes"
                required
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Icon Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Category Icon</label>
              <div className="grid grid-cols-7 gap-2 pt-1">
                {ICON_OPTIONS.map((item) => {
                  const ItemIcon = item.icon;
                  const isSelected = icon === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setIcon(item.name)}
                      className={`p-2 rounded-xl flex items-center justify-center transition border min-h-[38px] active:scale-95 ${
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

            {/* Rollover Policy Custom UI Selector */}
            <RolloverPolicySelector
              value={rolloverPolicy}
              onChange={setRolloverPolicy}
              disabled={isSubmitting}
            />

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