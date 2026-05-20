import { requireClient } from '@/lib/clerk';
import ClientBottomNav from '@/components/client/ClientBottomNav';
import ClientTopBar from '@/components/client/ClientTopBar';

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = await requireClient();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        /* On mobile the fixed bottom nav is 56px + safe-area-inset-bottom */
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom))',
      }}
    >
      <ClientTopBar email={client.email} />
      {children}
      <ClientBottomNav />
    </div>
  );
}
