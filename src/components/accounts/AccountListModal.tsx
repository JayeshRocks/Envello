import React, { useState } from 'react';
import { X, Landmark, Wallet, Plus, AlertCircle, Edit2, Trash2, Check, ArrowRight, Scale } from 'lucide-react';
import type { AccountItem } from '@/lib/api/accounts';
import type { AccountType } from '@/types/accounting.types';
import { toPaise, formatINR } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

interface AccountListModalProps {
  isOpen: boolean;
  accounts: AccountItem[];
  onClose: () => void;
  onAddAccount: (params: {
    name: string;
    institution: string;
    accountType: AccountType;
    initialBalancePaise?: bigint;
  }) => Promise<void>;
  onEditAccount?: (
    accountId: string,
    params: {
      name?: string;
      institution?: string;
      accountType?: AccountType;
      balancePaise?: bigint;
    }
  ) => Promise<void>;
  onDeleteAccount?: (accountId: string) => Promise<void>;
  onOpenReconcileModal?: (accountId: string) => void;
}

export const AccountListModal: React.FC<AccountListModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onOpenReconcileModal,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // New account form state
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('savings');
  const [initialBalanceRupees, setInitialBalanceRupees] = useState('');

  // Edit account form state
  const [editName, setEditName] = useState('');
  const [editInstitution, setEditInstitution] = useState('');
  const [editAccountType, setEditAccountType] = useState<AccountType>('savings');
  const [editBalanceRupees, setEditBalanceRupees] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  const handleStartEdit = (acc: AccountItem) => {
    setEditingAccountId(acc.id);
    setEditName(acc.name);
    setEditInstitution(acc.institution);
    setEditAccountType(acc.accountType);
    setEditBalanceRupees((Number(acc.balancePaise) / 100).toFixed(2));
    setIsAdding(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccountId || !onEditAccount) return;
    setError(null);

    if (!editName.trim() || !editInstitution.trim()) {
      setError('Please provide account name and institution.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newBalPaise = toPaise(editBalanceRupees || '0');
      await onEditAccount(editingAccountId, {
        name: editName.trim(),
        institution: editInstitution.trim(),
        accountType: editAccountType,
        balancePaise: newBalPaise,
      });
      setEditingAccountId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (accountId: string, accountName: string) => {
    if (!onDeleteAccount) return;
    if (!window.confirm(`Are you sure you want to delete or deactivate "${accountName}"?`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onDeleteAccount(accountId);
      if (editingAccountId === accountId) setEditingAccountId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !institution.trim()) {
      setError('Please provide account name and institution.');
      return;
    }

    const initPaise = toPaise(initialBalanceRupees || '0');

    setIsSubmitting(true);
    try {
      await onAddAccount({
        name: name.trim(),
        institution: institution.trim(),
        accountType,
        initialBalancePaise: initPaise,
      });
      setName('');
      setInstitution('');
      setInitialBalanceRupees('');
      setIsAdding(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account.');
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
          aria-label="Close Accounts Modal"
          className="absolute top-4 right-4 p-2 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center active:scale-95 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            <Landmark className="w-3.5 h-3.5" />
            <span>Liquid Cash Accounts</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Manage Accounts & Wallets</h2>
          <p className="text-xs text-neutral-400">
            Checking accounts, savings accounts, and physical cash. Edit nicknames, reconcile balances, or add new accounts.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Existing Accounts List */}
        <div className="space-y-2.5">
          {accounts.map((acc) => {
            const isEditing = editingAccountId === acc.id;

            if (isEditing) {
              return (
                <form
                  key={acc.id}
                  onSubmit={handleSaveEdit}
                  className="p-4 rounded-xl bg-neutral-900 border border-sky-500/40 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-sky-400">
                    <span>Edit Account Details</span>
                    <button
                      type="button"
                      onClick={() => setEditingAccountId(null)}
                      className="text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-400">Account Nickname</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-base sm:text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400">Bank / Institution</label>
                      <input
                        type="text"
                        value={editInstitution}
                        onChange={(e) => setEditInstitution(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-base sm:text-sm text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-400">Account Type</label>
                      <select
                        value={editAccountType}
                        onChange={(e) => setEditAccountType(e.target.value as AccountType)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-base sm:text-sm text-white capitalize"
                      >
                        <option value="savings">Savings</option>
                        <option value="checking">Checking</option>
                        <option value="cash">Cash in hand</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-neutral-400">Reconciled Balance (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={editBalanceRupees}
                      onChange={(e) => setEditBalanceRupees(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-base sm:text-sm text-white font-mono"
                    />
                    <span className="text-[10px] text-neutral-500 block">
                      Directly aligns your ledger balance with your physical bank balance.
                    </span>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    {onDeleteAccount && (
                      <button
                        type="button"
                        onClick={() => handleDelete(acc.id, acc.name)}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center space-x-1 min-h-[38px] px-2 py-1 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="ml-auto px-4 py-2 min-h-[38px] rounded-lg bg-sky-600 hover:bg-sky-500 text-xs text-white font-medium flex items-center space-x-1.5 shadow-md active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div
                key={acc.id}
                className="p-3.5 rounded-xl bg-neutral-900/80 border border-white/5 flex items-center justify-between group hover:border-white/15 transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-sky-400">
                    {acc.accountType === 'cash' ? (
                      <Wallet className="w-4 h-4" />
                    ) : (
                      <Landmark className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
                      <span>{acc.name}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      {acc.institution} • <span className="capitalize">{acc.accountType}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="font-mono text-sm font-bold text-white tabular-nums">
                    {formatINR(acc.balancePaise)}
                  </div>
                  <div className="flex items-center space-x-1">
                    {onOpenReconcileModal && (
                      <button
                        onClick={() => {
                          onOpenReconcileModal(acc.id);
                        }}
                        aria-label={`Reconcile ${acc.name} with bank statement`}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-white/5 transition"
                        title="Reconcile against bank statement"
                      >
                        <Scale className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onEditAccount && (
                      <button
                        onClick={() => handleStartEdit(acc)}
                        aria-label={`Edit ${acc.name}`}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-sky-400 hover:bg-white/5 transition"
                        title="Edit Account Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Account Section */}
        {isAdding ? (
          <form onSubmit={handleCreate} className="space-y-3 p-4 rounded-xl bg-neutral-900/50 border border-white/5">
            <div className="text-xs font-semibold text-neutral-200">Add New Liquid Account</div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-neutral-400">Account Nickname</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. HDFC Salary, SBI Daily, Pocket Cash"
                required
                className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400">Bank / Institution</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. HDFC, ICICI, Cash"
                  required
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400">Account Type</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white capitalize"
                >
                  <option value="savings">Savings</option>
                  <option value="checking">Checking</option>
                  <option value="cash">Cash in hand</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-neutral-400">Current Balance (₹)</label>
              <input
                type="number"
                step="any"
                value={initialBalanceRupees}
                onChange={(e) => setInitialBalanceRupees(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 font-mono"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 min-h-[42px] rounded-xl text-xs text-neutral-400 hover:text-white transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 min-h-[42px] rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-neutral-950 flex items-center space-x-1.5 shadow-md shadow-sky-500/10 transition active:scale-95"
              >
                <span>{isSubmitting ? 'Creating...' : 'Confirm'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingAccountId(null);
            }}
            className="w-full py-3 min-h-[44px] rounded-xl border border-dashed border-white/10 hover:border-sky-500/40 text-neutral-400 hover:text-sky-300 text-xs font-medium flex items-center justify-center space-x-1.5 transition active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Another Account</span>
          </button>
        )}
      </div>
    </div>
  </ModalPortal>
);
};
