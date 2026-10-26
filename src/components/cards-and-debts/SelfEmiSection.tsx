import React, { useState } from 'react';
import { RefreshCw, Plus, CheckCircle, ArrowUpRight, Pencil } from 'lucide-react';
import type { SelfEmiWithProgress } from '@/hooks/useSelfEmis';
import type { SelfEmiInsert } from '@/lib/api/selfEmis';
import { formatINR, toPaise } from '@/lib/accounting/currency';
import { AddSelfEmiModal } from './AddSelfEmiModal';
import { EditSelfEmiModal } from './EditSelfEmiModal';

interface SelfEmiSectionProps {
  selfEmis: SelfEmiWithProgress[];
  totalRemainingPaise: bigint;
  isLoading: boolean;
  onAddEmi: (params: {
    description: string;
    total_funded_paise: number;
    monthly_reimbursement_paise: number;
    start_date?: string;
  }) => Promise<void>;
  onPayEmi: (params: {
    emiId: string;
    amountPaise: number;
  }) => Promise<void>;
  onUpdateEmi?: (emiId: string, updates: Partial<SelfEmiInsert>) => Promise<void>;
  onDeleteEmi?: (emiId: string) => Promise<void>;
}

export const SelfEmiSection: React.FC<SelfEmiSectionProps> = ({
  selfEmis,
  totalRemainingPaise,
  isLoading,
  onAddEmi,
  onPayEmi,
  onUpdateEmi,
  onDeleteEmi,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEmi, setEditingEmi] = useState<SelfEmiWithProgress | null>(null);
  const [reimbursingEmiId, setReimbursingEmiId] = useState<string | null>(null);
  const [customAmountRupees, setCustomAmountRupees] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeEmis = selfEmis.filter((e) => !e.is_completed);

  const handleReimburse = async (emi: SelfEmiWithProgress) => {
    const amt = parseFloat(customAmountRupees) || (emi.monthly_reimbursement_paise / 100);
    if (isNaN(amt) || amt <= 0) return;

    try {
      setIsSubmitting(true);
      await onPayEmi({
        emiId: emi.id,
        amountPaise: Number(toPaise(amt)),
      });
      setReimbursingEmiId(null);
      setCustomAmountRupees('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-semibold text-white">Self EMIs (Internal Reimbursement)</h3>
            <span className="text-xs text-neutral-400">({activeEmis.length} active)</span>
          </div>
          <p className="text-xs text-neutral-400">
            Total Remaining to Return to Savings:{' '}
            <span className="font-mono text-indigo-400 font-semibold">{formatINR(totalRemainingPaise)}</span>
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium shadow-lg shadow-indigo-600/20 flex items-center space-x-1.5 self-start sm:self-auto transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Self EMI</span>
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-neutral-500">Loading self EMIs...</div>
      ) : activeEmis.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="text-xs text-neutral-400">No self EMIs active. Borrowed from your savings? Track paying yourself back!</div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-white/10 transition"
          >
            Create Self EMI Tracker
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeEmis.map((emi) => {
            const isReimbursing = reimbursingEmiId === emi.id;

            return (
              <div
                key={emi.id}
                className="glass-card glass-card-interactive rounded-2xl p-5 border border-white/10 relative overflow-hidden space-y-4 hover:border-indigo-500/30 group"
              >
                {/* Top Info */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs text-neutral-400 font-medium tracking-wide uppercase">
                      Self Reimbursement
                    </div>
                    <div className="text-sm font-semibold text-white group-hover:text-indigo-300 transition">
                      {emi.description}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {emi.progress_percent.toFixed(1)}% Back
                    </span>
                    {onUpdateEmi && (
                      <button
                        onClick={() => setEditingEmi(emi)}
                        title="Edit Self EMI Details"
                        aria-label="Edit Self EMI Details"
                        className="p-1.5 sm:p-1 min-h-[32px] min-w-[32px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/5 transition"
                      >
                        <Pencil className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Amounts */}
                <div className="space-y-1">
                  <div className="text-[11px] text-neutral-400">Remaining to Reimburse</div>
                  <div className="text-xl font-bold font-mono tracking-tight text-white tabular-nums">
                    {formatINR(emi.remaining_paise)}
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-0.5">
                    <span>Target Monthly:</span>
                    <span className="font-mono text-indigo-300 font-medium">
                      {formatINR(emi.monthly_reimbursement_paise)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, emi.progress_percent))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>Reimbursed: {formatINR(emi.total_reimbursed_paise)}</span>
                    <span>Funded: {formatINR(emi.total_funded_paise)}</span>
                  </div>
                </div>

                {/* Action footer */}
                <div className="pt-2 border-t border-white/5">
                  {isReimbursing ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="any"
                          value={customAmountRupees}
                          onChange={(e) => setCustomAmountRupees(e.target.value)}
                          placeholder={(emi.monthly_reimbursement_paise / 100).toString()}
                          className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 sm:py-1 text-base sm:text-sm text-white font-mono"
                        />
                        <button
                          onClick={() => handleReimburse(emi)}
                          disabled={isSubmitting}
                          className="px-3.5 py-2 sm:py-1 min-h-[36px] sm:min-h-0 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium flex-shrink-0 transition"
                        >
                          {isSubmitting ? '...' : 'Pay'}
                        </button>
                        <button
                          onClick={() => setReimbursingEmiId(null)}
                          className="p-2 sm:p-1 min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-lg bg-neutral-800 text-xs text-neutral-400 transition"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-500 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-indigo-400" />
                        <span>Self Debt</span>
                      </span>
                      <button
                        onClick={() => {
                          setReimbursingEmiId(emi.id);
                          setCustomAmountRupees((emi.monthly_reimbursement_paise / 100).toString());
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1 py-1.5 px-3 rounded-lg hover:bg-indigo-500/10 min-h-[34px] transition"
                      >
                        <span>Reimburse</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <AddSelfEmiModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddEmi={async (params) => {
          await onAddEmi(params);
        }}
      />

      {/* Edit Self EMI Modal */}
      {onUpdateEmi && onDeleteEmi && (
        <EditSelfEmiModal
          isOpen={Boolean(editingEmi)}
          emi={editingEmi}
          onClose={() => setEditingEmi(null)}
          onUpdate={onUpdateEmi}
          onDelete={onDeleteEmi}
        />
      )}
    </div>
  );
};
