import React from 'react';
import {
  Mail,
  PlusCircle,
  LogIn,
  Landmark,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDevice } from '@/hooks/useDevice';
import { UserAccountDropdown } from '@/components/common/UserAccountDropdown';

interface HeaderProps {
  onOpenAuthModal: () => void;
  onRecordTransactionClick: () => void;
  onOpenAccountsModal?: () => void;
  onOpenSetNameModal?: () => void;
  onOpenChangeEmailModal?: () => void;
  onOpenSetPasswordModal?: () => void;
  onOpenDeletionModal?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuthModal,
  onRecordTransactionClick,
  onOpenAccountsModal,
  onOpenSetNameModal = () => {},
  onOpenChangeEmailModal = () => {},
  onOpenSetPasswordModal = () => {},
  onOpenDeletionModal = () => {},
  onOpenPrivacy = () => {},
  onOpenTerms = () => {},
}) => {
  const { user } = useAuth();
  const { isDesktop } = useDevice();

  return (
    <header className="border-b border-white/10 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-40 w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 flex-shrink-0">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Envello
            </span>
            <span className="hidden xs:inline-block ml-1.5 sm:ml-2 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
              Private Beta
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-3">
          {/* User Account Dropdown (Authenticated) or Sign In button */}
          {user ? (
            <UserAccountDropdown
              onOpenSetNameModal={onOpenSetNameModal}
              onOpenChangeEmailModal={onOpenChangeEmailModal}
              onOpenSetPasswordModal={onOpenSetPasswordModal}
              onOpenDeletionModal={onOpenDeletionModal}
              onOpenPrivacy={onOpenPrivacy}
              onOpenTerms={onOpenTerms}
            />
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 text-xs sm:text-sm font-semibold shadow-md shadow-sky-500/20 active:scale-95 hover:shadow-sky-500/30 transition-all duration-200 min-h-[44px] sm:min-h-[38px]"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Accounts Button (Authenticated only - Desktop view) */}
          {user && onOpenAccountsModal && isDesktop && (
            <button
              onClick={onOpenAccountsModal}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs sm:text-sm font-medium border border-white/10 active:scale-95 transition-all duration-200 min-h-[44px] sm:min-h-[38px]"
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
              className="flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm shadow-sky-500/30 active:scale-95 hover:shadow-sky-500/40 min-h-[44px] sm:min-h-[38px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Transaction</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
