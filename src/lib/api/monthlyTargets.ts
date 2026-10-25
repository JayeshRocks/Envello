import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

export type MonthlyTargetRow = Database['public']['Tables']['monthly_targets']['Row'];
export type MonthlyTargetInsert = Database['public']['Tables']['monthly_targets']['Insert'];

/**
 * Fetch all monthly targets for a user
 */
export async function fetchMonthlyTargets(
  userId: string,
  includeAchieved = true
): Promise<MonthlyTargetRow[]> {
  let query = supabase
    .from('monthly_targets')
    .select('*')
    .eq('user_id', userId)
    .order('target_date', { ascending: true });

  if (!includeAchieved) {
    query = query.eq('is_achieved', false);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching monthly targets:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new monthly target goal
 */
export async function createMonthlyTarget(
  userId: string,
  params: {
    title: string;
    target_amount_paise: number;
    target_date: string;
    current_contributed_paise?: number;
  }
): Promise<MonthlyTargetRow> {
  const { title, target_amount_paise, target_date, current_contributed_paise } = params;

  const { data, error } = await supabase
    .from('monthly_targets')
    .insert({
      user_id: userId,
      title,
      target_amount_paise,
      target_date,
      current_contributed_paise: current_contributed_paise ?? 0,
      is_achieved: (current_contributed_paise ?? 0) >= target_amount_paise,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating monthly target:', error);
    throw error;
  }

  return data;
}

/**
 * Update contribution towards a target
 */
export async function updateMonthlyTargetContribution(
  userId: string,
  targetId: string,
  amountToAddPaise: number
): Promise<MonthlyTargetRow> {
  const { data: target, error: fetchErr } = await supabase
    .from('monthly_targets')
    .select('*')
    .eq('id', targetId)
    .eq('user_id', userId)
    .single();

  if (fetchErr || !target) throw new Error('Target not found');

  const newContributed = target.current_contributed_paise + amountToAddPaise;
  const isAchieved = newContributed >= target.target_amount_paise;

  const { data, error } = await supabase
    .from('monthly_targets')
    .update({
      current_contributed_paise: newContributed,
      is_achieved: isAchieved,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    console.error('Error updating target contribution:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a target
 */
export async function deleteMonthlyTarget(userId: string, targetId: string): Promise<void> {
  const { error } = await supabase
    .from('monthly_targets')
    .delete()
    .eq('id', targetId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting monthly target:', error);
    throw error;
  }
}
