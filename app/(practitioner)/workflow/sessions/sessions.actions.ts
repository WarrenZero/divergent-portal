'use server';

import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface SessionFormData {
  clientId: string;
  scheduledAt: string; // ISO string
  durationMinutes: number;
  sessionType: string;
  soapNote?: string;
}

function revalidateAll() {
  revalidatePath('/workflow/sessions');
  revalidatePath('/dashboard');
  // Client profiles revalidate via their own queries, but dashboard matters most
}

export async function scheduleSession(
  data: SessionFormData,
): Promise<{ error?: string }> {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) return { error: 'Unauthorized' };

  const { error } = await (await createClient())
    .from('sessions')
    .insert({
      practitioner_id: practitioner.id,
      client_id: data.clientId || null,
      scheduled_at: data.scheduledAt,
      duration_minutes: data.durationMinutes,
      session_type: data.sessionType,
      soap_note: data.soapNote || null,
      status: 'scheduled',
    });

  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function editSessionDetails(
  sessionId: string,
  data: SessionFormData,
): Promise<{ error?: string }> {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) return { error: 'Unauthorized' };

  const { error } = await (await createClient())
    .from('sessions')
    .update({
      client_id: data.clientId || null,
      scheduled_at: data.scheduledAt,
      duration_minutes: data.durationMinutes,
      session_type: data.sessionType,
      soap_note: data.soapNote || null,
    })
    .eq('id', sessionId)
    .eq('practitioner_id', practitioner.id);

  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function updateSessionStatus(
  sessionId: string,
  status: 'completed' | 'cancelled',
): Promise<{ error?: string }> {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) return { error: 'Unauthorized' };

  const { error } = await (await createClient())
    .from('sessions')
    .update({ status })
    .eq('id', sessionId)
    .eq('practitioner_id', practitioner.id);

  if (error) return { error: error.message };
  revalidateAll();
  return {};
}
