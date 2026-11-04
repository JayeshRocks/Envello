import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

export interface ToastOptions {
  type?: ToastType;
  durationMs?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (
    message: string,
    typeOrOptions?: ToastType | ToastOptions,
    durationMs?: number,
    action?: ToastAction
  ) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const lastToastRef = useRef<{ message: string; timestamp: number } | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      typeOrOptions: ToastType | ToastOptions = 'success',
      durationMs = 3500,
      action?: ToastAction
    ) => {
      let resolvedType: ToastType = 'success';
      let resolvedAction: ToastAction | undefined = action;
      const defaultDuration = action ? 6000 : message.length > 80 ? 5500 : 4000;
      let resolvedDuration = defaultDuration;

      if (typeof typeOrOptions === 'object' && typeOrOptions !== null) {
        resolvedType = typeOrOptions.type ?? 'success';
        resolvedDuration = typeOrOptions.durationMs ?? defaultDuration;
        resolvedAction = typeOrOptions.action ?? action;
      } else if (typeof typeOrOptions === 'string') {
        resolvedType = typeOrOptions;
        if (durationMs !== undefined && durationMs !== 3500) {
          resolvedDuration = durationMs;
        }
      }

      const now = Date.now();
      // Debounce duplicate identical toast messages without actions within 2500ms to prevent spam
      if (
        !resolvedAction &&
        lastToastRef.current &&
        lastToastRef.current.message === message &&
        now - lastToastRef.current.timestamp < 2500
      ) {
        return;
      }
      lastToastRef.current = { message, timestamp: now };

      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type: resolvedType, action: resolvedAction }]);

      if (resolvedDuration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, resolvedDuration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Floating Toast Container */}
      <div className="fixed top-4 left-4 right-4 sm:left-auto sm:top-auto sm:bottom-5 sm:right-5 z-50 flex flex-col space-y-2.5 pointer-events-none w-auto max-w-[calc(100vw-32px)] sm:w-[28rem] sm:max-w-md md:max-w-lg">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          return (
            <div
              key={toast.id}
              role="status"
              aria-live="polite"
              className={`pointer-events-auto p-3.5 sm:p-4 rounded-2xl glass-card border shadow-2xl flex items-start justify-between gap-3 animate-slide-up transition-all ${
                isSuccess
                  ? 'bg-emerald-950/95 border-emerald-500/30 text-emerald-200'
                  : isError
                  ? 'bg-rose-950/95 border-rose-500/30 text-rose-200'
                  : 'bg-sky-950/95 border-sky-500/30 text-sky-200'
              }`}
            >
              <div className="flex items-start space-x-3 min-w-0 flex-1">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
                {isError && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />}
                {!isSuccess && !isError && <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />}
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs sm:text-sm font-medium leading-relaxed break-words whitespace-normal text-pretty select-text">
                    {toast.message}
                  </p>
                  {toast.action && (
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          removeToast(toast.id);
                          try {
                            await toast.action!.onClick();
                          } catch (err) {
                            console.error('Toast action failed:', err);
                          }
                        }}
                        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition border border-white/20 min-h-[36px] cursor-pointer shadow-sm"
                      >
                        {toast.action.label}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-neutral-400 hover:text-white transition p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-white/10 active:scale-95 flex-shrink-0 -mt-0.5 -mr-1 cursor-pointer"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
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
