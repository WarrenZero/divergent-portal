'use server';

import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

interface PulsePayload {
  digestion_score: number;
  sleep_score: number;
  stress_score: number;
}

interface ActionResult {
  error?: string;
}

export async function submitDailyPulse(payload: PulsePayload): Promise<ActionResult> {
  // Validate auth
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated. Please sign in.' };

  // Validate ranges server-side — never trust client input
  const { digestion_score, sleep_score, stress_score } = payload;
  for (const [name, val] of [
    ['Digestion', digestion_score],
    ['Sleep', sleep_score],
    ['Stress', stress_score],
  ] as [string, number][]) {
    if (!Number.isInteger(val) || val < 1 || val > 10) {
      return { error: `${name} score must be a whole number between 1 and 10.` };
    }
  }

  const supabase = await createClient();

  // Resolve client_id from the clerk_user_id
  const { data: clientRow, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (clientError || !clientRow) {
    return { error: 'Client record not found. Contact your practitioner.' };
  }

  // Insert the pulse entry
  const { error: insertError } = await supabase.from('daily_pulse').insert({
    client_id: clientRow.id,
    digestion_score,
    sleep_score,
    stress_score,
  });

  if (insertError) {
    console.error('daily_pulse insert error:', insertError.message);
    return { error: 'Could not save your pulse. Please try again.' };
  }

  return {};
}
