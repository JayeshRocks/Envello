import React, { useState, useRef, useEffect } from 'react';
import { Landmark, Scale, ChevronDown } from 'lucide-react';

interface AccountsDropdownProps {
  accountsCount: number;
  onOpenAccountsModal: () => void;
  onOpenReconcileModal: () => void;
}

export const AccountsDropdown: React.FC<AccountsDropdownProps> = ({
  accountsCount,
  onOpenAccountsModal,
  onOpenReconcileModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click, touch, window scroll, or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerOrTouchOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerOrTouchOutside);
    document.addEventListener('touchstart', handlePointerOrTouchOutside, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerOrTouchOutside);
      document.removeEventListener('touchstart', handlePointerOrTouchOutside);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Accounts Pill Trigger Button */}
      <button
        type="button"
        id="header-accounts-dropdown"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Liquid Accounts & Reconciliation"
        className="flex items-center space-x-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs sm:text-sm font-medium border border-white/10 hover:border-white/20 active:scale-95 transition-all duration-200 min-h-[44px] sm:min-h-[38px] cursor-pointer shadow-sm group"
      >
        <Landmark className="w-3.5 h-3.5 text-sky-400 group-hover:scale-105 transition-transform" />
        <span>Accounts</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sky-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu directly under the accounts pill */}
      <div
        className={`absolute right-0 mt-2 w-[min(calc(100vw-24px),19rem)] rounded-2xl border border-neutral-700/80 bg-neutral-950 shadow-2xl shadow-black/95 z-50 overflow-hidden divide-y divide-neutral-800/80 transform origin-top-right transition-all duration-200 ease-out ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto visible'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none invisible'
        }`}
        role="menu"
        aria-hidden={!isOpen}
      >
        {/* Header badge */}
        <div className="px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Landmark className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-xs font-semibold text-white">Liquid Cash Accounts</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 font-medium">
            {accountsCount} {accountsCount === 1 ? 'Account' : 'Accounts'}
          </span>
        </div>

        <div className="p-1.5 space-y-1">
          {/* Option 1: Manage Accounts & Wallets */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onOpenAccountsModal();
            }}
            className="w-full flex items-center space-x-3 p-2.5 rounded-xl text-left hover:bg-neutral-900 transition active:scale-95 group min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:bg-sky-500/20 group-hover:scale-105 transition-all flex-shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors">
                Manage Accounts & Wallets
              </div>
              <p className="text-[11px] text-neutral-400 truncate">
                Checking, savings, cash balances & holds
              </p>
            </div>
          </button>

          {/* Option 2: Reconcile Balances (Moved from Main Page) */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onOpenReconcileModal();
            }}
            className="w-full flex items-center space-x-3 p-2.5 rounded-xl text-left hover:bg-neutral-900 transition active:scale-95 group min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-105 transition-all flex-shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                  Reconcile with Statements
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                  Audit
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate">
                Audit closing balances against bank statements
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
