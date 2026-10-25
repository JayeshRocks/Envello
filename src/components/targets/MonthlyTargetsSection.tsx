import React, { useState } from 'react';
import { Target, Plus, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import type { MonthlyTargetWithProgress } from '@/hooks/useMonthlyTargets';
import { formatINR, toPaise } from '@/lib/accounting/currency';
import { AddMonthlyTargetModal } from './AddMonthlyTargetModal';

interface MonthlyTargetsSectionProps {
  targets: MonthlyTargetWithProgress[];
  totalTargetAmountPaise: bigint;
  totalContributedPaise: bigint;
  isLoading: boolean;
  onAddTarget: (params: {
    title: string;
    target_amount_paise: number;
    target_date: string;
    current_contributed_paise?: number;
  }) => Promise<void>;
  onContribute: (targetId: string, amountPaise: number) => Promise<void>;
  onRemoveTarget: (targetId: string) => Promise<void>;
}

export const MonthlyTargetsSection: React.FC<MonthlyTargetsSectionProps> = ({
  targets,
  totalTargetAmountPaise,
  totalContributedPaise,
  isLoading,
  onAddTarget,
  onContribute,
  onRemoveTarget,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [contributingTargetId, setContributingTargetId] = useState<string | null>(null);
  const [customAmountRupees, setCustomAmountRupees] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeTargets = targets.filter((t) => !t.is_achieved);

  const handleContribute = async (targetId: string) => {
    const amt = parseFloat(customAmountRupees);
    if (isNaN(amt) || amt <= 0) return;

    try {
      setIsSubmitting(true);
      await onContribute(targetId, Number(toPaise(amt)));
      setContributingTargetId(null);
      setCustomAmountRupees('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDaysRemaining = (dateStr: string) => {
    const targetDate = new Date(dateStr).getTime();
    const today = new Date().getTime();
    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Passed';
    if (diffDays === 0) return 'Due Today';
    return `${diffDays} days left`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-semibold text-white">Monthly Targets & Planned Goals</h3>
            <span className="text-xs text-neutral-400">({activeTargets.length} active)</span>
          </div>
          <p className="text-xs text-neutral-400">
            Total Target Volume: <span className="font-mono text-cyan-400 font-semibold">{formatINR(totalTargetAmountPaise)}</span> • Saved Towards Goals:{' '}
            <span className="font-mono text-cyan-300 font-semibold">{formatINR(totalContributedPaise)}</span>
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs text-white font-medium shadow-lg shadow-cyan-600/20 flex items-center space-x-1.5 self-start sm:self-auto transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Target Goal</span>
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-neutral-500">Loading targets...</div>
      ) : targets.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
            <Target className="w-5 h-5" />
          </div>
          <div className="text-xs text-neutral-400">No monthly planning targets created yet.</div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-white/10 transition"
          >
            Create Your First Target
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {targets.map((target) => {
            const isContributing = contributingTargetId === target.id;
            const daysRemaining = getDaysRemaining(target.target_date);

            return (
              <div
                key={target.id}
                className={`glass-card glass-card-interactive rounded-2xl p-5 border relative overflow-hidden space-y-4 group ${
                  target.is_achieved
                    ? 'border-emerald-500/30 bg-emerald-950/10'
                    : 'border-white/10 hover:border-cyan-500/30'
                }`}
              >
                {/* Top Info */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs text-neutral-400 font-medium tracking-wide uppercase">
                      Pillar 6 Goal
                    </div>
                    <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition">
                      {target.title}
                    </div>
                  </div>
                  {target.is_achieved ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Achieved!</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-800 text-neutral-300 border border-white/5">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>{daysRemaining}</span>
                    </span>
                  )}
                </div>

                {/* Amounts */}
                <div className="space-y-1">
                  <div className="text-[11px] text-neutral-400">Target Goal</div>
                  <div className="text-xl font-bold font-mono tracking-tight text-white tabular-nums">
                    {formatINR(target.target_amount_paise)}
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-0.5">
                    <span>Saved so far:</span>
                    <span className="font-mono text-cyan-300 font-medium">
                      {formatINR(target.current_contributed_paise)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        target.is_achieved ? 'bg-emerald-500' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, target.progress_percent))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>{target.progress_percent.toFixed(1)}% Completed</span>
                    <span>Due: {target.target_date}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-white/5">
                  {isContributing ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="any"
                          value={customAmountRupees}
                          onChange={(e) => setCustomAmountRupees(e.target.value)}
                          placeholder="Amount in ₹"
                          className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                        <button
                          onClick={() => handleContribute(target.id)}
                          disabled={isSubmitting}
                          className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white font-medium flex-shrink-0"
                        >
                          {isSubmitting ? '...' : 'Add'}
                        </button>
                        <button
                          onClick={() => setContributingTargetId(null)}
                          className="p-1 rounded-lg bg-neutral-800 text-xs text-neutral-400"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onRemoveTarget(target.id)}
                        className="text-neutral-500 hover:text-red-400 transition"
                        title="Delete target"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {!target.is_achieved && (
                        <button
                          onClick={() => {
                            setContributingTargetId(target.id);
                            setCustomAmountRupees('');
                          }}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1"
                        >
                          <span>+ Contribute</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <AddMonthlyTargetModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddTarget={async (params) => {
          await onAddTarget(params);
        }}
      />
    </div>
  );
};
