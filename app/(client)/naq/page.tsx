import { getCurrentClient } from '@/lib/clerk';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NAQClient from './NAQClient';
import { calculateScores } from './data';

export const metadata = { title: 'Nutritional Assessment · Divergent' };

export default async function NAQPage() {
  const client = await getCurrentClient();
  if (!client) redirect('/login');

  const supabase = await createSupabaseClient();
  const { data: priorResponses } = await supabase
    .from('naq_responses')
    .select('question_id, response_value')
    .eq('client_id', client.id)
    .order('responded_at', { ascending: false });

  const hasPriorNAQ = (priorResponses?.length ?? 0) > 0;
  let priorScores = null;
  if (hasPriorNAQ && priorResponses) {
    const responseMap: Record<string, number> = {};
    for (const r of priorResponses) {
      if (!(r.question_id in responseMap)) {
        responseMap[r.question_id] = r.response_value ?? 0;
      }
    }
    priorScores = calculateScores(responseMap).domainScores;
  }

  return (
    <NAQClient
      firstName={client.first_name}
      hasPriorNAQ={hasPriorNAQ}
      priorScores={priorScores}
    />
  );
}
