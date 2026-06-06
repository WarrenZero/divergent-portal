import { requireClient } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import SessionsClient from './SessionsClient';

export const metadata = { title: 'Book a Session · Divergent' };

async function getSessionsData(clientId: string) {
  const supabase = await createClient();

  const [clientRes, completedRes, upcomingRes] = await Promise.all([
    supabase
      .from('clients')
      .select('first_name, last_name, email, subscription_tier')
      .eq('id', clientId)
      .single(),

    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'completed'),

    supabase
      .from('sessions')
      .select('id, scheduled_at, session_type, status')
      .eq('client_id', clientId)
      .gte('scheduled_at', new Date().toISOString())
      .neq('status', 'cancelled')
      .order('scheduled_at')
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    firstName: clientRes.data?.first_name ?? 'there',
    email: clientRes.data?.email ?? '',
    subscriptionTier: (clientRes.data?.subscription_tier ?? 'none') as string,
    sessionsCompleted: completedRes.count ?? 0,
    nextSession: upcomingRes.data ?? null,
  };
}

export default async function SessionsPage() {
  const client = await requireClient();

  const data = await getSessionsData(client.id);

  return <SessionsClient {...data} />;
}
