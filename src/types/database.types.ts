/**
 * Envello - Supabase PostgreSQL Database Types
 * Generated & 100% aligned with supabase/migrations/20261025000000_initial_schema.sql
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
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      budget_periods: {
        Row: {
          id: string;
          user_id: string;
          period_key: string;
          is_closed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period_key: string;
          is_closed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          period_key?: string;
          is_closed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      envelope_allocations: {
        Row: {
          id: string;
          user_id: string;
          envelope_id: string;
          period_id: string;
          allocated_paise: number;
          spent_paise: number;
          carried_over_paise: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          envelope_id: string;
          period_id: string;
          allocated_paise?: number;
          spent_paise?: number;
          carried_over_paise?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          envelope_id?: string;
          period_id?: string;
          allocated_paise?: number;
          spent_paise?: number;
          carried_over_paise?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          transaction_date: string;
          type:
            | 'income'
            | 'expense'
            | 'transfer'
            | 'envelope_allocation'
            | 'credit_card_purchase'
            | 'credit_card_payment'
            | 'fd_movement'
            | 'self_emi_repayment'
            | 'debt_repayment'
            | 'refund'
            | 'adjustment';
          total_amount_paise: number;
          description: string;
          notes: string | null;
          linked_transaction_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_date: string;
          type:
            | 'income'
            | 'expense'
            | 'transfer'
            | 'envelope_allocation'
            | 'credit_card_purchase'
            | 'credit_card_payment'
            | 'fd_movement'
            | 'self_emi_repayment'
            | 'debt_repayment'
            | 'refund'
            | 'adjustment';
          total_amount_paise: number;
          description: string;
          notes?: string | null;
          linked_transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_date?: string;
          type?:
            | 'income'
            | 'expense'
            | 'transfer'
            | 'envelope_allocation'
            | 'credit_card_purchase'
            | 'credit_card_payment'
            | 'fd_movement'
            | 'self_emi_repayment'
            | 'debt_repayment'
            | 'refund'
            | 'adjustment';
          total_amount_paise?: number;
          description?: string;
          notes?: string | null;
          linked_transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transaction_entries: {
        Row: {
          id: string;
          transaction_id: string;
          user_id: string;
          account_id: string | null;
          envelope_id: string | null;
          direction: 'credit' | 'debit';
          amount_paise: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          user_id: string;
          account_id?: string | null;
          envelope_id?: string | null;
          direction: 'credit' | 'debit';
          amount_paise: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          user_id?: string;
          account_id?: string | null;
          envelope_id?: string | null;
          direction?: 'credit' | 'debit';
          amount_paise?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      credit_cards: {
        Row: {
          id: string;
          user_id: string;
          card_name: string;
          issuer: string;
          credit_limit_paise: number;
          outstanding_balance_paise: number;
          statement_day: number;
          payment_due_day: number;
          warning_threshold_percent: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_name: string;
          issuer: string;
          credit_limit_paise: number;
          outstanding_balance_paise?: number;
          statement_day: number;
          payment_due_day: number;
          warning_threshold_percent?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_name?: string;
          issuer?: string;
          credit_limit_paise?: number;
          outstanding_balance_paise?: number;
          statement_day?: number;
          payment_due_day?: number;
          warning_threshold_percent?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      credit_card_statements: {
        Row: {
          id: string;
          card_id: string;
          user_id: string;
          statement_date: string;
          due_date: string;
          statement_balance_paise: number;
          minimum_payment_paise: number;
          is_settled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          user_id: string;
          statement_date: string;
          due_date: string;
          statement_balance_paise: number;
          minimum_payment_paise?: number;
          is_settled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          user_id?: string;
          statement_date?: string;
          due_date?: string;
          statement_balance_paise?: number;
          minimum_payment_paise?: number;
          is_settled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      fixed_deposits: {
        Row: {
          id: string;
          user_id: string;
          institution: string;
          principal_paise: number;
          interest_rate_percent: number;
          start_date: string;
          maturity_date: string;
          maturity_amount_paise: number;
          is_liquidated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          institution: string;
          principal_paise: number;
          interest_rate_percent: number;
          start_date: string;
          maturity_date: string;
          maturity_amount_paise: number;
          is_liquidated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          institution?: string;
          principal_paise?: number;
          interest_rate_percent?: number;
          start_date?: string;
          maturity_date?: string;
          maturity_amount_paise?: number;
          is_liquidated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      self_emis: {
        Row: {
          id: string;
          user_id: string;
          description: string;
          total_funded_paise: number;
          monthly_reimbursement_paise: number;
          total_reimbursed_paise: number;
          start_date: string;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          description: string;
          total_funded_paise: number;
          monthly_reimbursement_paise: number;
          total_reimbursed_paise?: number;
          start_date: string;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          description?: string;
          total_funded_paise?: number;
          monthly_reimbursement_paise?: number;
          total_reimbursed_paise?: number;
          start_date?: string;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      actual_debts: {
        Row: {
          id: string;
          user_id: string;
          lender_name: string;
          initial_debt_paise: number;
          remaining_debt_paise: number;
          monthly_instalment_paise: number;
          due_date: string | null;
          is_settled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lender_name: string;
          initial_debt_paise: number;
          remaining_debt_paise: number;
          monthly_instalment_paise: number;
          due_date?: string | null;
          is_settled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lender_name?: string;
          initial_debt_paise?: number;
          remaining_debt_paise?: number;
          monthly_instalment_paise?: number;
          due_date?: string | null;
          is_settled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      monthly_targets: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          target_amount_paise: number;
          target_date: string;
          current_contributed_paise: number;
          is_achieved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          target_amount_paise: number;
          target_date: string;
          current_contributed_paise?: number;
          is_achieved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          target_amount_paise?: number;
          target_date?: string;
          current_contributed_paise?: number;
          is_achieved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          entity_name: string;
          entity_id: string;
          action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ADJUSTMENT';
          old_state: Json | null;
          new_state: Json | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entity_name: string;
          entity_id: string;
          action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ADJUSTMENT';
          old_state?: Json | null;
          new_state?: Json | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entity_name?: string;
          entity_id?: string;
          action?: 'CREATE' | 'UPDATE' | 'DELETE' | 'ADJUSTMENT';
          old_state?: Json | null;
          new_state?: Json | null;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      execute_account_transfer: {
        Args: {
          p_from_account_id: string;
          p_to_account_id: string;
          p_amount_paise: number;
          p_description: string;
          p_date: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
}
