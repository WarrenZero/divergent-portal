import { requireClient } from '@/lib/clerk';
import ClientBottomNav from '@/components/client/ClientBottomNav';
import ClientTopBar from '@/components/client/ClientTopBar';
import WelcomeGate from '@/components/client/WelcomeGate';
import JourneyBar from '@/components/client/JourneyBar';
import WhatTodayButton from '@/components/client/WhatTodayButton';

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = await requireClient();
  const wellnessScore = client?.wellness_score ?? null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        /* On mobile the fixed bottom nav is 56px + safe-area-inset-bottom */
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom))',
      }}
    >
      <WelcomeGate />
      <ClientTopBar email={client.email} />
      <JourneyBar clientId={client.id} />
      {children}
      <WhatTodayButton />
      <ClientBottomNav wellnessScore={wellnessScore} />
    </div>
  );
}
