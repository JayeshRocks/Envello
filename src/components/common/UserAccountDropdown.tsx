import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  LogOut,
  Pencil,
  Mail,
  KeyRound,
  ShieldAlert,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface UserAccountDropdownProps {
  onOpenSetNameModal: () => void;
  onOpenChangeEmailModal: () => void;
  onOpenSetPasswordModal: () => void;
  onOpenDeletionModal: () => void;
}

export const UserAccountDropdown: React.FC<UserAccountDropdownProps> = ({
  onOpenSetNameModal,
  onOpenChangeEmailModal,
  onOpenSetPasswordModal,
  onOpenDeletionModal,
}) => {
  const { user, displayName, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  // Extract initials from displayName or email
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(displayName);
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Account Symbol Button Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={`Account: ${displayName}`}
        className="flex items-center space-x-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-white/10 hover:border-white/20 active:scale-95 transition-all duration-200 shadow-sm min-h-[40px] sm:min-h-[38px] group"
      >
        {/* Avatar / Symbol */}
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg overflow-hidden bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-inner ring-1 ring-white/20 flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to initials if image fails to load
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* Display Name preview on tablet/desktop */}
        <span className="hidden md:inline-block text-xs font-semibold text-neutral-200 max-w-[120px] truncate group-hover:text-white transition">
          {displayName}
        </span>

        {/* Subtle Chevron indicator */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sky-400' : ''
          }`}
        />
      </button>

      {/* Modern High-End Account Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[min(calc(100vw-24px),22rem)] max-w-sm sm:w-88 rounded-2xl glass-card border border-white/15 bg-neutral-950/95 backdrop-blur-2xl shadow-2xl z-50 animate-scale-up overflow-hidden divide-y divide-white/5">
          {/* Header Profile Section */}
          <div className="p-4 sm:p-5 bg-gradient-to-b from-sky-950/20 via-transparent to-transparent">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-base font-bold shadow-lg ring-2 ring-sky-500/30 flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm font-bold text-white truncate">
                    Hi, {displayName}
                  </span>
                  <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Beta
                  </span>
                </div>
                <div className="flex items-center space-x-1 mt-0.5 text-xs text-neutral-400 truncate">
                  <span className="truncate font-mono text-[11px] text-neutral-300">{user.email}</span>
                  <span title="Verified Session" className="inline-flex">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Settings / Edit Details Section */}
          <div className="p-2 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Account Credentials
            </div>

            {/* Display Name with Pencil Button */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition group">
              <div className="flex items-center space-x-2.5 min-w-0">
                <User className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs text-neutral-400 block text-[11px]">Display Name</span>
                  <span className="text-xs font-medium text-white truncate block">{displayName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSetNameModal();
                }}
                className="p-2 sm:p-1.5 rounded-lg text-neutral-400 hover:text-sky-400 hover:bg-sky-500/10 transition active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Edit Display Name"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Email with Pencil Button */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition group">
              <div className="flex items-center space-x-2.5 min-w-0">
                <Mail className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs text-neutral-400 block text-[11px]">Primary Email</span>
                  <span className="text-xs font-medium font-mono text-white truncate block max-w-[170px]">
                    {user.email}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenChangeEmailModal();
                }}
                className="p-2 sm:p-1.5 rounded-lg text-neutral-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Change Email Address"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Password Management */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSetPasswordModal();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 text-neutral-300 hover:text-white transition active:scale-[0.99] text-left group min-h-[44px]"
            >
              <div className="flex items-center space-x-2.5">
                <KeyRound className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div className="text-xs font-medium">Set / Change Password</div>
              </div>
              <span className="text-[10px] text-neutral-500 font-medium">Update</span>
            </button>
          </div>

          {/* Privacy & Account Deletion Policy Section */}
          <div className="p-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenDeletionModal();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 text-neutral-300 hover:text-white transition active:scale-[0.99] text-left min-h-[44px]"
            >
              <div className="flex items-center space-x-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium block">Account Deletion Policy</span>
                  <span className="text-[10px] text-neutral-500 block">Data privacy & retention</span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-300 bg-amber-500/10">
                STAMP: BETA
              </span>
            </button>
          </div>

          {/* Sign Out Button (Shifted here from header) */}
          <div className="p-2 bg-neutral-900/40">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 active:scale-95 transition-all duration-200 min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Envello</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
