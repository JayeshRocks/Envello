import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, LogOut, Terminal, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const AccessRestricted: React.FC = () => {
  const { user, signOut, refreshAllowlistStatus } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [checkedMessage, setCheckedMessage] = useState(false);

  const handleRefresh = async () => {
    setIsChecking(true);
    setCheckedMessage(false);
    await refreshAllowlistStatus();
    setIsChecking(false);
    setCheckedMessage(true);
    setTimeout(() => setCheckedMessage(false), 3000);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-card rounded-2xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Amber glowing accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-amber-500/50 blur-sm rounded-full" />

        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-1">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Private Beta Access Restricted</h1>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Envello is currently operating in a strictly gated private beta with Row Level Security (RLS) enforcement.
          </p>
        </div>

        {/* User Identity Pill */}
        <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-white/5 space-y-1">
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Signed In As</div>
          <div className="font-mono text-sm text-neutral-200 truncate">{user?.email || 'Unknown User'}</div>
        </div>

        {/* Authorization Instructions */}
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-neutral-300">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>To authorize this account in Supabase:</span>
          </div>
          <div className="p-3 rounded-lg bg-black/60 border border-white/5 text-[11px] font-mono text-neutral-300 leading-relaxed overflow-x-auto select-all">
            INSERT INTO public.allowed_users (email, granted_by)<br />
            VALUES (&apos;{user?.email || 'your-email@example.com'}&apos;, &apos;admin&apos;);
          </div>
          <p className="text-[11px] text-neutral-400">
            Run this single query in your Supabase SQL Editor, then click &ldquo;Re-check Access&rdquo; below.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleRefresh}
            disabled={isChecking}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium transition shadow-lg shadow-sky-500/20"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking Allowlist...' : 'Re-check Access'}</span>
          </button>

          {checkedMessage && (
            <div className="flex items-center justify-center space-x-1.5 text-xs text-amber-400 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Allowlist re-checked. If still blocked, verify query in Supabase.</span>
            </div>
          )}

          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium border border-white/5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
