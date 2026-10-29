/**
 * Cross-Tab Authentication Sync & Email Confirmation Helpers
 * Allows verification in Tab B (from email) to automatically update and log in Tab A.
 */

export interface AuthSyncPayload {
  type: 'EMAIL_CONFIRMED' | 'SIGN_IN' | 'SIGN_OUT';
  email?: string;
  timestamp: number;
}

const BROADCAST_CHANNEL_NAME = 'envello_auth_channel';
const STORAGE_KEY = 'envello_auth_broadcast';

/**
 * Checks whether the current URL contains Supabase email confirmation hash or query params
 */
export function isEmailConfirmationUrl(): boolean {
  if (typeof window === 'undefined') return false;

  const hash = window.location.hash || '';
  const search = window.location.search || '';

  // 1. Check hash params (Supabase implicit flow: #access_token=...&type=signup)
  if (hash) {
    const cleanHash = hash.replace(/^[#?]/, '');
    const params = new URLSearchParams(cleanHash);
    const type = params.get('type');
    if (type === 'signup' || type === 'email_confirmation' || type === 'email_change' || type === 'invite') {
      return true;
    }
  }

  // 2. Check search params (PKCE flow or explicit query params: ?type=signup)
  if (search) {
    const params = new URLSearchParams(search);
    const type = params.get('type');
    if (type === 'signup' || type === 'email_confirmation' || type === 'email_change' || type === 'invite') {
      return true;
    }
  }

  return false;
}

/**
 * Broadcasts an authentication event to all other open tabs on this origin
 */
export function broadcastAuthEvent(type: AuthSyncPayload['type'], email?: string): void {
  const payload: AuthSyncPayload = {
    type,
    email,
    timestamp: Date.now(),
  };

  // 1. BroadcastChannel (modern browsers, instantaneous)
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    } catch {
      // Fallback to storage event
    }
  }

  // 2. LocalStorage storage event fallback (fires on all other tabs of same origin)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Subscribes to authentication events emitted by other tabs
 */
export function subscribeAuthEvents(callback: (payload: AuthSyncPayload) => void): () => void {
  let channel: BroadcastChannel | null = null;

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<AuthSyncPayload>) => {
        if (event.data && event.data.type) {
          callback(event.data);
        }
      };
    } catch {
      channel = null;
    }
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const payload = JSON.parse(e.newValue) as AuthSyncPayload;
        if (payload && payload.type) {
          callback(payload);
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    if (channel) {
      try {
        channel.close();
      } catch {
        // Channel already closed
      }
    }
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * Safely removes auth tokens/type from the URL without triggering a page reload
 */
export function clearAuthUrlHash(): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanUrl = window.location.pathname;
    window.history.replaceState(null, '', cleanUrl);
  } catch {
    // Ignore history replace state errors
  }
}

