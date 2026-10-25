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
} from 'lucide-react';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { formatINR } from '@/lib/accounting/currency';

interface EnvelopeCardProps {
  envelope: EnvelopeWithAllocation;
  onAllocate: () => void;
  onTransfer: () => void;
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
    default:
      return Folder;
  }
}

export const EnvelopeCard: React.FC<EnvelopeCardProps> = ({
  envelope,
  onAllocate,
  onTransfer,
}) => {
  const IconComp = getIconComponent(envelope.icon);
  const isEmergency = envelope.slug === 'emergency';

  // Calculate percentage spent of allocation (if any allocated)
  const percentSpent =
    envelope.allocatedPaise > 0n
      ? Math.min(100, Number((envelope.spentPaise * 100n) / envelope.allocatedPaise))
      : 0;

  const isOverspent = envelope.availablePaise < 0n;

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all space-y-4 relative overflow-hidden group">
      {/* Top subtle glow line matching category color */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: envelope.color || '#38bdf8' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/90 shadow-sm"
            style={{ backgroundColor: `${envelope.color || '#38bdf8'}25`, color: envelope.color || '#38bdf8' }}
          >
            <IconComp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-tight flex items-center space-x-1.5">
              <span>{envelope.name}</span>
              {isEmergency && (
                <span
                  title="Protected Emergency Reserve"
                  className="inline-flex items-center space-x-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"
                >
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Reserve</span>
                </span>
              )}
            </div>
            <div className="text-[11px] text-neutral-400 capitalize">
              {envelope.rolloverPolicy.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onTransfer}
            title="Transfer / Reallocate Funds"
            className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/5 transition"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onAllocate}
            title="Set Monthly Budget"
            className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/5 transition"
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
        <div
          className={`text-2xl font-bold font-mono tracking-tight tabular-nums mt-0.5 ${
            isOverspent ? 'text-red-400' : 'text-white'
          }`}
        >
          {formatINR(envelope.availablePaise)}
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
            className={`h-full rounded-full transition-all duration-300 ${
              isOverspent
                ? 'bg-red-500'
                : percentSpent > 85
                ? 'bg-amber-400'
                : 'bg-sky-400'
            }`}
            style={{ width: `${Math.max(3, percentSpent)}%` }}
          />
        </div>
      </div>

      {/* Footer Pill */}
      {envelope.carriedOverPaise > 0n && (
        <div className="text-[10px] text-neutral-400 bg-neutral-900/60 px-2 py-1 rounded-md border border-white/5 flex items-center justify-between">
          <span>Rolled over from last month:</span>
          <span className="font-mono text-neutral-300 font-medium">{formatINR(envelope.carriedOverPaise)}</span>
        </div>
      )}
    </div>
  );
};
