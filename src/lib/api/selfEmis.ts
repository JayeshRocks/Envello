import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

export type SelfEmiRow = Database['public']['Tables']['self_emis']['Row'];
export type SelfEmiInsert = Database['public']['Tables']['self_emis']['Insert'];

/**
 * Fetch all self EMIs for a user
 */
export async function fetchSelfEmis(
  userId: string,
  includeCompleted = false
): Promise<SelfEmiRow[]> {
  let query = supabase
    .from('self_emis')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!includeCompleted) {
    query = query.eq('is_completed', false);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching self EMIs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new Self EMI
 */
export async function createSelfEmi(
  userId: string,
  params: {
    description: string;
    total_funded_paise: number;
    monthly_reimbursement_paise: number;
    start_date?: string;
  }
): Promise<SelfEmiRow> {
  const { description, total_funded_paise, monthly_reimbursement_paise, start_date } = params;
  const dateStr = start_date || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('self_emis')
    .insert({
      user_id: userId,
      description,
      total_funded_paise,
      monthly_reimbursement_paise,
      total_reimbursed_paise: 0,
      start_date: dateStr,
      is_completed: false,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating self EMI:', error);
    throw error;
  }

  return data;
}

/**
 * Record a Self EMI reimbursement payment
 */
export async function recordSelfEmiPayment(
  userId: string,
  params: {
    emiId: string;
    amountPaise: number;
    fromEnvelopeId?: string;
    date?: string;
  }
): Promise<void> {
  const { emiId, amountPaise, date } = params;
  const dateStr = date || new Date().toISOString().split('T')[0];

  const { data: emi, error: emiErr } = await supabase
    .from('self_emis')
    .select('*')
    .eq('id', emiId)
    .eq('user_id', userId)
    .single();

  if (emiErr || !emi) throw new Error('Self EMI record not found');

  const newReimbursed = emi.total_reimbursed_paise + amountPaise;
  const isCompleted = newReimbursed >= emi.total_funded_paise;

  await supabase
    .from('self_emis')
    .update({
      total_reimbursed_paise: newReimbursed,
      is_completed: isCompleted,
      updated_at: new Date().toISOString(),
    })
    .eq('id', emiId)
    .eq('user_id', userId);

  // Record master transaction
  await supabase.from('transactions').insert({
    user_id: userId,
    transaction_date: dateStr,
    type: 'self_emi_repayment',
    total_amount_paise: amountPaise,
    description: `Self EMI Reimbursement: ${emi.description}`,
    notes: `Reimbursed ₹${(amountPaise / 100).toFixed(2)} (${newReimbursed}/${emi.total_funded_paise})`,
  });
}
