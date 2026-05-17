import { syncPractitioner } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import CopilotPanel from '@/components/practitioner/CopilotPanel';

/**
 * Practitioner shell layout.
 * - Runs syncPractitioner() on every request (idempotent upsert).
 * - Redirects to /sign-in if the user is not authenticated.
 * - CopilotPanel floats over all practitioner pages.
 * - Sidebar and top nav will be added here when those components are built.
 */
export default async function PractitionerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const practitioner = await syncPractitioner();
  if (!practitioner) redirect('/sign-in');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* TODO: <TopNav />, <PractitionerSidebar /> — Step 4+ */}
      {children}

      {/* Co-Pilot FAB + panel — floats over all practitioner views */}
      <CopilotPanel />
    </div>
  );
}
