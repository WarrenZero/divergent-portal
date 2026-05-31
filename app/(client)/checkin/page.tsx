import { getCurrentClient } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import DailyPulseCard from '@/components/client/DailyPulseCard';
import MilestoneCard from '@/components/client/MilestoneCard';
import styles from './Checkin.module.css';

export const metadata = { title: 'Daily Check-In · Divergent' };

// ─── Types ────────────────────────────────────────────────────

interface SupplementRow {
  id: string;
  name: string;
  dose: string | null;
  timing: string | null;
  brand: string | null;
}

interface SessionRow {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  session_type: string;
  status: string;
}

interface ProtocolInfo {
  name: string;
  phase: number;
  startDate: string;
}

interface CheckinData {
  protocol: ProtocolInfo | null;
  supplements: SupplementRow[];
  nextSession: SessionRow | null;
}

// ─── Data fetching ─────────────────────────────────────────────

async function getCheckinData(clientId: string): Promise<CheckinData> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [protocolRes, supplementsRes, sessionRes] = await Promise.all([
    // Active protocol assignment joined to protocol name
    supabase
      .from('client_protocols')
      .select('current_phase, start_date, protocols(name)')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Active supplements ordered by timing
    supabase
      .from('supplements')
      .select('id, name, dose, timing, brand')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('timing')
      .limit(6),

    // Next upcoming session
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
    // Supabase returns joined table as object or array depending on relationship
    const protocolRecord = Array.isArray(row.protocols)
      ? row.protocols[0]
      : row.protocols;
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
  if (!startDate) return 'Day 1';
  const start = new Date(startDate);
  const today = new Date();
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const day = Math.max(1, diff + 1);
  return `Day ${day}`;
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function wellnessDashOffset(score: number): number {
  // SVG circle r=45 → circumference ≈ 283
  return 283 * (1 - Math.max(0, Math.min(100, score)) / 100);
}

function aiNudgeText(
  firstName: string,
  protocol: ProtocolInfo | null,
  supplementCount: number,
): string {
  if (!protocol && supplementCount === 0) {
    return `Your clinical journey begins with today's check-in, ${firstName}. Once your practitioner assigns a protocol, the Co-Pilot will begin tracking patterns across your check-ins and food journal entries — surfacing insights before your next session.`;
  }
  if (protocol) {
    return `Pattern snapshot for ${firstName}: Your daily pulse entries are being analyzed alongside your ${protocol.name} protocol progress. Continue logging consistently — the Co-Pilot identifies meaningful shifts after 5–7 consecutive entries. Any patterns flagged will be shared with your practitioner before your next session.`;
  }
  return `Your daily check-in responses are being tracked for patterns, ${firstName}. Consistent logging — even on good days — gives your practitioner the clearest picture of how your body is responding over time.`;
}

// ─── Page ─────────────────────────────────────────────────────

export default async function CheckInPage() {
  const client = await getCurrentClient();

  // Layout guarantees client is non-null; fallback names are safety nets only
  const firstName = client?.first_name ?? 'there';
  const fullName = client
    ? `${client.first_name} ${client.last_name}`
    : 'Client';
  const wellnessScore = client?.wellness_score ?? 0;
  const dashOffset = wellnessDashOffset(wellnessScore);

  const { protocol, supplements, nextSession } = client
    ? await getCheckinData(client.id)
    : { protocol: null, supplements: [], nextSession: null };

  const protocolDay = protocol ? protocolDayLabel(protocol.startDate) : null;

  // Compute protocol day number for milestone detection
  const protocolDayNum = protocol?.startDate
    ? Math.max(1, Math.floor((Date.now() - new Date(protocol.startDate).getTime()) / 86400000) + 1)
    : null;

  return (
    <div className={styles.page}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.welcome}>Welcome back</div>
          <h1 className={styles.name}>
            Hello, <em className={styles.nameEm}>{firstName}</em> ✦
          </h1>
          <p className={styles.tagline}>
            You&rsquo;re doing something remarkable for yourself. Let&rsquo;s keep it
            simple and steady.
          </p>

          {protocol && (
            <div className={styles.protocolBadge}>
              <span className={styles.protocolDot} />
              {protocol.name}
              {protocolDay ? ` · ${protocolDay}` : ''}
              {` · Phase ${protocol.phase}`}
            </div>
          )}
        </div>

        {/* Wellness score ring */}
        <div className={styles.scoreRing}>
          <svg className={styles.scoreSvg} viewBox="0 0 100 100" aria-label={`Wellness score: ${wellnessScore} out of 100`}>
            <circle className={styles.scoreTrack} cx="50" cy="50" r="45" />
            <circle
              className={styles.scoreFill}
              cx="50"
              cy="50"
              r="45"
              transform="rotate(-90 50 50)"
              style={{ strokeDashoffset: dashOffset }}
            />
            <text className={styles.scoreText} x="50" y="46">
              {wellnessScore}
            </text>
            <text className={styles.scoreSub} x="50" y="60">
              / 100
            </text>
          </svg>
          <div className={styles.scoreLabel}>Wellness Score</div>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────── */}
      <div className={styles.statsStrip}>
        <div className={styles.statItem}>
          <div className={styles.statVal}>{protocolDay ?? '—'}</div>
          <div className={styles.statLab}>On Protocol</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statVal}>{wellnessScore}</div>
          <div className={styles.statLab}>Wellness Score</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statVal}>
            {nextSession
              ? new Date(nextSession.scheduled_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : '—'}
          </div>
          <div className={styles.statLab}>Next Session</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statVal}>{supplements.length || '—'}</div>
          <div className={styles.statLab}>Active Supplements</div>
        </div>
        {protocol && (
          <div className={styles.statItem}>
            <div className={styles.statVal}>Week {protocol.phase}</div>
            <div className={styles.statLab}>Current Week</div>
          </div>
        )}
      </div>

      {/* ── Content grid ─────────────────────────────────────── */}
      <div className={styles.contentGrid}>

        {/* ── Main column ──────────────────────────────────── */}
        <div className={styles.mainCol}>

          {/* Milestone celebration (milestone days only) */}
          {protocolDayNum && (
            <MilestoneCard
              day={protocolDayNum}
              wellnessScore={wellnessScore}
            />
          )}

          {/* Warren's voice micro-copy */}
          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '13px',
            color: 'var(--pine-400)',
            margin: '0 0 12px',
            lineHeight: 1.55,
          }}>
            {protocol
              ? `${firstName}, each check-in adds a data point I use to adjust your protocol — even the small shifts matter.`
              : `Your first step, ${firstName}. A quick daily check-in tells me more than any lab ever could about how you're feeling day to day.`}
          </p>

          {/* Daily Pulse card */}
          <div>
            <div className={styles.sectionLabel}>How Are You Feeling? · 20 seconds</div>
            <DailyPulseCard firstName={firstName} />
          </div>

          {/* Journal shortcut */}
          <Link href="/journal" className={styles.journalCard}>
            <div className={styles.journalCardGlyph}>⚘</div>
            <div className={styles.journalCardBody}>
              <div className={styles.journalCardTitle}>Food + Mood Journal</div>
              <div className={styles.journalCardSub}>
                Log today&rsquo;s meals, mood, and symptoms — reviewed before every session
              </div>
            </div>
            <div className={styles.journalCardArrow}>→</div>
          </Link>

          {/* AI pattern nudge */}
          <div className={styles.aiNudge}>
            <div className={styles.aiNudgeLabel}>✦ AI Pattern Note</div>
            <p className={styles.aiNudgeText}>
              {aiNudgeText(firstName, protocol, supplements.length)}
            </p>
          </div>

        </div>

        {/* ── Side column ──────────────────────────────────── */}
        <div className={styles.sideCol}>

          {/* Quick actions */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>Quick Actions</div>
            <div className={styles.cardPad}>
              <div className={styles.qaList}>
                <Link href="/naq" className={`${styles.qaBtn} ${styles.qaBtnPine}`} style={{ display: 'flex', alignItems: 'center' }}>
                  <span className={styles.qaIcon}>✦</span>
                  Start NAQ Assessment
                </Link>
                <button className={`${styles.qaBtn} ${styles.qaBtnGhost}`}>
                  <span className={styles.qaIcon}>🗝</span>
                  Access The Vault
                </button>
                <Link href="/meals" className={`${styles.qaBtn} ${styles.qaBtnGhost}`} style={{ display: 'flex', alignItems: 'center' }}>
                  <span className={styles.qaIcon}>✿</span>
                  Browse Recipes
                </Link>
                <button className={`${styles.qaBtn} ${styles.qaBtnGhost}`}>
                  <span className={styles.qaIcon}>💬</span>
                  Message Your Practitioner
                </button>
                <button className={`${styles.qaBtn} ${styles.qaBtnCopper}`}>
                  <span className={styles.qaIcon}>📋</span>
                  Generate Physician Report
                </button>
              </div>
            </div>
          </div>

          {/* Next session */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>Next Session</div>
            <div className={styles.cardPad}>
              {nextSession ? (
                <div className={styles.sessionBlock}>
                  <div className={styles.sessionDate}>
                    {formatSessionDate(nextSession.scheduled_at)}
                  </div>
                  <div className={styles.sessionType}>
                    {nextSession.session_type === 'telehealth'
                      ? 'Telehealth Session'
                      : nextSession.session_type}
                  </div>
                  <div className={styles.sessionDuration}>
                    {nextSession.duration_minutes} min
                  </div>
                  <a href="#" className={styles.joinBtn}>
                    Join Session →
                  </a>
                </div>
              ) : (
                <div className={styles.sessionEmpty}>
                  No upcoming sessions scheduled. Book one via your practitioner.
                </div>
              )}
            </div>
          </div>

          {/* Supplement schedule */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              Active Supplements
              {supplements.length > 0 ? ` · ${supplements.length}` : ''}
            </div>
            <div className={styles.cardPad}>
              {supplements.length === 0 ? (
                <div className={styles.suppEmpty}>
                  Your supplement protocol will appear here once your practitioner assigns it.
                </div>
              ) : (
                <div className={styles.suppList}>
                  {supplements.map((s) => (
                    <div key={s.id} className={styles.suppItem}>
                      <div>
                        <div className={styles.suppName}>{s.name}</div>
                        {s.brand && (
                          <div className={styles.suppDose}>{s.brand}</div>
                        )}
                        {s.dose && (
                          <div className={styles.suppDose}>{s.dose}</div>
                        )}
                        {s.timing && (
                          <div className={styles.suppTiming}>{s.timing}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
