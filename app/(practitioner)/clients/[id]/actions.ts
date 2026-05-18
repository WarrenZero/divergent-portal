'use server';

import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function assignProtocol(
  clientId: string,
  protocolId: string,
): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated' };

  const supabase = await createServiceClient();

  // Resolve practitioner
  const { data: practitioner, error: practErr } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (practErr || !practitioner) return { error: 'Practitioner not found' };

  // Verify client ownership
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('practitioner_id', practitioner.id)
    .single();

  if (clientErr || !client) return { error: 'Client not found' };

  // Deactivate any existing active protocol
  await supabase
    .from('client_protocols')
    .update({ is_active: false })
    .eq('client_id', clientId)
    .eq('is_active', true);

  // Assign the new protocol
  const today = new Date().toISOString().split('T')[0];
  const { error: insertErr } = await supabase.from('client_protocols').insert({
    client_id: clientId,
    protocol_id: protocolId,
    start_date: today,
    current_phase: 1,
    assigned_by: practitioner.id,
    is_active: true,
  });

  if (insertErr) return { error: insertErr.message };
  return {};
}

// ─── Add Supplement ───────────────────────────────────────────

export interface SupplementFields {
  name: string;
  brand: string;
  dose: string;
  timing: string;
  notes: string;
}

export async function addSupplement(
  clientId: string,
  fields: SupplementFields,
): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated' };

  if (!fields.name.trim()) return { error: 'Supplement name is required' };

  const supabase = await createServiceClient();

  // Resolve practitioner and verify client ownership in one join
  const { data: practitioner, error: practErr } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (practErr || !practitioner) return { error: 'Practitioner not found' };

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('practitioner_id', practitioner.id)
    .single();

  if (clientErr || !client) return { error: 'Client not found' };

  const { error: insertErr } = await supabase.from('supplements').insert({
    client_id: clientId,
    name: fields.name.trim(),
    brand: fields.brand.trim() || null,
    dose: fields.dose.trim() || null,
    timing: fields.timing || null,
    notes: fields.notes.trim() || null,
    is_active: true,
  });

  if (insertErr) return { error: insertErr.message };
  return {};
}
