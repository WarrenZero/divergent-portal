import { getCurrentClient } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import VaultClient, { type VaultItem, type DomainScore } from './VaultClient';
import { calculateScores } from '@/app/(client)/naq/data';

export const metadata: Metadata = { title: 'The Vault — Divergent' };

export default async function VaultPage() {
  const client = await getCurrentClient();
  if (!client) redirect('/login');

  const supabase = await createClient();

  // Fetch vault items: client-specific OR public library items
  const { data: items } = await supabase
    .from('vault_items')
    .select('id, title, content_type, body, file_url, estimated_read_minutes, is_read, is_bookmarked, created_at, practitioner_id')
    .or(`client_id.eq.${client.id},is_public.eq.true`)
    .order('created_at', { ascending: false });

  // Fetch NAQ responses for domain scoring
  const { data: naqResponses } = await supabase
    .from('naq_responses')
    .select('question_id, response_value, domain')
    .eq('client_id', client.id);

  // Fetch practitioner name for attribution
  let practitionerName = 'Warren';
  if (client.practitioner_id) {
    const { data: prac } = await supabase
      .from('practitioners')
      .select('name')
      .eq('id', client.practitioner_id)
      .single();
    if (prac?.name) {
      const parts = prac.name.split(' ');
      practitionerName = parts[0] ?? 'Warren';
    }
  }

  const vaultItems: VaultItem[] = (items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    contentType: item.content_type as VaultItem['contentType'],
    body: item.body,
    fileUrl: item.file_url,
    estimatedReadMinutes: item.estimated_read_minutes ?? 3,
    isRead: item.is_read ?? false,
    isBookmarked: item.is_bookmarked ?? false,
    createdAt: item.created_at,
  }));

  // Calculate domain scores from NAQ responses
  let domainScores: DomainScore[] = [];
  if (naqResponses && naqResponses.length > 0) {
    const responsesMap: Record<string, number> = {};
    for (const r of naqResponses) {
      if (r.question_id && r.response_value !== null && r.response_value !== undefined) {
        responsesMap[r.question_id] = r.response_value;
      }
    }
    const result = calculateScores(responsesMap);
    domainScores = result.domainScores.map((s) => ({
      domainId: s.domainId,
      name: s.name,
      burden: s.burden,
    }));
  }

  return (
    <VaultClient
      items={vaultItems}
      firstName={client.first_name}
      practitionerName={practitionerName}
      domainScores={domainScores}
    />
  );
}
