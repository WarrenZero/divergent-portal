import { requireClient } from '@/lib/clerk';

/**
 * Client shell layout.
 * - Calls requireClient() — redirects to /sign-in if not authenticated
 *   or if no client record is linked to this Clerk user.
 * - Mobile bottom nav will be added here when that component is built.
 */
export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireClient();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* TODO: <ClientTopBar />, <MobileBottomNav /> — Step 4+ */}
      {children}
    </div>
  );
}
