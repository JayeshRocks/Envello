import React, { useState } from 'react';
import { X, Landmark, ShieldAlert, Sparkles, RotateCcw } from 'lucide-react';
import type { AccountItem } from '@/lib/api/accounts';
import type { DepositType } from '@/lib/api/fixedDeposits';
import { toPaise, formatINR } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

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
    deposit_type?: DepositType;
    monthly_deposit_paise?: number;
    funding_account_id?: string;
  }) => Promise<void>;
}

export const AddFixedDepositModal: React.FC<AddFixedDepositModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onAddFD,
}) => {
  const [depositType, setDepositType] = useState<DepositType>('fd');
  const [institution, setInstitution] = useState('');
  const [principalRupees, setPrincipalRupees] = useState('');
  const [monthlyRupees, setMonthlyRupees] = useState('5000');
  const [interestRate, setInterestRate] = useState('7.5'); // Standard bank deposit rate default
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [tenureMonths, setTenureMonths] = useState(12);
  const [maturityRupees, setMaturityRupees] = useState('');
  const [fundingAccountId, setFundingAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  // Calculate estimated maturity date & compound interest estimate for FD & RD
  const handleAutoEstimateMaturity = () => {
    const r = parseFloat(interestRate);
    if (isNaN(r) || r <= 0) return;

    if (depositType === 'fd') {
      const p = parseFloat(principalRupees);
      if (!isNaN(p) && p > 0) {
        // Annual compound interest: A = P * (1 + r/100)^(tenureMonths / 12)
        const t = tenureMonths / 12;
        const a = p * Math.pow(1 + r / 100, t);
        setMaturityRupees(Math.round(a).toString());
      }
    } else if (depositType === 'rd') {
      const m = parseFloat(monthlyRupees);
      if (!isNaN(m) && m > 0) {
        // Standard RD interest formula: I = M * (n * (n + 1) / (2 * 12)) * (r / 100)
        const totalInvested = m * tenureMonths;
        const interest = m * ((tenureMonths * (tenureMonths + 1)) / 24) * (r / 100);
        setPrincipalRupees(Math.round(totalInvested).toString());
        setMaturityRupees(Math.round(totalInvested + interest).toString());
      }
    }
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

    const rate = parseFloat(interestRate);
    if (isNaN(rate) || rate <= 0) {
      setError('Please enter a valid interest rate.');
      return;
    }

    let p = 0;
    let m = 0;
    let monthlyPaise = 0;

    if (depositType === 'rd') {
      const mVal = parseFloat(monthlyRupees);
      if (isNaN(mVal) || mVal <= 0) {
        setError('Please enter a valid monthly deposit amount for the RD.');
        return;
      }
      p = mVal * tenureMonths;
      monthlyPaise = Number(toPaise(mVal));
      const estInterest = mVal * ((tenureMonths * (tenureMonths + 1)) / 24) * (rate / 100);
      m = parseFloat(maturityRupees) || Math.round(p + estInterest);
    } else {
      const pVal = parseFloat(principalRupees);
      if (isNaN(pVal) || pVal <= 0) {
        setError('Please enter a valid principal balance.');
        return;
      }
      p = pVal;
      const t = tenureMonths / 12;
      m = parseFloat(maturityRupees) || Math.round(p * Math.pow(1 + rate / 100, t));
    }

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
        deposit_type: depositType,
        monthly_deposit_paise: monthlyPaise,
        funding_account_id: fundingAccountId || undefined,
      });

      setPrincipalRupees('');
      setMaturityRupees('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create term deposit';
      setError(msg);
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
        <div className="bg-neutral-900 border border-white/15 w-full max-w-lg rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl modal-panel max-h-[90vh] sm:max-h-[88vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Add Term Deposit</h3>
                <p className="text-xs text-neutral-400">Fixed Deposits (FD) & Recurring Deposits (RD)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center active:scale-95 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Instrument Type Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-950 border border-white/10 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setDepositType('fd');
                setInterestRate('7.5');
              }}
              className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg transition-all active:scale-95 cursor-pointer min-h-[44px] sm:min-h-[36px] ${
                depositType === 'fd'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>FD</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDepositType('rd');
                setInterestRate('7.1');
              }}
              className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg transition-all active:scale-95 cursor-pointer min-h-[44px] sm:min-h-[36px] ${
                depositType === 'rd'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>RD</span>
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
              <label className="block text-neutral-400 font-medium mb-1">
                {depositType === 'fd'
                  ? 'Bank / NBFC Issuer'
                  : 'Bank / Post Office / RD Provider'}
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder={
                  depositType === 'fd'
                    ? 'e.g. HDFC Bank, SBI, ICICI, Bajaj Finance, Stable Money'
                    : 'e.g. State Bank of India RD, India Post RD, Kotak RD'
                }
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            {/* Recurring Deposit Monthly Amount */}
            {depositType === 'rd' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-medium mb-1">Monthly Deposit (₹ / mo)</label>
                  <input
                    type="number"
                    step="any"
                    value={monthlyRupees}
                    onChange={(e) => {
                      setMonthlyRupees(e.target.value);
                      const m = parseFloat(e.target.value);
                      if (!isNaN(m)) {
                        setPrincipalRupees((m * tenureMonths).toString());
                      }
                    }}
                    placeholder="5000"
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                  <span className="text-[10px] text-amber-400/90 mt-1 block">
                    Total principal over {tenureMonths} mo: {formatINR(toPaise(parseFloat(monthlyRupees || '0') * tenureMonths))}
                  </span>
                </div>
                <div>
                  <label className="block text-neutral-400 font-medium mb-1">Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="7.10"
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-medium mb-1">
                    Principal Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={principalRupees}
                    onChange={(e) => setPrincipalRupees(e.target.value)}
                    placeholder="50000"
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
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
                    placeholder="7.50"
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-medium mb-1">Tenure</label>
                <select
                  value={tenureMonths}
                  onChange={(e) => {
                    const t = parseInt(e.target.value);
                    setTenureMonths(t);
                    if (depositType === 'rd') {
                      const m = parseFloat(monthlyRupees);
                      if (!isNaN(m)) setPrincipalRupees((m * t).toString());
                    }
                  }}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-amber-500"
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
                <label className="text-neutral-400 font-medium">
                  Target Maturity Amount (₹)
                </label>
                <button
                  type="button"
                  onClick={handleAutoEstimateMaturity}
                  className="text-[11px] text-amber-400 hover:underline flex items-center space-x-1 min-h-[32px] cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto Calculate</span>
                </button>
              </div>
              <input
                type="number"
                step="any"
                value={maturityRupees}
                onChange={(e) => setMaturityRupees(e.target.value)}
                placeholder="e.g. 54800"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                required
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">
                Maturity Date: {getComputedMaturityDate()}
              </span>
            </div>

            {accounts.length > 0 && (
              <div>
                <label className="block text-neutral-400 font-medium mb-1">
                  {depositType === 'rd' ? 'Debit First Month From (Optional)' : 'Fund From Bank Account (Optional)'}
                </label>
                <select
                  value={fundingAccountId}
                  onChange={(e) => setFundingAccountId(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-amber-500"
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
                className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-5 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold shadow-lg shadow-amber-500/20 disabled:opacity-50 transition active:scale-95 cursor-pointer"
              >
                {isSubmitting
                  ? 'Saving...'
                  : depositType === 'rd'
                  ? 'Add Recurring Deposit'
                  : 'Add Fixed Deposit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
