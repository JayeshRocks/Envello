import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { ConfirmModal, ConfirmVariant } from '@/components/common/ConfirmModal';

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  details?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: 'trash' | 'alert' | 'info';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
  }>({
    isOpen: false,
    options: {
      title: '',
      message: '',
    },
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    // If a previous confirmation was still pending, resolve it with false
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setModalState({
        isOpen: true,
        options,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.options.title}
        message={modalState.options.message}
        details={modalState.options.details}
        confirmText={modalState.options.confirmText}
        cancelText={modalState.options.cancelText}
        variant={modalState.options.variant}
        icon={modalState.options.icon}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}
