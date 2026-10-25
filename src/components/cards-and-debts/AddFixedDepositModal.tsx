import React, { useState } from 'react';
import { X, Landmark, ShieldAlert, Sparkles } from 'lucide-react';
import type { AccountItem } from '@/lib/api/accounts';
import { toPaise, formatINR } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface AddFixedDepositModalProps {
  isOpen: boolean;
  accounts: AccountItem[];
  onClose: () => void;
  onAddFD: (params: {
    institution: string;
    principal_paise: number;
    interest_rate_percent: number;
    start_date: string;
    maturity_date: string;
    maturity_amount_paise: number;
    funding_account_id?: string;
  }) => Promise<void>;
}

export const AddFixedDepositModal: React.FC<AddFixedDepositModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onAddFD,
}) => {
  const [institution, setInstitution] = useState('Super.Money');
  const [principalRupees, setPrincipalRupees] = useState('');
  const [interestRate, setInterestRate] = useState('9.5'); // Default high rate for Super.Money / NBFC FDs
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [tenureMonths, setTenureMonths] = useState(12);
  const [maturityRupees, setMaturityRupees] = useState('');
  const [fundingAccountId, setFundingAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick } = useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  // Calculate estimated maturity date & simple compound interest estimate
  const handleAutoEstimateMaturity = () => {
    const p = parseFloat(principalRupees);
    const r = parseFloat(interestRate);
    if (!isNaN(p) && p > 0 && !isNaN(r) && r > 0) {
      // Annual compound interest approx: A = P * (1 + r/100)^(tenureMonths / 12)
      const t = tenureMonths / 12;
      const a = p * Math.pow(1 + r / 100, t);
      setMaturityRupees(Math.round(a).toString());
    }
    // Update maturity date based on tenure
    const start = new Date(startDate);
    start.setMonth(start.getMonth() + tenureMonths);
    // ensure date valid
  };

  const getComputedMaturityDate = () => {
    const d = new Date(startDate || new Date().toISOString().split('T')[0]);
    d.setMonth(d.getMonth() + tenureMonths);
    return d.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!institution.trim()) {
      setError('Institution name is required.');
      return;
    }

    const p = parseFloat(principalRupees);
    if (isNaN(p) || p <= 0) {
      setError('Please enter a valid principal amount.');
      return;
    }

    const rate = parseFloat(interestRate);
    if (isNaN(rate) || rate <= 0) {
      setError('Please enter a valid interest rate.');
      return;
    }

    const m = parseFloat(maturityRupees) || p * (1 + (rate * tenureMonths) / 1200);

    try {
      setIsSubmitting(true);
      const principalPaise = Number(toPaise(p));
      const maturityPaise = Number(toPaise(m));
      const maturityDate = getComputedMaturityDate();

      await onAddFD({
        institution: institution.trim(),
        principal_paise: principalPaise,
        interest_rate_percent: rate,
        start_date: startDate,
        maturity_date: maturityDate,
        maturity_amount_paise: maturityPaise,
        funding_account_id: fundingAccountId || undefined,
      });

      setPrincipalRupees('');
      setMaturityRupees('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create fixed deposit';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="glass-card w-full max-w-md rounded-t-3xl sm:rounded-2xl border-t sm:border border-white/10 p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl modal-panel max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-2 sm:hidden flex-shrink-0" />
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Add Fixed Deposit</h3>
              <p className="text-xs text-neutral-400">Locked assets (Super.Money, Bank FDs)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[38px] min-w-[38px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-neutral-400 font-medium mb-1">Platform / Institution</label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. Super.Money (Utkarsh SFB), HDFC, SBI"
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Principal Amount (₹)</label>
              <input
                type="number"
                step="any"
                value={principalRupees}
                onChange={(e) => setPrincipalRupees(e.target.value)}
                placeholder="50000"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Interest Rate (% p.a.)</label>
              <input
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="9.50"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Tenure (Months)</label>
              <select
                value={tenureMonths}
                onChange={(e) => setTenureMonths(parseInt(e.target.value))}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>1 Year (12 Months)</option>
                <option value={24}>2 Years (24 Months)</option>
                <option value={36}>3 Years (36 Months)</option>
                <option value={60}>5 Years (60 Months)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-neutral-400 font-medium">Maturity Amount (₹)</label>
              <button
                type="button"
                onClick={handleAutoEstimateMaturity}
                className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto Estimate</span>
              </button>
            </div>
            <input
              type="number"
              step="any"
              value={maturityRupees}
              onChange={(e) => setMaturityRupees(e.target.value)}
              placeholder="e.g. 54800"
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
              required
            />
            <span className="text-[10px] text-neutral-500 mt-1 block">
              Maturity Date: {getComputedMaturityDate()}
            </span>
          </div>

          {accounts.length > 0 && (
            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Fund From Bank Account (Optional)
              </label>
              <select
                value={fundingAccountId}
                onChange={(e) => setFundingAccountId(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">None (Already funded externally)</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution}) — Balance: {formatINR(acc.balancePaise)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Creating...' : 'Create Fixed Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
