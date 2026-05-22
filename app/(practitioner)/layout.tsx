import { syncPractitioner } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import CopilotPanel from '@/components/practitioner/CopilotPanel';
import PractitionerShell from '@/components/practitioner/PractitionerShell';

export default async function PractitionerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const practitioner = await syncPractitioner();
  if (!practitioner) redirect('/login');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PractitionerShell practitionerName={practitioner.name}>
        {children}
      </PractitionerShell>

      {/* Co-Pilot FAB + panel — floats over all practitioner views */}
      <CopilotPanel />
    </div>
  );
}
