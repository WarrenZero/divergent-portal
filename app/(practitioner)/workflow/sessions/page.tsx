import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import SessionsView from './SessionsView';

export const metadata: Metadata = {
  title: 'Sessions — Divergent',
};

export interface SessionRow {
  id: string;
  client_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  soap_note: string | null;
}

export interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default async function SessionsPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const supabase = await createSupabaseClient();

  // Fetch sessions: all future + last 90 days past
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [sessionsRes, clientsRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, client_id, scheduled_at, duration_minutes, session_type, status, soap_note')
      .eq('practitioner_id', practitioner.id)
      .gte('scheduled_at', ninetyDaysAgo)
      .order('scheduled_at', { ascending: true }),

    supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('practitioner_id', practitioner.id)
      .order('last_name', { ascending: true }),
  ]);

  return (
    <SessionsView
      sessions={(sessionsRes.data ?? []) as SessionRow[]}
      clients={(clientsRes.data ?? []) as ClientOption[]}
    />
  );
}
