import React, { useState } from 'react';
import { X, Landmark, Wallet, Plus, AlertCircle, ArrowRight } from 'lucide-react';
import type { AccountItem } from '@/lib/api/accounts';
import type { AccountType } from '@/types/accounting.types';
import { toPaise, formatINR } from '@/lib/accounting/currency';

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
}

export const AccountListModal: React.FC<AccountListModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onAddAccount,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('savings');
  const [initialBalanceRupees, setInitialBalanceRupees] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="max-w-md w-full glass-card rounded-2xl p-6 sm:p-7 space-y-5 border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            <Landmark className="w-3.5 h-3.5" />
            <span>Liquid Cash Accounts</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Your Bank Accounts & Wallets</h2>
          <p className="text-xs text-neutral-400">
            Checking accounts, savings accounts, and physical cash. Excludes locked assets.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Existing Accounts List */}
        <div className="space-y-2">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-3.5 rounded-xl bg-neutral-900/80 border border-white/5 flex items-center justify-between"
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
                  <div className="text-xs font-semibold text-white">{acc.name}</div>
                  <div className="text-[11px] text-neutral-400">
                    {acc.institution} • <span className="capitalize">{acc.accountType}</span>
                  </div>
                </div>
              </div>
              <div className="font-mono text-sm font-bold text-white tabular-nums">
                {formatINR(acc.balancePaise)}
              </div>
            </div>
          ))}
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
                className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white placeholder-neutral-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400">Institution</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. HDFC, Cash"
                  required
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white placeholder-neutral-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400">Type</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white bg-neutral-900"
                >
                  <option value="savings">Savings</option>
                  <option value="checking">Checking</option>
                  <option value="cash">Cash Wallet</option>
                  <option value="other">Other Liquid</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-neutral-400">Current Balance (₹ INR)</label>
              <input
                type="number"
                step="any"
                value={initialBalanceRupees}
                onChange={(e) => setInitialBalanceRupees(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono text-white placeholder-neutral-500 tabular-nums"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-semibold transition"
              >
                <span>{isSubmitting ? 'Saving...' : 'Add Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-neutral-300 hover:text-white text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4 text-sky-400" />
            <span>Add Bank Account or Wallet</span>
          </button>
        )}
      </div>
    </div>
  );
};
