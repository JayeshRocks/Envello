import React from 'react';
import { ArrowRight, Landmark, Check } from 'lucide-react';
import type { EnvelopeRolloverPolicy } from '@/types/accounting.types';

interface RolloverPolicySelectorProps {
  value: EnvelopeRolloverPolicy;
  onChange: (policy: EnvelopeRolloverPolicy) => void;
  disabled?: boolean;
}

export const RolloverPolicySelector: React.FC<RolloverPolicySelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const isCarryForward = value === 'carry_forward';
  const isRelease = value === 'reset' || value === 'sweep_to_regular';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-neutral-300">
          Month-End Rollover Policy
        </label>
        <span className="text-[10px] text-neutral-400 font-mono">
          {isCarryForward ? 'Reserved in envelope' : 'Returned to bank accounts'}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Month-End Rollover Policy"
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
      >
        {/* Option 1: Carry Forward */}
        <button
          type="button"
          role="radio"
          aria-checked={isCarryForward}
          disabled={disabled}
          onClick={() => onChange('carry_forward')}
          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2.5 relative group active:scale-[0.98] ${
            isCarryForward
              ? 'bg-sky-500/10 border-sky-500/50 ring-1 ring-sky-500/30 shadow-lg shadow-sky-500/10'
              : 'bg-neutral-900/60 border-white/10 hover:border-white/20 hover:bg-white/[0.02] text-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2.5">
              <div
                className={`p-2 rounded-xl transition-colors ${
                  isCarryForward
                    ? 'bg-sky-500/20 text-sky-400 shadow-sm'
                    : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
                }`}
              >
                <ArrowRight className="w-4 h-4" />
              </div>
              <div>
                <div
                  className={`text-xs sm:text-sm font-bold tracking-tight ${
                    isCarryForward ? 'text-white' : 'text-neutral-200'
                  }`}
                >
                  Carry Forward
                </div>
                <div className="text-[10px] text-neutral-400">Preserve holds</div>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                isCarryForward
                  ? 'border-sky-400 bg-sky-500 text-neutral-950 shadow-sm shadow-sky-500/30'
                  : 'border-white/20 bg-neutral-950/60'
              }`}
            >
              {isCarryForward && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
            Keep unspent funds and backing account holds reserved in this envelope into next month.
          </p>
        </button>

        {/* Option 2: Release to Liquid Accounts */}
        <button
          type="button"
          role="radio"
          aria-checked={isRelease}
          disabled={disabled}
          onClick={() => onChange('reset')}
          className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2.5 relative group active:scale-[0.98] ${
            isRelease
              ? 'bg-sky-500/10 border-sky-500/50 ring-1 ring-sky-500/30 shadow-lg shadow-sky-500/10'
              : 'bg-neutral-900/60 border-white/10 hover:border-white/20 hover:bg-white/[0.02] text-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2.5">
              <div
                className={`p-2 rounded-xl transition-colors ${
                  isRelease
                    ? 'bg-sky-500/20 text-sky-400 shadow-sm'
                    : 'bg-white/5 text-neutral-400 group-hover:text-neutral-300'
                }`}
              >
                <Landmark className="w-4 h-4" />
              </div>
              <div>
                <div
                  className={`text-xs sm:text-sm font-bold tracking-tight ${
                    isRelease ? 'text-white' : 'text-neutral-200'
                  }`}
                >
                  Release to Accounts
                </div>
                <div className="text-[10px] text-neutral-400">Free unallocated</div>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                isRelease
                  ? 'border-sky-400 bg-sky-500 text-neutral-950 shadow-sm shadow-sky-500/30'
                  : 'border-white/20 bg-neutral-950/60'
              }`}
            >
              {isRelease && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
            Release unspent funds and account holds at month-end back to your bank accounts&apos; spendable balance.
          </p>
        </button>
      </div>
    </div>
  );
};
