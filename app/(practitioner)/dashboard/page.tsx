import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import styles from './Dashboard.module.css';

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
}

// ─── Data fetching ─────────────────────────────────────────────

async function getDashboardData(practitionerId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const [clientsRes, sessionsRes] = await Promise.all([
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
  ]);

  const clients: ClientRow[] = clientsRes.data ?? [];
  const todaySessions: SessionRow[] = sessionsRes.data ?? [];

  const clientsById: Record<string, ClientRow> = {};
  for (const c of clients) {
    clientsById[c.id] = c;
  }

  return { clients, todaySessions, clientsById };
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

// ─── Component ────────────────────────────────────────────────

export default async function DashboardPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const { clients, todaySessions, clientsById } = await getDashboardData(practitioner.id);

  const clientCount = clients.length;
  const sessionCount = todaySessions.length;
  const avgScore = avgWellness(clients);
  const recentClients = clients.slice(0, 3);

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
              recentClients.map((client) => (
                <div key={client.id} className={styles.activityItem}>
                  <div
                    className={styles.activityDot}
                    style={{ background: 'var(--pine-400)' }}
                  />
                  <span className={styles.activityText}>
                    <strong>
                      {client.first_name} {client.last_name}
                    </strong>
                    {client.primary_concern ? ` · ${client.primary_concern}` : ''}
                  </span>
                  <span className={styles.activityTime}>
                    Wellness {client.wellness_score}%
                  </span>
                </div>
              ))
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
    </div>
  );
}
