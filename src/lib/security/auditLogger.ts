/**
 * Security & Financial Audit Logger
 * Records critical user actions, authentication failures, rate limit events,
 * and high-impact financial changes to PostgreSQL audit_logs and local telemetry.
 */

import { supabase } from '@/lib/supabase/client';
import { env } from '@/lib/env';
import type { Json } from '@/types/database.types';

export type SecurityAction =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_RATE_LIMITED'
  | 'AUTH_PASSWORD_UPDATED'
  | 'AUTH_DELETION_REQUESTED'
  | 'AUTH_DELETION_CANCELLED'
  | 'AUTH_ACCOUNT_PURGED'
  | 'FINANCIAL_RECONCILIATION'
  | 'SUSPICIOUS_PAYLOAD_DETECTED';

export interface SecurityEventParams {
  action: SecurityAction;
  userId?: string | null;
  entityName?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  reason?: string;
}

// Sanitize metadata to guarantee no passwords, raw tokens, or secrets are logged
function sanitizeMetadata(data?: Record<string, unknown>): { [key: string]: Json | undefined } {
  if (!data) return {};
  const clean: { [key: string]: Json | undefined } = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('authorization') ||
      lowerKey.includes('key')
    ) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      clean[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      clean[key] = value;
    } else {
      clean[key] = String(value);
    }
  }

  return clean;
}

/**
 * Logs a security event.
 * Persists to PostgreSQL public.audit_logs if enabled and authenticated,
 * and outputs structured logs in development mode.
 */
export async function logSecurityEvent(params: SecurityEventParams): Promise<void> {
  const sanitizedDetails = sanitizeMetadata(params.details);

  if (import.meta.env.DEV) {
    console.info(`[Envello Audit] [${params.action}]`, {
      userId: params.userId || 'anonymous',
      reason: params.reason,
      details: sanitizedDetails,
      timestamp: new Date().toISOString(),
    });
  }

  // Persist to Supabase audit_logs table if enabled and user is present
  if (env.VITE_ENABLE_AUDIT_LOGGING && params.userId) {
    try {
      // Map security action to audit_logs action enum ('CREATE' | 'UPDATE' | 'DELETE' | 'ADJUSTMENT')
      let dbAction: 'CREATE' | 'UPDATE' | 'DELETE' | 'ADJUSTMENT' = 'ADJUSTMENT';
      if (params.action.includes('DELETION_REQUESTED') || params.action.includes('PURGED')) {
        dbAction = 'DELETE';
      } else if (params.action.includes('UPDATED')) {
        dbAction = 'UPDATE';
      }

      const newState: Json = {
        security_action: params.action,
        details: sanitizedDetails,
      };

      await supabase.from('audit_logs').insert({
        user_id: params.userId,
        entity_name: params.entityName || 'security_event',
        entity_id: params.entityId || params.userId,
        action: dbAction,
        new_state: newState,
        reason: params.reason || params.action,
      });
    } catch (err) {
      // Non-blocking: fail-safe so audit logging errors never break user actions
      if (import.meta.env.DEV) {
        console.warn('[Envello Audit] Failed to persist audit record:', err);
      }
    }
  }
}
