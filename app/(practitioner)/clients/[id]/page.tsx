import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './ClientProfile.module.css';
import ProtocolPanel from './ProtocolPanel';
import SupplementPanel from './SupplementPanel';
import InviteButton from './InviteButton';
import NAQCopyButton from './NAQCopyButton';
import NotesPanel, { type NoteRow } from './NotesPanel';
import { calculateScores, type NAQDomainScore } from '@/app/(client)/naq/data';

// ─── Types ────────────────────────────────────────────────────

interface ClientRow {
  id: string;
  practitioner_id: string;
  clerk_user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  primary_concern: string | null;
  date_of_birth: string | null;
  wellness_score: number;
  created_at: string;
}

interface PulseRow {
  id: string;
  digestion_score: number;
  sleep_score: number;
  stress_score: number;
  logged_at: string;
}

interface SupplementRow {
  id: string;
  name: string;
  dose: string | null;
  timing: string | null;
}

interface JournalRow {
  id: string;
  meal_time: string | null;
  foods_eaten: string | null;
  notes: string | null;
  logged_at: string;
}

interface ProtocolAssignment {
  current_phase: number;
  start_date: string | null;
  protocols: { name: string } | null;
}

interface ProtocolRow {
  id: string;
  name: string;
  category: string | null;
  phase_count: number;
}

interface NAQResponseRow {
  question_id: string;
  response_value: number;
  responded_at: string;
}

interface SessionEventRow {
  id: string;
  scheduled_at: string;
  status: string;
  session_type: string;
  duration_minutes: number;
}

interface ProtocolEventRow {
  id: string;
  assigned_at: string;
  start_date: string | null;
  protocols: { name: string } | null;
}

interface ProfileData {
  client: ClientRow;
  pulseEntries: PulseRow[];
  supplements: SupplementRow[];
  journalEntries: JournalRow[];
  protocol: ProtocolAssignment | null;
  protocols: ProtocolRow[];
  sessionsCompleted: number;
  naqResponses: NAQResponseRow[];
  notes: NoteRow[];
  // Timeline extras
  allPulseEntries: PulseRow[];
  allJournalEntries: JournalRow[];
  clientSessions: SessionEventRow[];
  protocolHistory: ProtocolEventRow[];
}

// ─── Data fetching ─────────────────────────────────────────────

async function getProfileData(
  clientId: string,
  practitionerId: string,
): Promise<ProfileData | null> {
  const supabase = await createSupabaseClient();

  // Verify ownership and fetch client in one query
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('practitioner_id', practitionerId)
    .single();

  if (clientError || !client) return null;

  // Parallel fetch of all related data
  const [pulseRes, suppRes, journalRes, protocolRes, sessionRes, protocolsRes, naqRes, notesRes, allPulseRes, allJournalRes, clientSessionsRes, protocolHistoryRes] = await Promise.all([
    supabase
      .from('daily_pulse')
      .select('id, digestion_score, sleep_score, stress_score, logged_at')
      .eq('client_id', clientId)
      .order('logged_at', { ascending: false })
      .limit(5),

    supabase
      .from('supplements')
      .select('id, name, dose, timing')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('timing'),

    supabase
      .from('journal_entries')
      .select('id, meal_time, foods_eaten, notes, logged_at')
      .eq('client_id', clientId)
      .order('logged_at', { ascending: false })
      .limit(4),

    supabase
      .from('client_protocols')
      .select('current_phase, start_date, protocols(name)')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'completed'),

    supabase
      .from('protocols')
      .select('id, name, category, phase_count')
      .or(`is_template.eq.true,created_by.eq.${practitionerId}`)
      .order('name'),

    supabase
      .from('naq_responses')
      .select('question_id, response_value, responded_at')
      .eq('client_id', clientId)
      .order('responded_at', { ascending: true }),

    supabase
      .from('clinical_notes')
      .select('id, note_type, content, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),

    // Timeline: all pulse entries
    supabase
      .from('daily_pulse')
      .select('id, digestion_score, sleep_score, stress_score, logged_at')
      .eq('client_id', clientId)
      .order('logged_at', { ascending: false })
      .limit(90),

    // Timeline: all journal entries
    supabase
      .from('journal_entries')
      .select('id, meal_time, foods_eaten, notes, logged_at')
      .eq('client_id', clientId)
      .order('logged_at', { ascending: false })
      .limit(60),

    // Timeline: all sessions
    supabase
      .from('sessions')
      .select('id, scheduled_at, status, session_type, duration_minutes')
      .eq('client_id', clientId)
      .order('scheduled_at', { ascending: false }),

    // Timeline: protocol history
    supabase
      .from('client_protocols')
      .select('id, assigned_at, start_date, protocols(name)')
      .eq('client_id', clientId)
      .order('assigned_at', { ascending: false }),
  ]);

  let protocol: ProtocolAssignment | null = null;
  if (protocolRes.data) {
    const raw = protocolRes.data;
    const proto = Array.isArray(raw.protocols) ? raw.protocols[0] : raw.protocols;
    if (proto?.name) {
      protocol = {
        current_phase: raw.current_phase ?? 1,
        start_date: raw.start_date ?? null,
        protocols: { name: proto.name },
      };
    }
  }

  return {
    client: client as ClientRow,
    pulseEntries: (pulseRes.data ?? []) as PulseRow[],
    supplements: (suppRes.data ?? []) as SupplementRow[],
    journalEntries: (journalRes.data ?? []) as JournalRow[],
    protocol,
    protocols: (protocolsRes.data ?? []) as ProtocolRow[],
    sessionsCompleted: sessionRes.count ?? 0,
    naqResponses: (naqRes.data ?? []) as NAQResponseRow[],
    notes: (notesRes.data ?? []) as NoteRow[],
    allPulseEntries: (allPulseRes.data ?? []) as PulseRow[],
    allJournalEntries: (allJournalRes.data ?? []) as JournalRow[],
    clientSessions: (clientSessionsRes.data ?? []) as SessionEventRow[],
    protocolHistory: ((protocolHistoryRes.data ?? []) as Array<{
      id: string;
      assigned_at: string;
      start_date: string | null;
      protocols: { name: string } | { name: string }[] | null;
    }>).map((r) => ({
      id: r.id,
      assigned_at: r.assigned_at,
      start_date: r.start_date,
      protocols: Array.isArray(r.protocols) ? (r.protocols[0] ?? null) : r.protocols,
    })),
  };
}

// ─── Helpers ───────────────────────────────────────────────────

const GRADIENTS = [
  'linear-gradient(135deg, #C07848, #DFA878)',
  'linear-gradient(135deg, #3A5C42, #5A7C62)',
  'linear-gradient(135deg, #2A4330, #3A5C42)',
  'linear-gradient(135deg, #8A5028, #C07848)',
  'linear-gradient(135deg, #5A4C38, #9A8A72)',
  'linear-gradient(135deg, #162A1A, #2A4330)',
];

function avatarGradient(name: string) {
  return GRADIENTS[(name.charCodeAt(0) ?? 0) % GRADIENTS.length];
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function protocolDays(startDate: string | null): number {
  if (!startDate) return 0;
  return Math.max(1, Math.floor(
    (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
  ) + 1);
}

function scoreColor(score: number): string {
  if (score >= 7) return 'var(--pine-500)';
  if (score >= 4) return 'var(--warn)';
  return 'var(--danger)';
}

function wellnessDashOffset(score: number): number {
  // r=24 → circumference = 2π*24 ≈ 150.8; we use 132 in the SVG (scaled)
  return 132 * (1 - Math.max(0, Math.min(100, score)) / 100);
}

function formatPulseDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatJournalDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function burdenLabel(burden: number): string {
  if (burden <= 25) return 'Low';
  if (burden <= 55) return 'Moderate';
  if (burden <= 75) return 'Elevated';
  return 'High';
}

function buildNAQSummary(
  name: string,
  date: string,
  wellnessScore: number,
  domainScores: NAQDomainScore[],
  primaryConcern: string | null,
): string {
  const domainLines = domainScores
    .map((d) => `${d.name}: ${Math.round(d.burden)}% — ${burdenLabel(d.burden)}`)
    .join('\n');

  const topDomains = [...domainScores]
    .sort((a, b) => b.burden - a.burden)
    .slice(0, 3)
    .filter((d) => d.burden > 25)
    .map((d) => d.name);

  return [
    `CLIENT: ${name}`,
    `NAQ COMPLETED: ${date}`,
    `WELLNESS SCORE: ${wellnessScore}/100`,
    '',
    'DOMAIN BURDEN:',
    domainLines,
    '',
    `TOP PRIORITY DOMAINS: ${topDomains.join(', ') || 'None above moderate threshold'}`,
    '',
    `CHIEF COMPLAINT: ${primaryConcern ?? 'Not specified'}`,
  ].join('\n');
}

function clientAge(dob: string | null): string | null {
  if (!dob) return null;
  const years = Math.floor(
    (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25),
  );
  return `${years}`;
}

// ─── Metadata ─────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseClient();
  const { data } = await supabase
    .from('clients')
    .select('first_name, last_name')
    .eq('id', id)
    .single();
  const name = data ? `${data.first_name} ${data.last_name}` : 'Client';
  return { title: `${name} · Divergent` };
}

// ─── Page ─────────────────────────────────────────────────────

export default async function ClientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const activeTab = tab === 'timeline' ? 'timeline' : 'overview';

  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const data = await getProfileData(id, practitioner.id);
  if (!data) notFound();

  const { client, pulseEntries, supplements, journalEntries, protocol, protocols, sessionsCompleted, naqResponses, notes, allPulseEntries, allJournalEntries, clientSessions, protocolHistory } = data;

  const age = clientAge(client.date_of_birth);
  const days = protocol ? protocolDays(protocol.start_date) : 0;

  // Build response map (ordered ASC so last write wins if client retook NAQ)
  const naqComplete = naqResponses.length > 0;
  const responsesMap: Record<string, number> = {};
  for (const r of naqResponses) responsesMap[r.question_id] = r.response_value;
  const { wellnessScore, domainScores } = naqComplete
    ? calculateScores(responsesMap)
    : { wellnessScore: client.wellness_score, domainScores: [] as NAQDomainScore[] };

  // Date of last NAQ completion (last responded_at in the batch)
  const naqDate = naqComplete
    ? new Date(naqResponses[naqResponses.length - 1].responded_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  const scoreOffset = wellnessDashOffset(wellnessScore);

  return (
    <div>
      {/* ── Back ─────────────────────────────────────────────── */}
      <Link href="/clients" className={styles.back}>
        ← All Clients
      </Link>

      {/* ── Profile header ───────────────────────────────────── */}
      <div className={styles.profileHeader}>
        <div
          className={styles.profileAvatar}
          style={{ background: avatarGradient(client.first_name) }}
        >
          {initials(client.first_name, client.last_name)}
        </div>

        <div className={styles.profileInfo}>
          <h1 className={styles.profileName}>
            {client.first_name} {client.last_name}
          </h1>
          <div className={styles.profileMeta}>
            {[
              age ? `${age} yrs` : null,
              client.email,
              client.wellness_score === 0 ? 'New client' : 'Active',
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
          {client.primary_concern && (
            <div className={styles.profileConcern}>
              &ldquo;{client.primary_concern}&rdquo;
            </div>
          )}
        </div>

        {/* Inline wellness ring + score */}
        <div className={styles.scoreRing}>
          <svg className={styles.scoreSvg} viewBox="0 0 52 52" aria-hidden="true">
            <circle className={styles.scoreTrack} cx="26" cy="26" r="21" />
            <circle
              className={styles.scoreFill}
              cx="26"
              cy="26"
              r="21"
              transform="rotate(-90 26 26)"
              style={{ strokeDashoffset: scoreOffset }}
            />
            <text className={styles.scoreText} x="26" y="30">
              {wellnessScore}
            </text>
          </svg>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              Wellness
            </div>
          </div>
        </div>

        <div className={styles.profileActions}>
          {client.email && (
            <InviteButton
              clientId={client.id}
              email={client.email}
              alreadyActive={!!client.clerk_user_id}
            />
          )}
          <button className={styles.btnGhost}>Start NAQ</button>
          <Link href={`/clients/${client.id}/symptoms`} className={styles.btnGhost}>◎ Symptom Map</Link>
          <Link href={`/clients/${client.id}/report`} className={styles.btnGhost} target="_blank">↗ Report</Link>
          <button className={styles.btnPrimary}>Open Co-Pilot →</button>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Wellness Score</div>
          <div className={styles.statValue}>
            {wellnessScore}
            <span className={styles.statValueUnit}> / 100</span>
          </div>
          <div className={styles.statSub}>
            {naqComplete ? `From NAQ · ${naqDate}` : 'No assessment yet'}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Days on Protocol</div>
          <div className={styles.statValue}>{days || '—'}</div>
          <div className={styles.statSub}>
            {protocol
              ? `${protocol.protocols?.name ?? 'Protocol'} · Phase ${protocol.current_phase}`
              : 'No protocol assigned'}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Sessions Completed</div>
          <div className={styles.statValue}>{sessionsCompleted}</div>
          <div className={styles.statSub}>
            {sessionsCompleted === 0 ? 'None yet' : `Completed sessions`}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Supplements</div>
          <div className={styles.statValue}>{supplements.length || '—'}</div>
          <div className={styles.statSub}>
            {supplements.length === 0 ? 'None assigned' : 'In protocol'}
          </div>
        </div>
      </div>

      {/* ── Tab nav ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid var(--bone-300)',
        marginBottom: 24,
        marginTop: 8,
      }}>
        {(['overview', 'timeline'] as const).map((t) => (
          <Link
            key={t}
            href={t === 'overview' ? `/clients/${client.id}` : `/clients/${client.id}?tab=timeline`}
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
              padding: '8px 16px',
              textDecoration: 'none',
              color: activeTab === t ? 'var(--pine-900)' : 'var(--bone-600)',
              borderBottom: activeTab === t ? '2px solid var(--copper-500)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 150ms',
            }}
          >
            {t === 'overview' ? 'Overview' : 'Timeline'}
          </Link>
        ))}
      </div>

      {/* ── Timeline tab ─────────────────────────────────────── */}
      {activeTab === 'timeline' && (() => {
        type TimelineEvent = {
          key: string;
          date: Date;
          type: 'joined' | 'naq' | 'protocol' | 'session' | 'pulse' | 'journal';
          label: string;
          detail?: string;
          color: string;
          icon: string;
        };

        const events: TimelineEvent[] = [];

        // Client joined
        events.push({
          key: 'joined',
          date: new Date(client.created_at),
          type: 'joined',
          label: 'Client enrolled',
          detail: client.primary_concern ? `Chief concern: ${client.primary_concern}` : undefined,
          color: 'var(--pine-500)',
          icon: '✦',
        });

        // NAQ completion (last responded_at)
        if (naqResponses.length > 0) {
          const lastNaq = naqResponses[naqResponses.length - 1];
          events.push({
            key: 'naq-' + lastNaq.responded_at,
            date: new Date(lastNaq.responded_at),
            type: 'naq',
            label: 'NAQ assessment completed',
            detail: `Wellness score: ${wellnessScore}/100`,
            color: '#C07848',
            icon: '◈',
          });
        }

        // Protocol assignments
        for (const ph of protocolHistory) {
          events.push({
            key: 'proto-' + ph.id,
            date: new Date(ph.assigned_at),
            type: 'protocol',
            label: `Protocol assigned: ${ph.protocols?.name ?? 'Unknown'}`,
            detail: ph.start_date ? `Start date: ${new Date(ph.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : undefined,
            color: '#3A5C42',
            icon: '⊕',
          });
        }

        // Session events
        for (const s of clientSessions) {
          const statusLabel = s.status === 'completed' ? 'Session completed' : s.status === 'cancelled' ? 'Session cancelled' : 'Session scheduled';
          events.push({
            key: 'session-' + s.id,
            date: new Date(s.scheduled_at),
            type: 'session',
            label: statusLabel,
            detail: `${s.duration_minutes} min · ${s.session_type === 'telehealth' ? 'Telehealth' : s.session_type}`,
            color: s.status === 'completed' ? '#3A5C42' : s.status === 'cancelled' ? '#9A8A72' : '#C07848',
            icon: s.status === 'completed' ? '✓' : s.status === 'cancelled' ? '✕' : '○',
          });
        }

        // Daily pulse entries
        for (const p of allPulseEntries) {
          const avg = Math.round((p.digestion_score + p.sleep_score + (11 - p.stress_score)) / 3);
          events.push({
            key: 'pulse-' + p.id,
            date: new Date(p.logged_at),
            type: 'pulse',
            label: 'Daily check-in',
            detail: `Digestion ${p.digestion_score} · Sleep ${p.sleep_score} · Stress ${p.stress_score} · Avg ${avg}/10`,
            color: avg >= 7 ? '#3A5C42' : avg >= 4 ? '#D97706' : '#DC2626',
            icon: '◉',
          });
        }

        // Journal entries
        for (const j of allJournalEntries) {
          events.push({
            key: 'journal-' + j.id,
            date: new Date(j.logged_at),
            type: 'journal',
            label: `Food journal${j.meal_time ? ` · ${j.meal_time}` : ''}`,
            detail: j.foods_eaten ? j.foods_eaten.slice(0, 80) + (j.foods_eaten.length > 80 ? '…' : '') : undefined,
            color: '#5A7C62',
            icon: '⚘',
          });
        }

        // Sort descending
        events.sort((a, b) => b.date.getTime() - a.date.getTime());

        return (
          <div style={{ maxWidth: 640 }}>
            {events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--bone-600)', fontFamily: "'Syne', sans-serif", fontSize: 13 }}>
                No events yet — the timeline will fill as {client.first_name} engages with the portal.
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 28 }}>
                {/* Vertical line */}
                <div style={{ position: 'absolute', left: 8, top: 4, bottom: 4, width: 1, background: 'var(--bone-300)' }} />
                {events.map((ev) => (
                  <div key={ev.key} style={{ position: 'relative', marginBottom: 20 }}>
                    {/* Dot */}
                    <div style={{
                      position: 'absolute',
                      left: -24,
                      top: 3,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: ev.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 7,
                      color: '#fff',
                      fontWeight: 700,
                      zIndex: 1,
                    }}>
                      {ev.icon}
                    </div>
                    <div style={{
                      background: 'var(--bone-100)',
                      border: '1px solid var(--bone-300)',
                      borderRadius: 10,
                      padding: '10px 14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: ev.detail ? 4 : 0 }}>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--pine-900)' }}>
                          {ev.label}
                        </span>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 10, color: 'var(--bone-600)', letterSpacing: '0.04em', marginLeft: 'auto', whiteSpace: 'nowrap' as const }}>
                          {ev.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      {ev.detail && (
                        <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 12, color: 'var(--bone-600)', lineHeight: 1.5 }}>
                          {ev.detail}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Main grid ────────────────────────────────────────── */}
      {activeTab === 'overview' && <div className={styles.mainGrid}>

        {/* ── Left column ────────────────────────────────────── */}
        <div className={styles.leftCol}>

          {/* NAQ Assessment Results */}
          {naqComplete ? (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>NAQ Assessment ✦</span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, color: 'var(--text-3)' }}>
                  Completed {naqDate}
                </span>
              </div>
              <div className={styles.naqGrid}>
                {domainScores.map((d) => (
                  <div key={d.domainId} className={styles.naqDomainCard}>
                    <div className={styles.naqDomainTop}>
                      <span className={styles.naqGlyph}>{d.glyph}</span>
                      <span className={styles.naqDomainName}>{d.name}</span>
                    </div>
                    <div className={styles.naqBarTrack}>
                      <div
                        className={styles.naqBarFill}
                        style={{
                          width: `${d.burden}%`,
                          background: d.burden <= 25
                            ? 'var(--pine-500)'
                            : d.burden <= 55
                              ? 'var(--copper-400)'
                              : '#C45C40',
                        }}
                      />
                    </div>
                    <div className={styles.naqMeta}>
                      <span
                        className={styles.naqPct}
                        style={{
                          color: d.burden <= 25
                            ? 'var(--pine-500)'
                            : d.burden <= 55
                              ? 'var(--copper-500)'
                              : '#C45C40',
                        }}
                      >
                        {Math.round(d.burden)}%
                      </span>
                      <span className={styles.naqLabel}>
                        {d.burden <= 25 ? 'Low' : d.burden <= 55 ? 'Moderate' : d.burden <= 75 ? 'Elevated' : 'High'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.naqCopyRow}>
                <NAQCopyButton text={buildNAQSummary(
                  `${client.first_name} ${client.last_name}`,
                  naqDate!,
                  wellnessScore,
                  domainScores,
                  client.primary_concern,
                )} />
              </div>
            </div>
          ) : (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>NAQ Assessment ✦</span>
              </div>
              <div className={styles.emptyState}>
                <div className={styles.emptyGlyph}>✦</div>
                <div className={styles.emptyTitle}>No assessment yet</div>
                <p className={styles.emptyText}>
                  The client&rsquo;s 10-domain NAQ results will appear here once they complete
                  their first assessment in the client portal.
                </p>
              </div>
            </div>
          )}

          {/* Daily Pulse entries */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Recent Daily Pulse</span>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, color: 'var(--text-3)' }}>
                {pulseEntries.length > 0 ? `${pulseEntries.length} entries` : ''}
              </span>
            </div>
            {pulseEntries.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyGlyph}>◈</div>
                <div className={styles.emptyTitle}>No pulse entries yet</div>
                <p className={styles.emptyText}>
                  The client&rsquo;s daily digestion, sleep, and stress scores will appear here
                  once they start logging via the client portal.
                </p>
              </div>
            ) : (
              <div className={`${styles.cardPad} ${styles.pulseList}`}>
                {pulseEntries.map((entry) => (
                  <div key={entry.id} className={styles.pulseRow}>
                    <span className={styles.pulseDate}>
                      {formatPulseDate(entry.logged_at)}
                    </span>
                    <div className={styles.pulseScores}>
                      <div className={styles.pulseScore}>
                        <span
                          className={styles.pulseDot}
                          style={{ background: scoreColor(entry.digestion_score) }}
                        />
                        <span className={styles.pulseVal}>{entry.digestion_score}</span>
                        <span className={styles.pulseKey}> dig</span>
                      </div>
                      <div className={styles.pulseScore}>
                        <span
                          className={styles.pulseDot}
                          style={{ background: 'var(--copper-500)' }}
                        />
                        <span className={styles.pulseVal}>{entry.sleep_score}</span>
                        <span className={styles.pulseKey}> slp</span>
                      </div>
                      <div className={styles.pulseScore}>
                        <span
                          className={styles.pulseDot}
                          style={{ background: scoreColor(11 - entry.stress_score) }}
                        />
                        <span className={styles.pulseVal}>{entry.stress_score}</span>
                        <span className={styles.pulseKey}> str</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Journal entries */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Recent Food Journal</span>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, color: 'var(--text-3)' }}>
                {journalEntries.length > 0 ? `${journalEntries.length} entries` : ''}
              </span>
            </div>
            {journalEntries.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyGlyph}>⚘</div>
                <div className={styles.emptyTitle}>No journal entries yet</div>
                <p className={styles.emptyText}>
                  Food, mood, and symptom logs will appear here once the client
                  starts their food journal in the client portal.
                </p>
              </div>
            ) : (
              <div className={`${styles.cardPad} ${styles.journalList}`}>
                {journalEntries.map((entry) => (
                  <div key={entry.id} className={styles.journalRow}>
                    <div className={styles.journalMeta}>
                      {entry.meal_time && (
                        <span className={styles.journalTime}>{entry.meal_time}</span>
                      )}
                      <span className={styles.journalDate}>
                        {formatJournalDate(entry.logged_at)}
                      </span>
                    </div>
                    {entry.foods_eaten && (
                      <div className={styles.journalFoods}>{entry.foods_eaten}</div>
                    )}
                    {entry.notes && (
                      <div className={styles.journalNote}>{entry.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Right column ───────────────────────────────────── */}
        <div className={styles.rightCol}>

          {/* Assigned protocol */}
          <ProtocolPanel
            clientId={client.id}
            initialProtocol={protocol}
            protocols={protocols}
            days={days}
          />

          {/* Supplements */}
          <SupplementPanel
            clientId={client.id}
            initialSupplements={supplements}
          />

          {/* Clinical Notes */}
          <NotesPanel
            clientId={client.id}
            initialNotes={notes}
          />

        </div>
      </div>}
    </div>
  );
}
