import { getCurrentClient } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import VaultClient, { type VaultItem } from './VaultClient';

export const metadata: Metadata = { title: 'The Vault — Divergent' };

export default async function VaultPage() {
  const client = await getCurrentClient();
  if (!client) redirect('/login');

  const supabase = await createClient();

  const { data: items } = await supabase
    .from('vault_items')
    .select('id, title, content_type, body, file_url, estimated_read_minutes, is_read, is_bookmarked, created_at, practitioner_id')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false });

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

  return (
    <VaultClient
      items={vaultItems}
      firstName={client.first_name}
      practitionerName={practitionerName}
    />
  );
}
