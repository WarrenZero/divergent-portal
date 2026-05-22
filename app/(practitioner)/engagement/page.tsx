import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import EngagementClient, { type ClientEngagement } from './EngagementClient';

export const metadata: Metadata = { title: 'Engagement Loop — Divergent' };

// ─── Raw Supabase shape ───────────────────────────────────────────

interface RawClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  wellness_score: number;
  daily_pulse: { logged_at: string }[];
  journal_entries: { logged_at: string }[];
  naq_responses: { responded_at: string }[];
  client_protocols: {
    start_date: string | null;
    current_phase: number;
    is_active: boolean;
    protocols: { name: string } | { name: string }[] | null;
  }[];
  sessions: { scheduled_at: string; status: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────

function daysBetween(d1: Date, d2: Date): number {
  return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function latestDate(rows: { [key: string]: string }[], field: string): string | null {
  if (!rows.length) return null;
  return rows.reduce((max, r) => (r[field] > max ? r[field] : max), rows[0][field]);
}

function protocolDayNumber(startDate: string | null, now: Date): number | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

function hasPulseStreak7(pulses: { logged_at: string }[], now: Date): boolean {
  if (pulses.length < 7) return false;
  const loggedDays = new Set(
    pulses.map((p) => {
      const d = new Date(p.logged_at);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (!loggedDays.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)) return false;
  }
  return true;
}

function computeScore(rc: RawClient, now: Date): number {
  let score = 0;

  // +20: pulse logged today
  const latestPulse = latestDate(rc.daily_pulse as { [key: string]: string }[], 'logged_at');
  if (latestPulse && daysBetween(new Date(latestPulse), now) === 0) score += 20;

  // +20: journal entry in last 3 days
  const latestJournal = latestDate(
    rc.journal_entries as { [key: string]: string }[],
    'logged_at',
  );
  if (latestJournal && daysBetween(new Date(latestJournal), now) <= 3) score += 20;

  // +20: NAQ completed
  if (rc.naq_responses.length > 0) score += 20;

  // +20: active protocol assigned
  if (rc.client_protocols.some((p) => p.is_active)) score += 20;

  // +20: session in last 30 days
  const latestSession = latestDate(
    (rc.sessions.filter((s) => s.status !== 'cancelled') as { [key: string]: string }[]),
    'scheduled_at',
  );
  if (latestSession && daysBetween(new Date(latestSession), now) <= 30) score += 20;

  return score;
}

function detectMilestones(
  protocolDay: number | null,
  hasNaq: boolean,
  hasJournal: boolean,
  streak7: boolean,
): string[] {
  const milestones: string[] = [];
  if (protocolDay !== null) {
    if (protocolDay >= 6 && protocolDay <= 8) milestones.push('Day 7 milestone');
    if (protocolDay >= 13 && protocolDay <= 15) milestones.push('Day 14 milestone');
    if (protocolDay >= 29 && protocolDay <= 31) milestones.push('Day 30 milestone');
  }
  if (hasNaq) milestones.push('NAQ completed');
  if (hasJournal) milestones.push('First journal entry');
  if (streak7) milestones.push('7-day streak');
  return milestones;
}

// ─── Page ─────────────────────────────────────────────────────────

export default async function EngagementPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const supabase = await createClient();

  const { data: rawClients } = await supabase
    .from('clients')
    .select(
      `id, first_name, last_name, email, wellness_score,
       daily_pulse (logged_at),
       journal_entries (logged_at),
       naq_responses (responded_at),
       client_protocols (start_date, current_phase, is_active, protocols (name)),
       sessions (scheduled_at, status)`,
    )
    .eq('practitioner_id', practitioner.id)
    .order('last_name');

  // Nudge log — table may not exist yet if migration hasn't run
  let lastNudgeByClient: Record<string, string> = {};
  try {
    const { data: nudgeLogs } = await supabase
      .from('nudge_log')
      .select('client_id, sent_at')
      .eq('practitioner_id', practitioner.id)
      .order('sent_at', { ascending: false });

    for (const log of nudgeLogs ?? []) {
      if (!lastNudgeByClient[log.client_id]) {
        lastNudgeByClient[log.client_id] = log.sent_at;
      }
    }
  } catch {
    // migration not yet applied — non-fatal
  }

  const now = new Date();

  const clients: ClientEngagement[] = ((rawClients ?? []) as unknown as RawClient[]).map(
    (rc) => {
      const latestPulse = latestDate(
        rc.daily_pulse as { [key: string]: string }[],
        'logged_at',
      );
      const latestJournal = latestDate(
        rc.journal_entries as { [key: string]: string }[],
        'logged_at',
      );
      const latestNaq = latestDate(
        rc.naq_responses as { [key: string]: string }[],
        'responded_at',
      );
      const latestSession = latestDate(
        (rc.sessions.filter((s) => s.status !== 'cancelled') as { [key: string]: string }[]),
        'scheduled_at',
      );

      const activeProtocol = rc.client_protocols.find((p) => p.is_active) ?? null;
      const protocolName = activeProtocol
        ? Array.isArray(activeProtocol.protocols)
          ? activeProtocol.protocols[0]?.name ?? null
          : activeProtocol.protocols?.name ?? null
        : null;
      const protocolDay = activeProtocol
        ? protocolDayNumber(activeProtocol.start_date, now)
        : null;

      const hasNaq = rc.naq_responses.length > 0;
      const hasJournal = rc.journal_entries.length > 0;
      const streak7 = hasPulseStreak7(rc.daily_pulse, now);

      const engagementScore = computeScore(rc, now);
      const status: ClientEngagement['status'] =
        engagementScore >= 60 ? 'engaged' : engagementScore >= 40 ? 'nudge' : 'at-risk';

      return {
        id: rc.id,
        firstName: rc.first_name,
        lastName: rc.last_name,
        email: rc.email,
        wellnessScore: rc.wellness_score ?? 0,
        engagementScore,
        status,
        daysSincePulse: latestPulse ? daysBetween(new Date(latestPulse), now) : null,
        daysSinceJournal: latestJournal
          ? daysBetween(new Date(latestJournal), now)
          : null,
        daysSinceNaq: latestNaq ? daysBetween(new Date(latestNaq), now) : null,
        lastSessionDate: latestSession,
        protocolName,
        protocolDay,
        protocolPhase: activeProtocol?.current_phase ?? null,
        hasNaq,
        hasJournal,
        hasPulseStreak7: streak7,
        milestones: detectMilestones(protocolDay, hasNaq, hasJournal, streak7),
        lastNudgeDate: lastNudgeByClient[rc.id] ?? null,
      };
    },
  );

  return <EngagementClient clients={clients} practitionerId={practitioner.id} />;
}
