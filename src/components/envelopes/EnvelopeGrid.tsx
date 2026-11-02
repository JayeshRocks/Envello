import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, FolderPlus, RefreshCw, Layers, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { useEnvelopes } from '@/hooks/useEnvelopes';
import { EnvelopeCard } from './EnvelopeCard';
import { BudgetPeriodSelector } from './BudgetPeriodSelector';
import { AllocateModal } from './AllocateModal';
import { TransferModal } from './TransferModal';
import { CreateEnvelopeModal } from './CreateEnvelopeModal';
import { EditEnvelopeModal } from './EditEnvelopeModal';
import { formatINR } from '@/lib/accounting/currency';
import { useToast } from '@/context/ToastContext';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';

export const EnvelopeGrid: React.FC = () => {
  const { showToast } = useToast();
  const {
    envelopes,
    isLoading,
    selectedPeriod,
    prevPeriod,
    nextPeriod,
    totalAllocatedPaise,
    totalSpentPaise,
    totalAvailablePaise,
    allocateFunds,
    transferFunds,
    createEnvelope,
    editEnvelope,
    removeEnvelope,
    refresh,
    undoLastAllocation,
    canUndoAllocation,
    lastAllocation,
  } = useEnvelopes();

  const [allocatingEnvelope, setAllocatingEnvelope] = useState<EnvelopeWithAllocation | null>(null);
  const [transferringEnvelopeId, setTransferringEnvelopeId] = useState<string | null>(null);
  const [editingEnvelope, setEditingEnvelope] = useState<EnvelopeWithAllocation | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  // Segregate mandatory system envelopes (Spendable & Emergency) from user-created categories
  const systemEnvelopes = useMemo(() => {
    return envelopes.filter(
      (env) => env.isSystemReserved || env.slug === 'regular' || env.slug === 'emergency' || env.slug === 'spendable'
    );
  }, [envelopes]);

  const customEnvelopes = useMemo(() => {
    return envelopes.filter(
      (env) => !env.isSystemReserved && env.slug !== 'regular' && env.slug !== 'emergency' && env.slug !== 'spendable'
    );
  }, [envelopes]);

  const handleUndoAllocation = useCallback(async () => {
    if (!canUndoAllocation || isUndoing) return;
    setIsUndoing(true);
    try {
      const undone = await undoLastAllocation();
      if (undone) {
        showToast(
          `Reverted ${undone.envelopeName} budget to ${formatINR(undone.previousAllocatedPaise)}`,
          'info'
        );
      }
    } catch {
      showToast('Failed to undo allocation', 'error');
    } finally {
      setIsUndoing(false);
    }
  }, [canUndoAllocation, isUndoing, undoLastAllocation, showToast]);

  // Global keyboard shortcut: Ctrl+Z / Cmd+Z to undo last allocation when not focused on an input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (canUndoAllocation && !isUndoing) {
          e.preventDefault();
          handleUndoAllocation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndoAllocation, isUndoing, handleUndoAllocation]);

  return (
    <section id="envelope-budgeting" className="space-y-5 max-w-full overflow-hidden scroll-mt-20">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-sky-400" />
              <span>Envelope Budgeting</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-white/5 font-mono">
              {envelopes.length} categories
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Earmark monthly cash into isolated envelopes. Overspending in one never silently drains another.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canUndoAllocation && lastAllocation && (
            <button
              onClick={handleUndoAllocation}
              disabled={isUndoing}
              title={`Undo allocation: Restore ${lastAllocation.envelopeName} to ${formatINR(lastAllocation.previousAllocatedPaise)} (Ctrl+Z)`}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs sm:text-sm font-medium transition active:scale-95 min-h-[44px] sm:min-h-[38px] animate-fade-in shadow-sm cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isUndoing ? 'animate-spin' : ''}`} />
              <span>Undo Allocation</span>
              <span className="hidden md:inline text-[10px] text-amber-400/80 font-mono">
                ({lastAllocation.envelopeName})
              </span>
            </button>
          )}

          <BudgetPeriodSelector
            selectedPeriod={selectedPeriod}
            onPrev={prevPeriod}
            onNext={nextPeriod}
          />

          <button
            onClick={() => refresh()}
            title="Refresh Envelopes"
            className="p-2 sm:p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-400 hover:text-white transition shadow-sm min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Monthly Summary Statistics Strip (Watermelon UI Metric Block) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sm:p-5 rounded-2xl bg-[#0f1011] border border-white/10 shadow-lg">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Total Monthly Budget
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-white tabular-nums">
            {formatINR(totalAllocatedPaise)}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">Assigned to active envelopes</div>
        </div>

        <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-5">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Total Spent This Month
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-neutral-300 tabular-nums">
            {formatINR(totalSpentPaise)}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">Debited from allocations</div>
        </div>

        <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-5">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Total Available to Spend
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-emerald-400 tabular-nums">
            {formatINR(totalAvailablePaise)}
          </div>
          <div className="text-[10px] text-emerald-400/80 font-mono">Liquid safe spending capacity</div>
        </div>
      </div>

      {/* Envelope Cards Section (Segregated into Mandatory Core Reserves vs Custom User Categories) */}
      {isLoading && envelopes.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-5 space-y-4 animate-pulse border border-white/5 h-44"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-neutral-800" />
                <div className="w-28 h-4 rounded bg-neutral-800" />
              </div>
              <div className="w-36 h-7 rounded bg-neutral-800" />
              <div className="w-full h-2 rounded bg-neutral-800" />
            </div>
          ))}
        </div>
      ) : envelopes.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center space-y-3 border border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 mx-auto flex items-center justify-center text-neutral-400">
            <FolderPlus className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No Envelopes Found</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            You don&apos;t have any envelopes configured for this budget cycle.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition"
          >
            Create Your First Envelope
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Core & Mandatory Envelopes (Primary Flow & Emergency Reserve) */}
          {systemEnvelopes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">Core System Envelopes</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                        Mandatory
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Primary liquid spending pool and protected emergency reserve. Permanent system compartments.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {systemEnvelopes.map((env) => (
                  <EnvelopeCard
                    key={env.id}
                    envelope={env}
                    onAllocate={() => setAllocatingEnvelope(env)}
                    onTransfer={() => setTransferringEnvelopeId(env.id)}
                    onEdit={() => setEditingEnvelope(env)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Clean Visual Separator */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-mono text-neutral-500 bg-[#08090a] px-3">
              Custom Lifestyle & Budget Categories
            </div>
          </div>

          {/* Section 2: Custom User Categories */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">Custom Categories</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/10 font-medium">
                      {customEnvelopes.length} {customEnvelopes.length === 1 ? 'category' : 'categories'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Flexible envelopes tailored for your bills, hobbies, and monthly discretionary targets.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white text-xs font-medium transition self-start sm:self-auto active:scale-95 cursor-pointer min-h-[38px] sm:min-h-[32px]"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>New Envelope</span>
              </button>
            </div>

            {customEnvelopes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 sm:p-8 text-center space-y-2.5 bg-white/[0.01]">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 text-neutral-400 mx-auto flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div className="text-xs sm:text-sm font-semibold text-white">No Custom Categories Configured</div>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Compartmentalize your monthly budget by creating custom envelopes for Groceries, Dining, Gym, or Vacation.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
                >
                  + Create Your First Envelope
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customEnvelopes.map((env) => (
                  <EnvelopeCard
                    key={env.id}
                    envelope={env}
                    onAllocate={() => setAllocatingEnvelope(env)}
                    onTransfer={() => setTransferringEnvelopeId(env.id)}
                    onEdit={() => setEditingEnvelope(env)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AllocateModal
        isOpen={Boolean(allocatingEnvelope)}
        envelope={allocatingEnvelope}
        onClose={() => setAllocatingEnvelope(null)}
        onAllocate={async (envelopeId, amount) => {
          const prevAlloc = allocatingEnvelope?.allocatedPaise ?? 0n;
          const envName = allocatingEnvelope?.name ?? 'Envelope';
          await allocateFunds(envelopeId, amount);

          if (prevAlloc !== amount) {
            showToast(
              `Allocated ${formatINR(amount)} to ${envName}`,
              'success',
              7000,
              {
                label: 'Undo',
                onClick: async () => {
                  try {
                    const undone = await undoLastAllocation();
                    if (undone) {
                      showToast(
                        `Reverted ${undone.envelopeName} budget to ${formatINR(undone.previousAllocatedPaise)}`,
                        'info'
                      );
                    }
                  } catch {
                    showToast('Failed to undo allocation', 'error');
                  }
                },
              }
            );
          } else {
            showToast('Monthly envelope budget unchanged', 'info');
          }
        }}
      />

      <TransferModal
        isOpen={Boolean(transferringEnvelopeId)}
        envelopes={envelopes}
        initialFromEnvelopeId={transferringEnvelopeId ?? undefined}
        onClose={() => setTransferringEnvelopeId(null)}
        onTransfer={async (fromId, toId, amount) => {
          await transferFunds(fromId, toId, amount);
          const fromEnv = envelopes.find((e) => e.id === fromId)?.name ?? 'Envelope';
          const toEnv = envelopes.find((e) => e.id === toId)?.name ?? 'Envelope';

          showToast(
            `Moved ${formatINR(amount)} from ${fromEnv} to ${toEnv}`,
            'success',
            7000,
            {
              label: 'Undo',
              onClick: async () => {
                try {
                  await transferFunds(toId, fromId, amount);
                  showToast(
                    `Reverted transfer: ${formatINR(amount)} moved back to ${fromEnv}`,
                    'info'
                  );
                } catch {
                  showToast('Failed to revert envelope transfer', 'error');
                }
              },
            }
          );
        }}
      />

      <CreateEnvelopeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={async (data) => {
          await createEnvelope(data);
          showToast('New envelope category created', 'success');
        }}
      />

      <EditEnvelopeModal
        isOpen={Boolean(editingEnvelope)}
        envelope={editingEnvelope}
        onClose={() => setEditingEnvelope(null)}
        onUpdate={async (envId, data) => {
          await editEnvelope(envId, data);
          showToast('Envelope details updated', 'success');
        }}
        onDelete={async (envId) => {
          await removeEnvelope(envId);
          showToast('Envelope category deleted', 'info');
        }}
      />
    </section>
  );
};
