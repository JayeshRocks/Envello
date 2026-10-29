import React from 'react';
import { CheckCircle2, ArrowRight, ExternalLink, Sparkles } from 'lucide-react';

interface EmailConfirmationScreenProps {
  onContinue: () => void;
  userEmail?: string | null;
}

export const EmailConfirmationScreen: React.FC<EmailConfirmationScreenProps> = ({
  onContinue,
  userEmail,
}) => {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-2xl relative z-10 text-center animate-fade-in">
        {/* Animated Success Badge */}
        <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-emerald-500/20 animate-ping opacity-30" />
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Email Verified</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Thank you for confirming!
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-sm mx-auto">
            Your email address {userEmail ? <span className="font-semibold text-white">({userEmail})</span> : ''} has been successfully verified.
          </p>
        </div>

        {/* Automatic cross-tab sync status card */}
        <div className="p-4 rounded-xl bg-neutral-900/80 border border-white/5 space-y-2 text-left">
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Previous tab updated automatically</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            If you still have the previous sign-up tab open, it has automatically logged you into your workspace. You can switch back to that tab or continue directly here.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onContinue}
            className="w-full min-h-[44px] flex items-center justify-center space-x-2 py-3 px-5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 transition-all duration-200 active:scale-95"
          >
            <span>Continue to Workspace Here</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-neutral-500 flex items-center justify-center space-x-1">
            <span>Or simply switch back to your original tab</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </p>
        </div>
      </div>
    </div>
  );
};

