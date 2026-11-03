import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { DeviceProvider } from './context/DeviceContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <DeviceProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <App />
              <Analytics />
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </DeviceProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
