import { getCurrentClient } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import NAQClient from './NAQClient';

export const metadata = { title: 'Nutritional Assessment · Divergent' };

export default async function NAQPage() {
  const client = await getCurrentClient();
  if (!client) redirect('/login');

  return (
    <NAQClient firstName={client.first_name} />
  );
}
