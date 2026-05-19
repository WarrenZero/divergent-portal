'use server';

import { auth } from '@clerk/nextjs/server';
import { getCurrentClient } from '@/lib/clerk';
import { createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { SCALE_LABELS, calculateScores, NAQ_DOMAINS, type NAQDomainScore } from './data';

// ─── Types ────────────────────────────────────────────────────

export interface DomainResponse {
  questionId: string;
  value: number;       // 0–4
  isBranch: boolean;
}

// ─── Save a single domain's responses ────────────────────────

export async function saveNAQDomain(
  domainName: string,
  responses: DomainResponse[],
): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated' };

  const client = await getCurrentClient();
  if (!client) return { error: 'Client record not found' };

  if (responses.length === 0) return {};

  const supabase = await createServiceClient();

  const rows = responses.map((r) => ({
    client_id: client.id,
    domain: domainName,
    question_id: r.questionId,
    response_value: r.value,
    response_text: SCALE_LABELS[r.value] ?? String(r.value),
    ai_flag: r.isBranch,
  }));

  const { error } = await supabase.from('naq_responses').insert(rows);
  if (error) return { error: error.message };

  return {};
}

// ─── Complete the NAQ — calculate scores, update wellness ─────

export async function completeNAQ(
  allResponses: Record<string, number>,
): Promise<{ error?: string; wellnessScore: number; domainScores: NAQDomainScore[] }> {
  const empty = { wellnessScore: 0, domainScores: [] as NAQDomainScore[] };

  const { userId } = await auth();
  if (!userId) return { ...empty, error: 'Not authenticated' };

  const client = await getCurrentClient();
  if (!client) return { ...empty, error: 'Client record not found' };

  const { wellnessScore, domainScores } = calculateScores(allResponses);

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from('clients')
    .update({ wellness_score: wellnessScore })
    .eq('id', client.id);

  if (error) return { ...empty, error: error.message };

  revalidatePath('/checkin');
  revalidatePath('/naq');

  return { wellnessScore, domainScores };
}
