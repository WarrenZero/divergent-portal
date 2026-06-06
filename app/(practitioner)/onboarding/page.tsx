import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OnboardingWizard from './OnboardingWizard';

export const metadata = { title: 'Welcome to Divergent' };

export default async function OnboardingPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const supabase = await createClient();

  // Check if already onboarded
  const { data: p } = await supabase
    .from('practitioners')
    .select('onboarding_complete, name')
    .eq('id', practitioner.id)
    .single();

  if (p?.onboarding_complete) redirect('/dashboard');

  return <OnboardingWizard practitionerName={p?.name ?? practitioner.name ?? ''} practitionerId={practitioner.id} />;
}
