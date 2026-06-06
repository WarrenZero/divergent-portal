import { getCurrentPractitioner } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import ProtocolBuilderForm from './ProtocolBuilderForm';

export const metadata = { title: 'New Protocol — Divergent' };

export default async function NewProtocolPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');
  return <ProtocolBuilderForm />;
}
