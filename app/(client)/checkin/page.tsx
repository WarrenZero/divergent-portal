import { getCurrentClient } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import CheckinClient from './CheckinClient';
import type { ProtocolInfo, SupplementRow, SessionRow } from './CheckinClient';

export const metadata = { title: 'Daily Check-In · Divergent' };

// ─── Data fetching ─────────────────────────────────────────────

async function getCheckinData(clientId: string): Promise<{
  protocol: ProtocolInfo | null;
  supplements: SupplementRow[];
  nextSession: SessionRow | null;
}> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [protocolRes, supplementsRes, sessionRes] = await Promise.all([
    supabase
      .from('client_protocols')
      .select('current_phase, start_date, protocols(name)')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('supplements')
      .select('id, name, dose, timing, brand')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('timing')
      .limit(6),

    supabase
      .from('sessions')
      .select('id, scheduled_at, duration_minutes, session_type, status')
      .eq('client_id', clientId)
      .gte('scheduled_at', now)
      .neq('status', 'cancelled')
      .order('scheduled_at')
      .limit(1)
      .maybeSingle(),
  ]);

  let protocol: ProtocolInfo | null = null;
  if (protocolRes.data) {
    const row = protocolRes.data;
    const protocolRecord = Array.isArray(row.protocols) ? row.protocols[0] : row.protocols;
    if (protocolRecord?.name) {
      protocol = {
        name: protocolRecord.name,
        phase: row.current_phase ?? 1,
        startDate: row.start_date ?? '',
      };
    }
  }

  return {
    protocol,
    supplements: supplementsRes.data ?? [],
    nextSession: sessionRes.data ?? null,
  };
}

// ─── Helpers ───────────────────────────────────────────────────

function protocolDayLabel(startDate: string): string {
  if (!startDate) return 'Day 1 of 90';
  const start = new Date(startDate);
  const today = new Date();
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const day = Math.max(1, diff + 1);
  return `Day ${day} of 90`;
}

function phaseLabel(phase: number): string {
  switch (phase) {
    case 1: return 'Week 1–4 · Building Your Foundation';
    case 2: return 'Week 5–8 · Deepening the Protocol';
    case 3: return 'Week 9–12 · Integration & Refinement';
    default: return 'Week 13+ · Sustained Healing';
  }
}

function wellnessDashOffset(score: number): number {
  return 283 * (1 - Math.max(0, Math.min(100, score)) / 100);
}

function aiNudgeText(
  firstName: string,
  protocol: ProtocolInfo | null,
  supplementCount: number,
): string {
  if (!protocol && supplementCount === 0) {
    return `Your journey begins with today's check-in, ${firstName}. Once Warren assigns your plan, patterns will start emerging across your check-ins and journal entries.`;
  }
  if (protocol) {
    return `Logging consistently unlocks the pattern — meaningful shifts show up after 5–7 entries. Warren reviews these before every session.`;
  }
  return `Consistent logging — even on good days — gives Warren the clearest picture of how your body is responding over time.`;
}

// ─── Page ─────────────────────────────────────────────────────

export default async function CheckInPage() {
  const client = await getCurrentClient();

  const firstName = client?.first_name ?? 'there';
  const wellnessScore = client?.wellness_score ?? 0;
  const dashOffset = wellnessDashOffset(wellnessScore);

  const { protocol, supplements, nextSession } = client
    ? await getCheckinData(client.id)
    : { protocol: null, supplements: [], nextSession: null };

  const protocolDay = protocol ? protocolDayLabel(protocol.startDate) : null;

  const protocolDayNum = protocol?.startDate
    ? Math.max(1, Math.floor((Date.now() - new Date(protocol.startDate).getTime()) / 86400000) + 1)
    : null;

  const phaseText = protocol ? phaseLabel(protocol.phase) : null;
  const aiNote = aiNudgeText(firstName, protocol, supplements.length);

  return (
    <CheckinClient
      firstName={firstName}
      wellnessScore={wellnessScore}
      dashOffset={dashOffset}
      protocol={protocol}
      protocolDay={protocolDay}
      protocolDayNum={protocolDayNum}
      phaseText={phaseText}
      supplements={supplements}
      nextSession={nextSession}
      aiNote={aiNote}
    />
  );
}
