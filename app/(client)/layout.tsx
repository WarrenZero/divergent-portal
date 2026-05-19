import { requireClient } from '@/lib/clerk';
import ClientBottomNav from '@/components/client/ClientBottomNav';

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireClient();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        /* On mobile the fixed bottom nav is 56px + safe-area-inset-bottom */
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom))',
      }}
    >
      {children}
      <ClientBottomNav />
    </div>
  );
}
