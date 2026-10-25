import React from 'react';
import {
  Mail,
  Database,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  LogIn,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Landmark,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/lib/supabase/client';

interface HeaderProps {
  onOpenAuthModal: () => void;
  onRecordTransactionClick: () => void;
  onOpenAccountsModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuthModal,
  onRecordTransactionClick,
  onOpenAccountsModal,
}) => {
  const { user, isAllowlisted, signOut } = useAuth();

  return (
    <header className="border-b border-white/10 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Envello
            </span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
              Private Beta
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Supabase Status Pill */}
          <div className="hidden sm:flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg bg-neutral-800/80 border border-white/5">
            <Database className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-400">DB:</span>
            {isSupabaseConfigured ? (
              <span className="text-emerald-400 font-medium flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
              </span>
            ) : (
              <span className="text-amber-400 font-medium flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1" /> Setup Required
              </span>
            )}
          </div>

          {/* User Session Area */}
          {user ? (
            <div className="flex items-center space-x-2">
              {/* Allowlist status badge */}
              {isAllowlisted ? (
                <span className="hidden md:inline-flex items-center space-x-1 text-[11px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Authorized</span>
                </span>
              ) : (
                <span className="hidden md:inline-flex items-center space-x-1 text-[11px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldAlert className="w-3 h-3" />
                  <span>Restricted</span>
                </span>
              )}

              {/* User Email Pill */}
              <div className="text-xs px-3 py-1.5 rounded-lg bg-neutral-800/80 border border-white/5 text-neutral-300 font-mono max-w-[180px] sm:max-w-[220px] truncate">
                {user.email}
              </div>

              {/* Sign Out Button */}
              <button
                onClick={() => signOut()}
                title="Sign Out"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-medium border border-white/10 transition"
            >
              <LogIn className="w-3.5 h-3.5 text-sky-400" />
              <span>Sign In</span>
            </button>
          )}

          {/* Accounts Button */}
          {user && onOpenAccountsModal && (
            <button
              onClick={onOpenAccountsModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs sm:text-sm font-medium border border-white/10 transition"
              title="Manage Liquid Accounts"
            >
              <Landmark className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Accounts</span>
            </button>
          )}

          {/* Record Transaction Button */}
          <button
            onClick={onRecordTransactionClick}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-neutral-950 text-xs sm:text-sm font-semibold transition shadow-sm shadow-sky-500/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Record Transaction</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>
    </header>
  );
};
