import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import styles from './Dashboard.module.css';
import SessionPrepPanel, {
  type SessionForPrep,
  type ClientForPrep,
  type PulsePrep,
  type JournalPrep,
} from './SessionPrepPanel';

// ─── Types ────────────────────────────────────────────────────

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  wellness_score: number;
  primary_concern: string | null;
  created_at: string;
}

interface SessionRow {
  id: string;
  client_id: string;
  scheduled_at: string;
  duration_minutes: number;
  session_type: string;
  status: string;
}

interface DashboardData {
  clients: ClientRow[];
  todaySessions: SessionRow[];
  clientsById: Record<string, ClientRow>;
  lastPulseByClient: Record<string, string>;
  sessionPrepData: Record<string, { pulses: PulsePrep[]; lastJournal: JournalPrep | null }>;
  completedSessions: number;
  totalActiveClients: number;
}

// ─── Data fetching ─────────────────────────────────────────────

async function getDashboardData(practitionerId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const [clientsRes, sessionsRes, completedRes, totalClientsRes] = await Promise.all([
    supabase
      .from('clients')
      .select('id, first_name, last_name, wellness_score, primary_concern, created_at')
      .eq('practitioner_id', practitionerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('sessions')
      .select('id, client_id, scheduled_at, duration_minutes, session_type, status')
      .eq('practitioner_id', practitionerId)
      .gte('scheduled_at', `${today}T00:00:00Z`)
      .lte('scheduled_at', `${today}T23:59:59Z`)
      .order('scheduled_at'),
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('practitioner_id', practitionerId)
      .eq('status', 'completed'),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('practitioner_id', practitionerId),
  ]);

  const clients: ClientRow[] = clientsRes.data ?? [];
  const todaySessions: SessionRow[] = sessionsRes.data ?? [];

  const clientsById: Record<string, ClientRow> = {};
  for (const c of clients) {
    clientsById[c.id] = c;
  }

  // Fetch last pulse date per client (for at-risk sorting)
  const clientIds = clients.map((c) => c.id);
  const lastPulseByClient: Record<string, string> = {};
  if (clientIds.length > 0) {
    const { data: pulseData } = await supabase
      .from('daily_pulse')
      .select('client_id, logged_at')
      .in('client_id', clientIds)
      .order('logged_at', { ascending: false });
    for (const row of pulseData ?? []) {
      if (!lastPulseByClient[row.client_id]) {
        lastPulseByClient[row.client_id] = row.logged_at;
      }
    }
  }

  // Fetch session prep data
  const sessionClientIds = [...new Set(todaySessions.map((s) => s.client_id))];
  const sessionPrepData: Record<string, { pulses: PulsePrep[]; lastJournal: JournalPrep | null }> = {};
  if (sessionClientIds.length > 0) {
    const [prepPulseRes, prepJournalRes] = await Promise.all([
      supabase
        .from('daily_pulse')
        .select('client_id, digestion_score, sleep_score, stress_score, logged_at')
        .in('client_id', sessionClientIds)
        .order('logged_at', { ascending: false })
        .limit(7 * sessionClientIds.length),
      supabase
        .from('journal_entries')
        .select('client_id, meal_time, foods_eaten, notes, logged_at')
        .in('client_id', sessionClientIds)
        .order('logged_at', { ascending: false })
        .limit(sessionClientIds.length),
    ]);
    for (const clientId of sessionClientIds) {
      sessionPrepData[clientId] = {
        pulses: ((prepPulseRes.data ?? []) as PulsePrep[]).filter((p) => p.client_id === clientId).slice(0, 7),
        lastJournal: ((prepJournalRes.data ?? []) as JournalPrep[]).find((j) => j.client_id === clientId) ?? null,
      };
    }
  }

  return {
    clients,
    todaySessions,
    clientsById,
    lastPulseByClient,
    sessionPrepData,
    completedSessions: completedRes.count ?? 0,
    totalActiveClients: totalClientsRes.count ?? 0,
  };
}

// ─── Helpers ───────────────────────────────────────────────────

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatSessionTime(isoString: string, durationMinutes: number): string {
  const date = new Date(isoString);
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${time} · ${durationMinutes} min`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function avgWellness(clients: ClientRow[]): number {
  if (clients.length === 0) return 0;
  const sum = clients.reduce((acc, c) => acc + (c.wellness_score ?? 0), 0);
  return Math.round(sum / clients.length);
}

type EngagementStatus = 'active' | 'at-risk' | 'inactive' | 'new';

function engagementStatus(lastPulseIso: string | undefined): EngagementStatus {
  if (!lastPulseIso) return 'new';
  const days = Math.floor((Date.now() - new Date(lastPulseIso).getTime()) / 86400000);
  if (days <= 2) return 'active';
  if (days <= 6) return 'at-risk';
  return 'inactive';
}

function daysSince(lastPulseIso: string | undefined): number | null {
  if (!lastPulseIso) return null;
  return Math.floor((Date.now() - new Date(lastPulseIso).getTime()) / 86400000);
}

const STATUS_PRIORITY: Record<EngagementStatus, number> = {
  'at-risk': 0,
  inactive: 1,
  active: 2,
  new: 3,
};

const STATUS_DOT_COLOR: Record<EngagementStatus, string> = {
  active: 'var(--pine-500)',
  'at-risk': '#D97706',
  inactive: '#DC2626',
  new: 'var(--pine-300)',
};

const STATUS_LABEL: Record<EngagementStatus, string> = {
  active: 'Active',
  'at-risk': 'At risk',
  inactive: 'Inactive',
  new: 'New',
};

// ─── Component ────────────────────────────────────────────────

export default async function DashboardPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const {
    clients,
    todaySessions,
    clientsById,
    lastPulseByClient,
    sessionPrepData,
    completedSessions,
    totalActiveClients,
  } = await getDashboardData(practitioner.id);

  const clientCount = clients.length;
  const sessionCount = todaySessions.length;
  const avgScore = avgWellness(clients);

  // Sort clients by engagement risk
  const sortedClients = [...clients].sort((a, b) => {
    const aStatus = engagementStatus(lastPulseByClient[a.id]);
    const bStatus = engagementStatus(lastPulseByClient[b.id]);
    return STATUS_PRIORITY[aStatus] - STATUS_PRIORITY[bStatus];
  });
  const recentClients = sortedClients.slice(0, 5);
  const atRiskCount = clients.filter((c) => {
    const s = engagementStatus(lastPulseByClient[c.id]);
    return s === 'at-risk' || s === 'inactive';
  }).length;

  // Build typed session prep props
  const sessionsForPrep: SessionForPrep[] = todaySessions.map((s) => ({ ...s }));
  const clientsForPrep: Record<string, ClientForPrep> = {};
  for (const [id, c] of Object.entries(clientsById)) {
    clientsForPrep[id] = c;
  }

  return (
    <div>
      {/* ── Page header ───────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {greeting()} ✦
          </h1>
          <p className={styles.pageSub}>
            {todayLabel()}
            {sessionCount > 0
              ? ` · ${sessionCount} session${sessionCount !== 1 ? 's' : ''} today`
              : ' · No sessions scheduled today'}
          </p>
        </div>
        <div className={styles.pageActions}>
          <button className={styles.btnGhost}>Export Report</button>
          <Link href="/clients" className={styles.btnPrimary}>
            + New Client
          </Link>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────── */}
      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Clients</div>
          <div className={styles.statValue}>{clientCount}</div>
          <div className={`${styles.statTrend} ${clientCount === 0 ? styles.statTrendNeutral : ''}`}>
            {clientCount === 0 ? 'Add your first client' : `${clientCount} enrolled`}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Avg Wellness Score</div>
          <div className={styles.statValue}>
            {avgScore}
            <span className={styles.statValueUnit}>%</span>
          </div>
          <div className={`${styles.statTrend} ${avgScore === 0 ? styles.statTrendNeutral : ''}`}>
            {avgScore === 0 ? 'No data yet' : 'Across all clients'}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Sessions Today</div>
          <div className={styles.statValue}>{sessionCount}</div>
          <div className={`${styles.statTrend} ${sessionCount === 0 ? styles.statTrendNeutral : ''}`}>
            {sessionCount === 0 ? 'Schedule via Workflow' : 'Scheduled'}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Protocols</div>
          <div className={styles.statValue}>—</div>
          <div className={`${styles.statTrend} ${styles.statTrendNeutral}`}>
            Coming soon
          </div>
        </div>
      </div>

      {/* ── Session Prep Panel (FIX 2) ────────────────────────── */}
      {sessionsForPrep.length > 0 && (
        <SessionPrepPanel
          sessions={sessionsForPrep}
          clientsById={clientsForPrep}
          prepData={sessionPrepData}
        />
      )}

      {/* ── At-risk banner (FIX 1) ────────────────────────────── */}
      {atRiskCount > 0 && (
        <div style={{
          background: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderLeft: '3px solid #D97706',
          borderRadius: 10,
          padding: '10px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: "'Syne', sans-serif",
          fontSize: 13,
          color: '#92400E',
        }}>
          <span style={{ fontSize: 16 }}>⚠</span>
          <span>
            <strong>{atRiskCount} client{atRiskCount !== 1 ? 's' : ''}</strong> haven&rsquo;t checked in recently — consider a brief outreach.
          </span>
          <Link href="/clients" style={{ marginLeft: 'auto', color: '#D97706', fontWeight: 700, textDecoration: 'none', fontSize: 12, letterSpacing: '0.03em' }}>
            View All →
          </Link>
        </div>
      )}

      {/* ── Activity + Sessions grid ──────────────────────────── */}
      <div className={styles.grid21}>
        {/* Recent clients / activity */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Recent Clients</span>
            <Link href="/clients" className={styles.btnGhost}>
              View All
            </Link>
          </div>
          <div className={styles.cardPad}>
            {recentClients.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyGlyph}>◉</div>
                <div className={styles.emptyTitle}>No clients yet</div>
                <p className={styles.emptyText}>
                  Add your first client to start tracking their progress and protocols.
                </p>
              </div>
            ) : (
              recentClients.map((client) => {
                const status = engagementStatus(lastPulseByClient[client.id]);
                const days = daysSince(lastPulseByClient[client.id]);
                return (
                  <div key={client.id} className={styles.activityItem}>
                    <div
                      className={styles.activityDot}
                      style={{ background: STATUS_DOT_COLOR[status] }}
                    />
                    <span className={styles.activityText}>
                      <strong>
                        {client.first_name} {client.last_name}
                      </strong>
                      {client.primary_concern ? ` · ${client.primary_concern}` : ''}
                    </span>
                    <span className={styles.activityTime} style={{
                      color: status === 'at-risk' ? '#D97706' : status === 'inactive' ? '#DC2626' : undefined,
                    }}>
                      {days === null
                        ? STATUS_LABEL[status]
                        : days === 0
                        ? 'Today'
                        : `${days}d ago`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Today's sessions */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Today&rsquo;s Sessions</span>
          </div>
          <div className={styles.cardPad}>
            {todaySessions.length === 0 ? (
              <div className={styles.sessionEmpty}>No sessions scheduled today.</div>
            ) : (
              <div className={styles.sessionList}>
                {todaySessions.map((session, i) => {
                  const client = clientsById[session.client_id];
                  const isFirst = i === 0;
                  return (
                    <div
                      key={session.id}
                      className={`${styles.sessionBlock} ${
                        isFirst ? styles.sessionBlockActive : styles.sessionBlockUpcoming
                      }`}
                    >
                      <div
                        className={`${styles.sessionTime} ${
                          isFirst ? styles.sessionTimeActive : styles.sessionTimeUpcoming
                        }`}
                      >
                        {formatSessionTime(session.scheduled_at, session.duration_minutes)}
                      </div>
                      <div className={styles.sessionClient}>
                        {client
                          ? `${client.first_name} ${client.last_name}`
                          : 'Unknown client'}
                      </div>
                      <div className={styles.sessionType}>
                        {session.session_type === 'telehealth'
                          ? 'Telehealth session'
                          : session.session_type}
                      </div>
                      {isFirst && session.status !== 'completed' && (
                        <button
                          className={styles.btnPine}
                          style={{ marginTop: 10 }}
                        >
                          Join Session
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── AI Clinical Priority Digest ───────────────────────── */}
      <div className={styles.aiDigest}>
        <div className={styles.aiDigestLabel}>✦ AI Clinical Priority Digest</div>
        <div className={styles.aiDigestText}>
          {clientCount === 0 ? (
            <>
              Your Co-Pilot is ready. Add clients and complete intake assessments — the
              Clinical Co-Pilot will surface pattern clusters, flag HTMA imbalances, and
              generate protocol recommendations here as data accumulates.
            </>
          ) : (
            <>
              {clientCount} client{clientCount !== 1 ? 's' : ''} enrolled.{' '}
              Complete intake NAQ assessments to unlock AI pattern analysis and protocol
              recommendations. Use the ✦ Co-Pilot button to begin a clinical reasoning
              session.
            </>
          )}
        </div>
      </div>

      {/* ── Clinical Outcomes (FIX 7) ─────────────────────────── */}
      <div style={{ marginTop: 24 }}>
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--bone-600)',
          marginBottom: 12,
        }}>
          Clinical Outcomes
        </div>
        <div className={styles.statRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Sessions Completed</div>
            <div className={styles.statValue}>{completedSessions}</div>
            <div className={`${styles.statTrend} ${completedSessions === 0 ? styles.statTrendNeutral : ''}`}>
              {completedSessions === 0 ? 'No completed sessions yet' : 'All time'}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Clients</div>
            <div className={styles.statValue}>{totalActiveClients}</div>
            <div className={`${styles.statTrend} ${totalActiveClients === 0 ? styles.statTrendNeutral : ''}`}>
              {totalActiveClients === 0 ? 'None enrolled yet' : 'Enrolled'}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>Engagement Rate</div>
            <div className={styles.statValue}>
              {clientCount === 0
                ? '—'
                : `${Math.round(((clientCount - atRiskCount) / clientCount) * 100)}%`}
            </div>
            <div className={`${styles.statTrend} ${clientCount === 0 ? styles.statTrendNeutral : ''}`}>
              {clientCount === 0 ? 'No data yet' : 'Checked in ≤ 2 days'}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>At-Risk Clients</div>
            <div className={styles.statValue} style={{ color: atRiskCount > 0 ? '#D97706' : undefined }}>
              {atRiskCount}
            </div>
            <div className={`${styles.statTrend} ${atRiskCount === 0 ? styles.statTrendNeutral : ''}`}>
              {atRiskCount === 0 ? 'All clients engaged' : 'Need outreach'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
