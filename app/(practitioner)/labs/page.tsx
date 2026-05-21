import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import LabParser from './LabParser';

export const metadata: Metadata = {
  title: 'Lab Parser — Divergent',
  description: 'Upload and analyze client lab reports against functional reference ranges.',
};

export interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default async function LabsPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const supabase = await createSupabaseClient();

  const { data: clients } = await supabase
    .from('clients')
    .select('id, first_name, last_name')
    .eq('practitioner_id', practitioner.id)
    .order('last_name', { ascending: true });

  return <LabParser clients={clients ?? []} />;
}
