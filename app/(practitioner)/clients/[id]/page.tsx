import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './ClientProfile.module.css';
import ProtocolPanel from './ProtocolPanel';
import SupplementPanel from './SupplementPanel';
import InviteButton from './InviteButton';

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

interface ProfileData {
  client: ClientRow;
  pulseEntries: PulseRow[];
  supplements: SupplementRow[];
  journalEntries: JournalRow[];
  protocol: ProtocolAssignment | null;
  protocols: ProtocolRow[];
  sessionsCompleted: number;
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
  const [pulseRes, suppRes, journalRes, protocolRes, sessionRes, protocolsRes] = await Promise.all([
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const data = await getProfileData(id, practitioner.id);
  if (!data) notFound();

  const { client, pulseEntries, supplements, journalEntries, protocol, protocols, sessionsCompleted } = data;

  const age = clientAge(client.date_of_birth);
  const days = protocol ? protocolDays(protocol.start_date) : 0;
  const scoreOffset = wellnessDashOffset(client.wellness_score);

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
              {client.wellness_score}
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
          <button className={styles.btnPrimary}>Open Co-Pilot →</button>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Wellness Score</div>
          <div className={styles.statValue}>
            {client.wellness_score}
            <span className={styles.statValueUnit}> / 100</span>
          </div>
          <div className={styles.statSub}>
            {client.wellness_score === 0 ? 'No assessment yet' : 'Overall score'}
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

      {/* ── Main grid ────────────────────────────────────────── */}
      <div className={styles.mainGrid}>

        {/* ── Left column ────────────────────────────────────── */}
        <div className={styles.leftCol}>

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

        </div>
      </div>
    </div>
  );
}
