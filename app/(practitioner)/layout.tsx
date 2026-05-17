import { syncPractitioner } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import CopilotPanel from '@/components/practitioner/CopilotPanel';
import PractitionerSidebar from '@/components/practitioner/PractitionerSidebar';
import PractitionerTopNav from '@/components/practitioner/PractitionerTopNav';

export default async function PractitionerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const practitioner = await syncPractitioner();
  if (!practitioner) redirect('/login');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PractitionerTopNav practitionerName={practitioner.name} />

      <PractitionerSidebar
        practitionerName={practitioner.name}
      />

      <main
        style={{
          marginLeft: '220px',
          marginTop: '56px',
          minHeight: 'calc(100vh - 56px)',
          padding: '28px 32px',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
        {children}
      </main>

      {/* Co-Pilot FAB + panel — floats over all practitioner views */}
      <CopilotPanel />
    </div>
  );
}
