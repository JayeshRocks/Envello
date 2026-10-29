import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const lastToastRef = useRef<{ message: string; timestamp: number } | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success', durationMs = 3500) => {
    const now = Date.now();
    // Debounce duplicate identical toast messages within 2500ms to prevent spam
    if (
      lastToastRef.current &&
      lastToastRef.current.message === message &&
      now - lastToastRef.current.timestamp < 2500
    ) {
      return;
    }
    lastToastRef.current = { message, timestamp: now };

    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (durationMs > 0) {
      setTimeout(() => {
        removeToast(id);
      }, durationMs);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Floating Toast Container */}
      <div className="fixed top-4 left-4 right-4 sm:left-auto sm:top-auto sm:bottom-5 sm:right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm sm:w-full">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-2xl glass-card border shadow-2xl flex items-center justify-between space-x-3 animate-slide-up transition-all ${
                isSuccess
                  ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
                  : isError
                  ? 'bg-rose-950/90 border-rose-500/30 text-rose-200'
                  : 'bg-sky-950/90 border-sky-500/30 text-sky-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                {isError && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                {!isSuccess && !isError && <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />}
                <span className="text-xs font-medium leading-relaxed">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-neutral-400 hover:text-white transition p-1"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
