import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  LogOut,
  Pencil,
  Mail,
  KeyRound,
  ChevronDown,
  CheckCircle2,
  Scale,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface UserAccountDropdownProps {
  onOpenSetNameModal: () => void;
  onOpenChangeEmailModal: () => void;
  onOpenSetPasswordModal: () => void;
  onOpenDeletionModal: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export const UserAccountDropdown: React.FC<UserAccountDropdownProps> = ({
  onOpenSetNameModal,
  onOpenChangeEmailModal,
  onOpenSetPasswordModal,
  onOpenDeletionModal,
  onOpenPrivacy = () => {},
  onOpenTerms = () => {},
}) => {
  const { user, displayName, signOut } = useAuth();
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
        className="flex items-center space-x-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 hover:border-white/20 active:scale-95 transition-all duration-200 shadow-sm min-h-[40px] sm:min-h-[38px] group"
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

      {/* Modern High-End Opaque Account Dropdown Menu with Soft Animation */}
      <div
        className={`absolute right-0 mt-2 w-[min(calc(100vw-24px),22rem)] max-w-sm sm:w-88 rounded-2xl border border-neutral-700/80 bg-neutral-950 shadow-2xl shadow-black/95 z-50 overflow-hidden divide-y divide-neutral-800 transform origin-top-right transition-all duration-200 ease-out ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto visible'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none invisible'
        }`}
        role="menu"
        aria-hidden={!isOpen}
      >
        {/* Header Profile Section */}
        <div className="p-4 sm:p-5 bg-neutral-900 border-b border-neutral-800">
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
                <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Beta
                </span>
              </div>
              <div className="flex items-center space-x-1 mt-0.5 text-xs text-neutral-300 truncate">
                <span className="truncate font-mono text-[11px] text-neutral-300">{user.email}</span>
                <span title="Verified Session" className="inline-flex">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings / Edit Details Section */}
        <div className="p-2.5 space-y-1 bg-neutral-950">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Account Credentials
          </div>

          {/* Display Name with Pencil Button */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-neutral-900 transition group">
            <div className="flex items-center space-x-2.5 min-w-0">
              <User className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-neutral-400 block text-[11px]">Display Name</span>
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
          <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-neutral-900 transition group">
            <div className="flex items-center space-x-2.5 min-w-0">
              <Mail className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-neutral-400 block text-[11px]">Primary Email</span>
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
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-neutral-900 text-neutral-200 hover:text-white transition active:scale-[0.99] text-left group min-h-[44px]"
          >
            <div className="flex items-center space-x-2.5">
              <KeyRound className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div className="text-xs font-medium">Set / Change Password</div>
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">Update</span>
          </button>
        </div>

        {/* Privacy & Account Deletion Section */}
        <div className="p-2.5 space-y-1 bg-neutral-950">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Privacy &amp; Security
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenPrivacy();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-neutral-900 text-neutral-200 hover:text-white transition active:scale-[0.99] text-left min-h-[44px]"
          >
            <div className="flex items-center space-x-2.5">
              <Scale className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium block">Privacy &amp; Terms</span>
                <span className="text-[10px] text-neutral-400 block">Data isolation &amp; legal rights</span>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onOpenTerms();
                }}
                className="text-[10px] text-sky-300 hover:text-white font-medium px-2 py-0.5 rounded bg-sky-500/20 border border-sky-500/30"
              >
                Terms
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onOpenPrivacy();
                }}
                className="text-[10px] text-emerald-300 hover:text-white font-medium px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30"
              >
                Privacy
              </span>
            </div>
          </button>

          {/* Delete Account Option */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenDeletionModal();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-rose-500/10 text-neutral-200 hover:text-rose-200 transition active:scale-[0.99] text-left min-h-[44px] group"
          >
            <div className="flex items-center space-x-2.5">
              <Trash2 className="w-4 h-4 text-rose-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <span className="text-xs font-semibold text-rose-300 group-hover:text-rose-200 block">
                  Delete Account
                </span>
                <span className="text-[10px] text-neutral-400 block">
                  30-day grace period &amp; permanent purge
                </span>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-rose-500/30 text-rose-400 bg-rose-500/10">
              Action
            </span>
          </button>
        </div>

        {/* Sign Out Button */}
        <div className="p-2.5 bg-neutral-900/90 border-t border-neutral-800">
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
    </div>
  );
};
