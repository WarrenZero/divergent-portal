import { getCurrentClient } from '@/lib/clerk';
import DailyPulseCard from '@/components/client/DailyPulseCard';

export const metadata = { title: 'Daily Pulse · Divergent' };

export default async function CheckInPage() {
  const client = await getCurrentClient();

  // requireClient() in the layout guarantees client is not null by the time
  // this page renders. The fallback name is a safety net only.
  const firstName = client?.first_name ?? 'there';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: '80px 24px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Page eyebrow */}
      <div
        style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginBottom: 8,
        }}
      >
        Daily Check-In
      </div>

      <h1
        style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--pine-900)',
          marginBottom: 6,
          textAlign: 'center',
        }}
      >
        How are you feeling today, {firstName}?
      </h1>

      <p
        style={{
          fontSize: 13,
          color: 'var(--text-3)',
          marginBottom: 28,
          textAlign: 'center',
          fontFamily: 'Lora, serif',
        }}
      >
        20 seconds · Separate from your weekly NAQ assessment
      </p>

      {/* Daily Pulse card — max width matches v11 sidebar card */}
      <div style={{ width: '100%', maxWidth: 360 }}>
        <DailyPulseCard firstName={firstName} />
      </div>
    </div>
  );
}
