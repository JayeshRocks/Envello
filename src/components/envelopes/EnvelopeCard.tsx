import React from 'react';
import {
  Mail,
  ShieldAlert,
  Home,
  Dumbbell,
  Coffee,
  Gift,
  Folder,
  ArrowRightLeft,
  PlusCircle,
  ShieldCheck,
  Pencil,
  Heart,
  ShoppingBag,
  Car,
  Plane,
  Utensils,
  Book,
  Sparkles,
  PiggyBank,
} from 'lucide-react';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { formatINR } from '@/lib/accounting/currency';
import { SpotlightCard } from '@/components/common/SpotlightCard';

interface EnvelopeCardProps {
  envelope: EnvelopeWithAllocation;
  onAllocate: () => void;
  onTransfer: () => void;
  onEdit: () => void;
}

function getIconComponent(iconName?: string) {
  switch (iconName) {
    case 'Mail':
      return Mail;
    case 'ShieldAlert':
      return ShieldAlert;
    case 'Home':
      return Home;
    case 'Dumbbell':
      return Dumbbell;
    case 'Coffee':
      return Coffee;
    case 'Gift':
      return Gift;
    case 'Heart':
      return Heart;
    case 'ShoppingBag':
      return ShoppingBag;
    case 'Car':
      return Car;
    case 'Plane':
      return Plane;
    case 'Utensils':
      return Utensils;
    case 'Book':
      return Book;
    case 'PiggyBank':
    case 'piggy-bank':
      return PiggyBank;
    default:
      return Folder;
  }
}

export const EnvelopeCard: React.FC<EnvelopeCardProps> = ({
  envelope,
  onAllocate,
  onTransfer,
  onEdit,
}) => {
  const isEmergency = envelope.slug === 'emergency';
  const isSavings = envelope.slug === 'savings';
  const isSpendable = envelope.slug === 'regular' || envelope.slug === 'spendable';
  const IconComp =
    isSavings && (!envelope.icon || envelope.icon === 'Folder')
      ? PiggyBank
      : getIconComponent(envelope.icon);

  // Calculate percentage spent of allocation (if any allocated)
  const percentSpent =
    envelope.allocatedPaise > 0n
      ? Math.min(100, Number((envelope.spentPaise * 100n) / envelope.allocatedPaise))
      : envelope.spentPaise > 0n
      ? 100
      : 0;

  const isOverspent = envelope.availablePaise < 0n;
  const categoryColor = envelope.color || (isSavings ? '#10b981' : '#38bdf8');

  return (
    <SpotlightCard
      spotlightColor={`${categoryColor}24`}
      className="space-y-4 relative overflow-hidden group p-5 border border-white/10 hover:border-white/20 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/90 shadow-sm transition-transform duration-300 group-hover:scale-105 border border-white/10"
            style={{ backgroundColor: `${categoryColor}25`, color: categoryColor }}
          >
            <IconComp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-tight flex items-center space-x-1.5">
              <span>{envelope.name}</span>
              {isEmergency && (
                <span
                  title="Protected Emergency Reserve"
                  className="inline-flex items-center space-x-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-mono"
                >
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Reserve</span>
                </span>
              )}
              {isSavings && (
                <span
                  title="Protected Capital Savings (Untouched Bank Interest Reserve)"
                  className="inline-flex items-center space-x-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono"
                >
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Reserve</span>
                </span>
              )}
              {isSpendable && (
                <span
                  title="Primary Spendable Clearinghouse"
                  className="inline-flex items-center space-x-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Primary</span>
                </span>
              )}
            </div>
            <div className="text-[11px] text-neutral-400 capitalize">
              {envelope.rolloverPolicy.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center space-x-1 opacity-100 sm:opacity-85 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            title="Edit Envelope Details"
            className="p-2 sm:p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-all duration-200 active:scale-90 min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onTransfer}
            title="Transfer / Reallocate Funds"
            className="p-2 sm:p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-all duration-200 active:scale-90 min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onAllocate}
            title="Set Monthly Budget"
            className="p-2 sm:p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-all duration-200 active:scale-90 min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Available Balance */}
      <div>
        <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
          Available to Spend
        </div>
        <div className="flex items-center space-x-2 mt-0.5">
          <div
            className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${
              isOverspent ? 'text-red-400' : 'text-white'
            }`}
          >
            {formatINR(envelope.availablePaise)}
          </div>
          {isOverspent && (
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              Overspent
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar (Spent vs Allocated) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono tabular-nums">
          <span>Spent: {formatINR(envelope.spentPaise)}</span>
          <span>Budget: {formatINR(envelope.allocatedPaise)}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-neutral-800/80 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isOverspent
                ? 'bg-red-500'
                : percentSpent > 85
                ? 'bg-amber-400'
                : 'bg-sky-400'
            }`}
            style={{ width: `${isOverspent ? 100 : Math.max(3, percentSpent)}%` }}
          />
        </div>
      </div>

      {/* Footer Pill */}
      {envelope.carriedOverPaise > 0n && (
        <div className="text-[10px] text-neutral-400 bg-neutral-900/60 px-2.5 py-1.5 rounded-lg border border-white/5 flex items-center justify-between">
          <span>Rolled over from last month:</span>
          <span className="font-mono text-neutral-300 font-medium">{formatINR(envelope.carriedOverPaise)}</span>
        </div>
      )}
    </SpotlightCard>
  );
};
