'use server';

import { auth } from '@clerk/nextjs/server';
import { getCurrentClient } from '@/lib/clerk';
import { createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface JournalFields {
  meal_time: string;
  foods_eaten: string;
  mood_before: number;
  mood_after: number;
  symptoms: string;
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

  const { error: dbError } = await supabase.from('journal_entries').insert({
    client_id: client.id,
    meal_time: fields.meal_time,
    foods_eaten: fields.foods_eaten.trim(),
    mood_before: fields.mood_before || null,
    mood_after: fields.mood_after || null,
    symptoms: fields.symptoms.trim() || null,
    bowel_rating: fields.bowel_rating || null,
    notes: fields.notes.trim() || null,
  });

  if (dbError) return { error: dbError.message };

  revalidatePath('/journal');
  return {};
}
