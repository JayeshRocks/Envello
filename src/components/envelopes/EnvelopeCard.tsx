import React, { useState } from 'react';
import {
  Mail,
  ShieldAlert,
  Home,
  Dumbbell,
  Coffee,
  Gift,
  Folder,
  ArrowRightLeft,
  SlidersHorizontal,
  ShieldCheck,
  Pencil,
  Heart,
  ShoppingBag,
  Car,
  Plane,
  Utensils,
  Book,
  PiggyBank,
  X,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { formatINR } from '@/lib/accounting/currency';
import { SpotlightCard } from '@/components/common/SpotlightCard';

interface EnvelopeCardProps {
  envelope: EnvelopeWithAllocation;
  index?: number;
  totalCount?: number;
  isReorderMode?: boolean;
  onAllocate: () => void;
  onTransfer: () => void;
  onEdit: () => void;
  onViewAllocation?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onDragStart?: (e: React.DragEvent<HTMLElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLElement>) => void;
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

function formatRolloverPolicy(policy?: string) {
  switch (policy) {
    case 'carry_forward':
      return 'Rollover: Carry Forward';
    case 'reset':
    case 'sweep_to_regular':
      return 'Rollover: Release to Accounts';
    default:
      return 'Rollover: Carry Forward';
  }
}

export const EnvelopeCard: React.FC<EnvelopeCardProps> = ({
  envelope,
  index,
  totalCount,
  isReorderMode = false,
  onAllocate,
  onTransfer,
  onEdit,
  onViewAllocation,
  onMoveLeft,
  onMoveRight,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [isProtectedExpanded, setIsProtectedExpanded] = useState(false);
  const isProtected = Boolean(envelope.isProtected ?? envelope.isSystemReserved);
  const IconComp = getIconComponent(envelope.icon);

  // Calculate percentage spent of allocation (if any allocated)
  const percentSpent =
    envelope.allocatedPaise > 0n
      ? Math.min(100, Number((envelope.spentPaise * 100n) / envelope.allocatedPaise))
      : envelope.spentPaise > 0n
      ? 100
      : 0;

  const isOverspent = envelope.availablePaise < 0n;
  const categoryColor = envelope.color || '#38bdf8';

  return (
    <SpotlightCard
      spotlightColor={`${categoryColor}24`}
      draggable={isReorderMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => {
        if (!isReorderMode && onViewAllocation) {
          onViewAllocation();
        }
      }}
      className={`space-y-4 relative overflow-hidden group p-5 border transition-all duration-300 ${
        isReorderMode
          ? 'border-sky-500/40 ring-1 ring-sky-500/20 bg-[#121417] cursor-grab active:cursor-grabbing'
          : 'border-white/10 hover:border-white/25 hover:bg-white/[0.02] cursor-pointer'
      }`}
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
            <div className="text-sm font-semibold text-white tracking-tight flex items-center space-x-1.5 flex-wrap gap-y-1">
              <span>{envelope.name}</span>
              {isProtected && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsProtectedExpanded((prev) => !prev);
                  }}
                  title={
                    isProtectedExpanded
                      ? 'Collapse Protected Reserve info'
                      : 'Protected Reserve — Click to view details'
                  }
                  aria-label="Protected Reserve details"
                  className={`inline-flex items-center justify-center p-1 rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${
                    isProtectedExpanded
                      ? 'bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/40 shadow-sm shadow-emerald-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              )}
            </div>
            <div className="text-[11px] text-neutral-400">
              {formatRolloverPolicy(envelope.rolloverPolicy)}
            </div>
          </div>
        </div>

        {/* Quick action buttons or Reorder controls */}
        {isReorderMode ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center space-x-1 bg-neutral-900/90 p-1 rounded-xl border border-white/10 shadow-sm"
          >
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-white/5 text-neutral-300 font-semibold select-none">
              #{(index ?? 0) + 1}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveLeft?.();
              }}
              disabled={index === 0}
              title="Move left / earlier"
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none transition min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-90 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveRight?.();
              }}
              disabled={index === (totalCount ?? 1) - 1}
              title="Move right / later"
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none transition min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-90 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div
              title="Drag card to reorder"
              className="p-1.5 text-neutral-400 hover:text-neutral-200 cursor-grab active:cursor-grabbing flex items-center justify-center"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          </div>
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center space-x-1.5 opacity-100 sm:opacity-90 sm:group-hover:opacity-100 transition-opacity"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Edit Envelope Details"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.12] border border-white/5 text-neutral-300 hover:text-white transition-all duration-200 active:scale-95 min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center cursor-pointer shadow-sm"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTransfer();
              }}
              title="Transfer / Reallocate Funds"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.12] border border-white/5 text-neutral-300 hover:text-white transition-all duration-200 active:scale-95 min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center cursor-pointer shadow-sm"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAllocate();
              }}
              title="Modify Budget"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.12] border border-white/5 text-neutral-300 hover:text-white transition-all duration-200 active:scale-95 min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center cursor-pointer shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Protected Reserve Details Banner (Expandable) */}
      {isProtected && isProtectedExpanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs space-y-1.5 animate-fade-in relative shadow-inner"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 font-semibold text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Protected Reserve</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsProtectedExpanded(false);
              }}
              className="text-neutral-400 hover:text-white p-1 rounded-md transition cursor-pointer"
              title="Close info"
              aria-label="Close info"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-emerald-200/90 leading-relaxed font-sans">
            This envelope is configured as a Protected Reserve. It requires explicit user authorization confirmation before funds can be withdrawn, reallocated, or spent, safeguarding your reserves from accidental depletion.
          </p>
        </div>
      )}

      {/* Available Balance */}
      <div>
        <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
          Available Balance
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

      {/* Footer Pill & View Allocation Link */}
      <div className="flex items-center justify-between pt-1 gap-2">
        {envelope.carriedOverPaise > 0n ? (
          <div className="text-[10px] text-neutral-400 bg-neutral-900/60 px-2.5 py-1.5 rounded-lg border border-white/5 flex items-center space-x-1">
            <span>Rolled over:</span>
            <span className="font-mono text-neutral-300 font-medium">{formatINR(envelope.carriedOverPaise)}</span>
          </div>
        ) : (
          <div />
        )}

        {onViewAllocation && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewAllocation();
            }}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center space-x-1 cursor-pointer transition active:scale-95 ml-auto py-1 px-1.5 rounded-md hover:bg-sky-500/10 min-h-[32px]"
          >
            <span>View Allocation</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
        )}
      </div>
    </SpotlightCard>
  );
};
