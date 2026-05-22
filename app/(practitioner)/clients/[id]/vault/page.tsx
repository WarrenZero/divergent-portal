import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import VaultManager, { type VaultRow } from './VaultManager';

export const metadata: Metadata = { title: 'Client Vault — Divergent' };

export default async function ClientVaultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: clientId } = await params;
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const supabase = await createClient();

  // Verify ownership
  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email')
    .eq('id', clientId)
    .eq('practitioner_id', practitioner.id)
    .single();

  if (!client) notFound();

  const { data: items } = await supabase
    .from('vault_items')
    .select('id, title, content_type, body, file_url, estimated_read_minutes, is_read, is_bookmarked, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  const vaultRows: VaultRow[] = (items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    contentType: item.content_type as VaultRow['contentType'],
    body: item.body,
    fileUrl: item.file_url,
    estimatedReadMinutes: item.estimated_read_minutes ?? 3,
    isRead: item.is_read ?? false,
    isBookmarked: item.is_bookmarked ?? false,
    createdAt: item.created_at,
  }));

  return (
    <VaultManager
      clientId={clientId}
      clientName={`${client.first_name} ${client.last_name}`}
      clientEmail={client.email}
      items={vaultRows}
      practitionerId={practitioner.id}
    />
  );
}
