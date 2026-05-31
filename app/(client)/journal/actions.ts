'use server';

import { auth } from '@clerk/nextjs/server';
import { getCurrentClient } from '@/lib/clerk';
import { createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface JournalFields {
  meal_time: string;
  time_eaten: string;   // HH:MM — stored as logged_at on the row
  foods_eaten: string;
  mood_before: number;  // "Symptoms Before Eating" (1-5)
  mood_after: number;   // "Symptoms After Eating" (1-5)
  bowel_rating: number;
  notes: string;
}

export async function logJournalEntry(
  fields: JournalFields,
): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated' };

  const client = await getCurrentClient();
  if (!client) return { error: 'Client record not found' };

  if (!fields.meal_time) return { error: 'Please select a meal time' };
  if (!fields.foods_eaten.trim()) return { error: 'Please describe what you ate' };

  const supabase = await createServiceClient();

  // Build logged_at from today's date + the client-specified HH:MM time.
  // Falls back to now() if time_eaten is empty or malformed.
  let loggedAt: string | undefined;
  if (fields.time_eaten) {
    const [hh, mm] = fields.time_eaten.split(':').map(Number);
    if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
      const d = new Date();
      d.setHours(hh, mm, 0, 0);
      loggedAt = d.toISOString();
    }
  }

  const { error: dbError } = await supabase.from('journal_entries').insert({
    client_id: client.id,
    meal_time: fields.meal_time,
    foods_eaten: fields.foods_eaten.trim(),
    mood_before: fields.mood_before || null,
    mood_after: fields.mood_after || null,
    bowel_rating: fields.bowel_rating || null,
    notes: fields.notes.trim() || null,
    ...(loggedAt ? { logged_at: loggedAt } : {}),
  });

  if (dbError) return { error: dbError.message };

  revalidatePath('/journal');
  return {};
}
