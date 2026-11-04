import React, { useState, useCallback, useEffect } from 'react';
import {
  Layers,
  Plus,
  RefreshCw,
  FolderPlus,
  RotateCcw,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { useEnvelopes } from '@/hooks/useEnvelopes';
import { useAccounts } from '@/hooks/useAccounts';
import { EnvelopeCard } from './EnvelopeCard';
import { AllocateModal } from './AllocateModal';
import { TransferModal } from './TransferModal';
import { EditEnvelopeModal } from './EditEnvelopeModal';
import { CreateEnvelopeModal } from './CreateEnvelopeModal';
import { EnvelopeAllocationViewModal } from './EnvelopeAllocationViewModal';
import { BudgetPeriodSelector } from './BudgetPeriodSelector';
import { formatINR } from '@/lib/accounting/currency';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import type { AccountItem } from '@/lib/api/accounts';
import { useToast } from '@/context/ToastContext';

interface EnvelopeGridProps {
  accounts?: AccountItem[];
  onRefreshAccounts?: () => Promise<void>;
}

export const EnvelopeGrid: React.FC<EnvelopeGridProps> = ({
  accounts: accountsProp,
  onRefreshAccounts,
}) => {
  const { showToast } = useToast();
  const {
    envelopes,
    isLoading,
    totalAllocatedPaise,
    totalSpentPaise,
    totalAvailablePaise,
    selectedPeriod,
    prevPeriod,
    nextPeriod,
    allocateFunds,
    transferFunds,
    createEnvelope,
    editEnvelope,
    removeEnvelope,
    reorderEnvelopes,
    refresh,
    undoLastAllocation,
    canUndoAllocation,
    lastAllocation,
  } = useEnvelopes();

  const { accounts: internalAccounts, refreshAccounts: internalRefresh } = useAccounts();
  const accounts = accountsProp ?? internalAccounts;
  const refreshAccounts = onRefreshAccounts ?? internalRefresh;

  const [allocatingEnvelope, setAllocatingEnvelope] = useState<EnvelopeWithAllocation | null>(null);
  const [viewingAllocationEnvelope, setViewingAllocationEnvelope] = useState<EnvelopeWithAllocation | null>(null);
  const [transferringEnvelopeId, setTransferringEnvelopeId] = useState<string | null>(null);
  const [editingEnvelope, setEditingEnvelope] = useState<EnvelopeWithAllocation | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

  // Tactile arrow reordering (Move left/earlier or right/later)
  const handleMove = useCallback(
    (currentIndex: number, direction: 'left' | 'right') => {
      const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= envelopes.length) return;
      const newOrder = [...envelopes];
      const [moved] = newOrder.splice(currentIndex, 1);
      newOrder.splice(targetIndex, 0, moved);
      reorderEnvelopes(newOrder.map((e) => e.id));
    },
    [envelopes, reorderEnvelopes]
  );

  // HTML5 Drag and drop reordering
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLElement>, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLElement>, targetIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === targetIndex) return;

      const newOrder = [...envelopes];
      const [moved] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, moved);
      reorderEnvelopes(newOrder.map((e) => e.id));
      setDraggedIndex(null);
    },
    [draggedIndex, envelopes, reorderEnvelopes]
  );

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
            Earmark monthly funds into isolated envelopes. Every envelope can be edited, rearranged, or deleted.
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
            className="p-2 sm:p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-400 hover:text-white transition shadow-sm min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Monthly Summary Statistics Strip */}
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
            Total Available Balance
          </div>
          <div
            className={`text-xl font-bold font-mono tracking-tight tabular-nums ${
              totalAvailablePaise < 0n ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {formatINR(totalAvailablePaise)}
          </div>
          <div
            className={`text-[10px] font-mono ${
              totalAvailablePaise < 0n ? 'text-rose-400/80 font-medium' : 'text-emerald-400/80'
            }`}
          >
            {totalAvailablePaise < 0n ? 'Deficit (overspent allocations)' : 'Remaining spending capacity'}
          </div>
        </div>
      </div>

      {/* Category Header Strip, Rearrange Mode & New Envelope Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs sm:text-sm font-semibold text-white tracking-tight">Envelope Allocations</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/10 font-medium">
            {envelopes.length} {envelopes.length === 1 ? 'envelope' : 'envelopes'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {envelopes.length > 1 && (
            <button
              onClick={() => setIsReorderMode((prev) => !prev)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer min-h-[44px] sm:min-h-[36px] ${
                isReorderMode
                  ? 'bg-sky-500 text-neutral-950 shadow-md shadow-sky-500/25 ring-2 ring-sky-400/40'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-white/10 hover:text-white'
              }`}
              title="Rearrange envelope display order"
            >
              {isReorderMode ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Done Reordering</span>
                </>
              ) : (
                <>
                  <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
                  <span>Rearrange</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-neutral-950 font-bold text-xs transition active:scale-95 cursor-pointer min-h-[44px] sm:min-h-[36px] shadow-md shadow-sky-500/20"
          >
            <Plus className="w-4 h-4 text-neutral-950 stroke-[2.5]" />
            <span>New Envelope</span>
          </button>
        </div>
      </div>

      {/* Rearrange Mode Instructions Banner */}
      {isReorderMode && envelopes.length > 1 && (
        <div className="flex items-center justify-center gap-2 p-3 sm:p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs animate-fade-in shadow-inner text-center">
          <ArrowUpDown className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span>
            <strong>Rearrange Mode Active:</strong> Click the arrows or drag cards to change their order. Your custom sequence is saved automatically.
          </span>
        </div>
      )}

      {/* Envelope Cards Section */}
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
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition cursor-pointer"
          >
            Create Your First Envelope
          </button>
        </div>
      ) : (
        <div id="core-system-envelopes" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 scroll-mt-24">
          {envelopes.map((env, index) => (
            <EnvelopeCard
              key={env.id}
              envelope={env}
              index={index}
              totalCount={envelopes.length}
              isReorderMode={isReorderMode}
              onAllocate={() => setAllocatingEnvelope(env)}
              onTransfer={() => setTransferringEnvelopeId(env.id)}
              onEdit={() => setEditingEnvelope(env)}
              onViewAllocation={() => setViewingAllocationEnvelope(env)}
              onMoveLeft={() => handleMove(index, 'left')}
              onMoveRight={() => handleMove(index, 'right')}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AllocateModal
        isOpen={Boolean(allocatingEnvelope)}
        envelope={allocatingEnvelope}
        accounts={accounts}
        onRefreshAccounts={refreshAccounts}
        onClose={() => setAllocatingEnvelope(null)}
        onAllocate={async (envelopeId, amount, sources) => {
          const prevAlloc = allocatingEnvelope?.allocatedPaise ?? 0n;
          const envName = allocatingEnvelope?.name ?? 'Envelope';
          await allocateFunds(envelopeId, amount, sources);
          await refreshAccounts();

          if (prevAlloc !== amount) {
            showToast(`Allocated ${formatINR(amount)} to ${envName}`, 'success');
          }
        }}
      />

      {/* View Backing Allocation Sources Modal */}
      <EnvelopeAllocationViewModal
        isOpen={Boolean(viewingAllocationEnvelope)}
        envelope={viewingAllocationEnvelope}
        accounts={accounts}
        onClose={() => setViewingAllocationEnvelope(null)}
        onModifyBudget={() => {
          const target = viewingAllocationEnvelope;
          setViewingAllocationEnvelope(null);
          if (target) setAllocatingEnvelope(target);
        }}
      />

      <TransferModal
        isOpen={Boolean(transferringEnvelopeId)}
        sourceEnvelopeId={transferringEnvelopeId ?? undefined}
        envelopes={envelopes}
        onClose={() => setTransferringEnvelopeId(null)}
        onTransfer={async (fromId, toId, amount) => {
          const fromEnv = envelopes.find((e) => e.id === fromId);
          const toEnv = envelopes.find((e) => e.id === toId);
          await transferFunds(fromId, toId, amount);
          showToast(
            `Transferred ${formatINR(amount)} from ${fromEnv?.name || 'source'} to ${toEnv?.name || 'destination'}`,
            'success'
          );
        }}
      />

      <EditEnvelopeModal
        envelope={editingEnvelope}
        isOpen={Boolean(editingEnvelope)}
        onClose={() => setEditingEnvelope(null)}
        onUpdate={async (id, data) => {
          await editEnvelope(id, data);
          showToast('Updated envelope details', 'success');
        }}
        onDelete={async (id) => {
          await removeEnvelope(id);
          showToast('Envelope deleted successfully', 'info');
        }}
      />

      <CreateEnvelopeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={async (data) => {
          await createEnvelope(data);
          showToast(`Created envelope "${data.name}"`, 'success');
        }}
      />
    </section>
  );
};
