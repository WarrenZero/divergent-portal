import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { calculateScores, NAQ_DOMAINS, type NAQDomainScore } from '@/app/(client)/naq/data';
import SymptomMap from './SymptomMap';

export const metadata: Metadata = {
  title: 'Symptom Map — Divergent',
};

interface NAQResponseRow {
  question_id: string;
  response_value: number;
  responded_at: string;
}

export interface AssessmentSession {
  label: string;
  date: string;
  domainScores: NAQDomainScore[];
  wellnessScore: number;
}

/** Group rows into assessment sessions by 7-day gap between response batches */
function groupIntoSessions(rows: NAQResponseRow[]): AssessmentSession[] {
  if (rows.length === 0) return [];

  // Sort ascending by timestamp
  const sorted = [...rows].sort(
    (a, b) => new Date(a.responded_at).getTime() - new Date(b.responded_at).getTime(),
  );

  const sessions: NAQResponseRow[][] = [];
  let current: NAQResponseRow[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].responded_at).getTime();
    const curr = new Date(sorted[i].responded_at).getTime();
    const gapDays = (curr - prev) / (1000 * 60 * 60 * 24);

    if (gapDays > 7) {
      sessions.push(current);
      current = [];
    }
    current.push(sorted[i]);
  }
  sessions.push(current);

  return sessions.map((batch, idx) => {
    const responseMap: Record<string, number> = {};
    for (const row of batch) {
      responseMap[row.question_id] = row.response_value;
    }
    const { wellnessScore, domainScores } = calculateScores(responseMap);
    const date = new Date(batch[batch.length - 1].responded_at);
    const label = idx === 0 ? 'Baseline' : `Session ${idx + 1}`;

    return {
      label,
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      domainScores,
      wellnessScore,
    };
  });
}

export default async function SymptomMapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const supabase = await createSupabaseClient();

  // Verify practitioner owns this client
  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name, last_name, primary_concern, wellness_score')
    .eq('id', id)
    .eq('practitioner_id', practitioner.id)
    .single();

  if (!client) notFound();

  // Fetch all NAQ responses for this client
  const { data: naqRows } = await supabase
    .from('naq_responses')
    .select('question_id, response_value, responded_at')
    .eq('client_id', id)
    .order('responded_at', { ascending: true });

  const rows = (naqRows ?? []) as NAQResponseRow[];
  const sessions = groupIntoSessions(rows);

  return (
    <SymptomMap
      clientId={id}
      clientName={`${client.first_name} ${client.last_name}`}
      primaryConcern={client.primary_concern ?? null}
      sessions={sessions}
      domains={NAQ_DOMAINS}
    />
  );
}
