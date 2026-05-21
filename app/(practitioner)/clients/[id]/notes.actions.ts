'use server';

import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addManualNote(
  clientId: string,
  content: string,
): Promise<{ error?: string }> {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) return { error: 'Unauthorized' };

  const trimmed = content.trim();
  if (!trimmed) return { error: 'Note content is required' };

  const supabase = await createClient();
  const { error } = await supabase.from('clinical_notes').insert({
    client_id: clientId,
    practitioner_id: practitioner.id,
    note_type: 'manual',
    content: trimmed,
  });

  if (error) return { error: error.message };

  revalidatePath(`/clients/${clientId}`);
  return {};
}

export async function editNote(
  noteId: string,
  clientId: string,
  content: string,
): Promise<{ error?: string }> {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) return { error: 'Unauthorized' };

  const trimmed = content.trim();
  if (!trimmed) return { error: 'Note content is required' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('clinical_notes')
    .update({ content: trimmed })
    .eq('id', noteId)
    .eq('practitioner_id', practitioner.id); // RLS double-check

  if (error) return { error: error.message };

  revalidatePath(`/clients/${clientId}`);
  return {};
}

export async function deleteNote(
  noteId: string,
  clientId: string,
): Promise<{ error?: string }> {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) return { error: 'Unauthorized' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('clinical_notes')
    .delete()
    .eq('id', noteId)
    .eq('practitioner_id', practitioner.id); // RLS double-check

  if (error) return { error: error.message };

  revalidatePath(`/clients/${clientId}`);
  return {};
}
