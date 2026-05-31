'use server';

import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

interface PulsePayload {
  energy_score: number;        // 1–5  — emoji selection (required)
  digestion_score?: number;    // 1–10 — expanded sliders (optional)
  sleep_score?: number;
  stress_score?: number;
}

interface ActionResult {
  error?: string;
}

export async function submitDailyPulse(payload: PulsePayload): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated. Please sign in.' };

  const { energy_score, digestion_score, sleep_score, stress_score } = payload;

  // energy_score is required (1–5)
  if (!Number.isInteger(energy_score) || energy_score < 1 || energy_score > 5) {
    return { error: 'Please select how you are feeling before saving.' };
  }

  // Validate optional detail scores only when provided
  for (const [name, val] of [
    ['Digestion', digestion_score],
    ['Sleep', sleep_score],
    ['Stress', stress_score],
  ] as [string, number | undefined][]) {
    if (val !== undefined && (!Number.isInteger(val) || val < 1 || val > 10)) {
      return { error: `${name} score must be a whole number between 1 and 10.` };
    }
  }

  const supabase = await createClient();

  const { data: clientRow, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (clientError || !clientRow) {
    return { error: 'Client record not found. Contact your practitioner.' };
  }

  const { error: insertError } = await supabase.from('daily_pulse').insert({
    client_id: clientRow.id,
    energy_score,
    ...(digestion_score !== undefined && { digestion_score }),
    ...(sleep_score !== undefined && { sleep_score }),
    ...(stress_score !== undefined && { stress_score }),
  });

  if (insertError) {
    console.error('daily_pulse insert error:', insertError.message);
    return { error: 'Could not save your check-in. Please try again.' };
  }

  return {};
}
