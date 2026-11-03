import React from 'react';
import {
  Mail,
  PlusCircle,
  LogIn,
  Landmark,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDevice } from '@/hooks/useDevice';
import { UserAccountDropdown } from '@/components/common/UserAccountDropdown';

interface HeaderProps {
  onOpenAuthModal: () => void;
  onRecordTransactionClick: () => void;
  onOpenAccountsModal?: () => void;
  onOpenTutorial?: () => void;
  onOpenSetNameModal?: () => void;
  onOpenChangeEmailModal?: () => void;
  onOpenSetPasswordModal?: () => void;
  onOpenDeletionModal?: () => void;
  onOpenExportModal?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuthModal,
  onRecordTransactionClick,
  onOpenAccountsModal,
  onOpenTutorial,
  onOpenSetNameModal = () => {},
  onOpenChangeEmailModal = () => {},
  onOpenSetPasswordModal = () => {},
  onOpenDeletionModal = () => {},
  onOpenExportModal,
  onOpenPrivacy = () => {},
  onOpenTerms = () => {},
}) => {
  const { user } = useAuth();
  const { isDesktop } = useDevice();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 w-full border-b border-white/10 bg-[#0b0c0e]/85 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 flex-shrink-0">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent">
                Envello
              </span>
              <span className="hidden xs:inline-block ml-1.5 sm:ml-2 text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium font-mono">
                Zero-Float Ledger
              </span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            {/* Interactive Demo / Feature Tour Button (Available to all users) */}
            {onOpenTutorial && (
              <button
                type="button"
                onClick={onOpenTutorial}
                className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 hover:text-white text-xs sm:text-sm font-semibold border border-sky-500/25 active:scale-95 transition-all duration-200 min-h-[44px] sm:min-h-[38px] cursor-pointer shadow-sm"
                title="Launch Interactive Demo & Feature Guide"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 animate-pulse" />
                <span className="hidden sm:inline">Interactive Demo</span>
                <span className="sm:hidden">Demo</span>
              </button>
            )}

            {/* User Account Dropdown (Authenticated) or Sign In button */}
            {user ? (
              <UserAccountDropdown
                onOpenSetNameModal={onOpenSetNameModal}
                onOpenChangeEmailModal={onOpenChangeEmailModal}
                onOpenSetPasswordModal={onOpenSetPasswordModal}
                onOpenDeletionModal={onOpenDeletionModal}
                onOpenExportModal={onOpenExportModal}
                onOpenTutorial={onOpenTutorial}
                onOpenPrivacy={onOpenPrivacy}
                onOpenTerms={onOpenTerms}
              />
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-neutral-950 text-xs sm:text-sm font-bold shadow-md shadow-sky-500/20 active:scale-95 hover:shadow-sky-500/30 transition-all duration-200 min-h-[44px] sm:min-h-[38px] cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Accounts Button (Authenticated only - Desktop view) */}
            {user && onOpenAccountsModal && isDesktop && (
              <button
                onClick={onOpenAccountsModal}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs sm:text-sm font-medium border border-white/10 hover:border-white/20 active:scale-95 transition-all duration-200 min-h-[44px] sm:min-h-[38px] cursor-pointer shadow-sm"
                title="Manage Liquid Accounts"
              >
                <Landmark className="w-3.5 h-3.5 text-sky-400" />
                <span>Accounts</span>
              </button>
            )}

            {/* Record Transaction Button (Authenticated only - Desktop; mobiles & tablets use the bottom FAB) */}
            {user && isDesktop && (
              <button
                onClick={onRecordTransactionClick}
                className="flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-neutral-950 text-xs sm:text-sm font-bold transition-all duration-200 shadow-md shadow-sky-500/25 active:scale-95 hover:shadow-sky-500/35 min-h-[44px] sm:min-h-[38px] cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Record Transaction</span>
                <kbd className="hidden lg:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/25 text-neutral-950 font-bold border border-black/10 ml-1">
                  T
                </kbd>
              </button>
            )}
          </div>
        </div>
      </header>
      {/* Spacer to guarantee content is never occluded behind fixed top header */}
      <div className="h-16 w-full flex-shrink-0 pointer-events-none" aria-hidden="true" />
    </>
  );
};
