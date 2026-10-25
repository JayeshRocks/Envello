/**
 * Envello - Supabase PostgreSQL Database Types
 * Generated & aligned with supabase/migrations/20261025000000_initial_schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      allowed_users: {
        Row: {
          email: string;
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          email: string;
          granted_by?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          granted_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          base_currency: string;
          is_allowlisted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          base_currency?: string;
          is_allowlisted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          base_currency?: string;
          is_allowlisted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          institution: string;
          account_type: 'checking' | 'savings' | 'cash' | 'other';
          balance_paise: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          institution: string;
          account_type: 'checking' | 'savings' | 'cash' | 'other';
          balance_paise?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          institution?: string;
          account_type?: 'checking' | 'savings' | 'cash' | 'other';
          balance_paise?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      envelopes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          icon: string | null;
          color: string | null;
          is_system_reserved: boolean;
          rollover_policy: 'carry_forward' | 'sweep_to_regular' | 'reset';
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          icon?: string | null;
          color?: string | null;
          is_system_reserved?: boolean;
          rollover_policy?: 'carry_forward' | 'sweep_to_regular' | 'reset';
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          icon?: string | null;
          color?: string | null;
          is_system_reserved?: boolean;
          rollover_policy?: 'carry_forward' | 'sweep_to_regular' | 'reset';
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      envelope_allocations: {
        Row: {
          id: string;
          envelope_id: string;
          user_id: string;
          year_month: string;
          allocated_paise: number;
          carried_over_paise: number;
          spent_paise: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          envelope_id: string;
          user_id: string;
          year_month: string;
          allocated_paise?: number;
          carried_over_paise?: number;
          spent_paise?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          envelope_id?: string;
          user_id?: string;
          year_month?: string;
          allocated_paise?: number;
          carried_over_paise?: number;
          spent_paise?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      credit_cards: {
        Row: {
          id: string;
          user_id: string;
          card_name: string;
          issuer: string;
          last_four: string | null;
          credit_limit_paise: number;
          outstanding_balance_paise: number;
          statement_day: number;
          payment_due_day: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_name: string;
          issuer: string;
          last_four?: string | null;
          credit_limit_paise: number;
          outstanding_balance_paise?: number;
          statement_day: number;
          payment_due_day: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_name?: string;
          issuer?: string;
          last_four?: string | null;
          credit_limit_paise?: number;
          outstanding_balance_paise?: number;
          statement_day?: number;
          payment_due_day?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          envelope_id: string | null;
          credit_card_id: string | null;
          transaction_date: string;
          amount_paise: number;
          transaction_type: string;
          payee: string;
          notes: string | null;
          is_reconciled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          envelope_id?: string | null;
          credit_card_id?: string | null;
          transaction_date?: string;
          amount_paise: number;
          transaction_type: string;
          payee: string;
          notes?: string | null;
          is_reconciled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string | null;
          envelope_id?: string | null;
          credit_card_id?: string | null;
          transaction_date?: string;
          amount_paise?: number;
          transaction_type?: string;
          payee?: string;
          notes?: string | null;
          is_reconciled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ledger_entries: {
        Row: {
          id: string;
          transaction_id: string;
          user_id: string;
          account_id: string | null;
          envelope_id: string | null;
          credit_card_id: string | null;
          entry_direction: 'debit' | 'credit';
          amount_paise: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          user_id: string;
          account_id?: string | null;
          envelope_id?: string | null;
          credit_card_id?: string | null;
          entry_direction: 'debit' | 'credit';
          amount_paise: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          user_id?: string;
          account_id?: string | null;
          envelope_id?: string | null;
          credit_card_id?: string | null;
          entry_direction?: 'debit' | 'credit';
          amount_paise?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      actual_debts: {
        Row: {
          id: string;
          user_id: string;
          entity_name: string;
          principal_paise: number;
          remaining_paise: number;
          interest_rate_percent: number | null;
          due_date: string | null;
          debt_type: 'borrowed' | 'lent' | 'loan' | 'other';
          is_settled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entity_name: string;
          principal_paise: number;
          remaining_paise?: number;
          interest_rate_percent?: number | null;
          due_date?: string | null;
          debt_type?: 'borrowed' | 'lent' | 'loan' | 'other';
          is_settled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entity_name?: string;
          principal_paise?: number;
          remaining_paise?: number;
          interest_rate_percent?: number | null;
          due_date?: string | null;
          debt_type?: 'borrowed' | 'lent' | 'loan' | 'other';
          is_settled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      self_emis: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          target_savings_account_id: string;
          total_funded_paise: number;
          total_reimbursed_paise: number;
          monthly_reimbursement_paise: number;
          start_month: string;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          target_savings_account_id: string;
          total_funded_paise: number;
          total_reimbursed_paise?: number;
          monthly_reimbursement_paise: number;
          start_month: string;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          target_savings_account_id?: string;
          total_funded_paise?: number;
          total_reimbursed_paise?: number;
          monthly_reimbursement_paise?: number;
          start_month?: string;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
