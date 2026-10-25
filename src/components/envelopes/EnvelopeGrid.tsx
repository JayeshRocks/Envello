import React, { useState } from 'react';
import { Plus, FolderPlus, RefreshCw, Layers } from 'lucide-react';
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
  } = useEnvelopes();

  const [allocatingEnvelope, setAllocatingEnvelope] = useState<EnvelopeWithAllocation | null>(null);
  const [transferringEnvelopeId, setTransferringEnvelopeId] = useState<string | null>(null);
  const [editingEnvelope, setEditingEnvelope] = useState<EnvelopeWithAllocation | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <section className="space-y-5">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold tracking-tight text-white flex items-center space-x-2">
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

        <div className="flex items-center space-x-2.5">
          <BudgetPeriodSelector
            selectedPeriod={selectedPeriod}
            onPrev={prevPeriod}
            onNext={nextPeriod}
          />

          <button
            onClick={() => refresh()}
            title="Refresh Envelopes"
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-400 hover:text-white transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-white/10 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Envelope</span>
          </button>
        </div>
      </div>

      {/* Monthly Summary Statistics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-neutral-900/60 border border-white/5">
        <div className="space-y-0.5">
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Total Monthly Budget
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-white tabular-nums">
            {formatINR(totalAllocatedPaise)}
          </div>
        </div>

        <div className="space-y-0.5 sm:border-l sm:border-white/5 sm:pl-4">
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Total Spent This Month
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-neutral-300 tabular-nums">
            {formatINR(totalSpentPaise)}
          </div>
        </div>

        <div className="space-y-0.5 sm:border-l sm:border-white/5 sm:pl-4">
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Total Available to Spend
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-emerald-400 tabular-nums">
            {formatINR(totalAvailablePaise)}
          </div>
        </div>
      </div>

      {/* Envelope Cards Grid */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {envelopes.map((env) => (
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

      {/* Modals */}
      <AllocateModal
        isOpen={Boolean(allocatingEnvelope)}
        envelope={allocatingEnvelope}
        onClose={() => setAllocatingEnvelope(null)}
        onAllocate={async (envelopeId, amount) => {
          await allocateFunds(envelopeId, amount);
          showToast('Monthly envelope budget set', 'success');
        }}
      />

      <TransferModal
        isOpen={Boolean(transferringEnvelopeId)}
        envelopes={envelopes}
        initialFromEnvelopeId={transferringEnvelopeId ?? undefined}
        onClose={() => setTransferringEnvelopeId(null)}
        onTransfer={async (fromId, toId, amount) => {
          await transferFunds(fromId, toId, amount);
          showToast('Funds reallocated between envelopes', 'success');
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
