import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import styles from './Clients.module.css';

export const metadata = { title: 'Clients · Divergent' };

// ─── Types ────────────────────────────────────────────────────

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  primary_concern: string | null;
  wellness_score: number;
  created_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────

// Deterministic gradient from the Divergent palette keyed to first initial
const GRADIENTS = [
  'linear-gradient(135deg, #C07848, #DFA878)', // copper
  'linear-gradient(135deg, #3A5C42, #5A7C62)', // pine
  'linear-gradient(135deg, #2A4330, #3A5C42)', // dark pine
  'linear-gradient(135deg, #8A5028, #C07848)', // copper dark
  'linear-gradient(135deg, #5A4C38, #9A8A72)', // bone
  'linear-gradient(135deg, #162A1A, #2A4330)', // pine deep
];

function avatarGradient(firstName: string): string {
  return GRADIENTS[(firstName.charCodeAt(0) ?? 0) % GRADIENTS.length];
}

function initials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function scoreColor(score: number): string {
  if (score >= 67) return 'var(--pine-500)';
  if (score >= 34) return 'var(--warn)';
  return 'var(--danger)';
}

function daysSince(iso: string): string {
  const days = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return 'Added today';
  if (days === 1) return 'Added yesterday';
  return `Added ${days} days ago`;
}

// ─── Page ─────────────────────────────────────────────────────

export default async function ClientsPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, primary_concern, wellness_score, created_at')
    .eq('practitioner_id', practitioner.id)
    .order('created_at', { ascending: false });

  const rows: ClientRow[] = clients ?? [];

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Clients</h1>
          <p className={styles.pageSub}>
            {rows.length > 0
              ? `${rows.length} client${rows.length !== 1 ? 's' : ''} · Click to view profile`
              : 'No clients yet — add your first one'}
          </p>
        </div>
        <div className={styles.pageActions}>
          <Link href="/clients/new" className={styles.btnPrimary}>
            + New Client
          </Link>
        </div>
      </div>

      {/* ── Client list ──────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyGlyph}>◉</div>
          <div className={styles.emptyTitle}>No clients yet</div>
          <p className={styles.emptyText}>
            Add your first client to start tracking their wellness journey,
            assigning protocols, and running AI-assisted assessments.
          </p>
          <Link href="/clients/new" className={styles.btnPrimary}>
            + Add First Client
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {rows.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className={styles.card}
            >
              {/* Avatar */}
              <div
                className={styles.avatar}
                style={{ background: avatarGradient(client.first_name) }}
              >
                {initials(client.first_name, client.last_name)}
              </div>

              {/* Info */}
              <div>
                <div className={styles.name}>
                  {client.first_name} {client.last_name}
                </div>
                <div className={styles.meta}>
                  {client.email ?? 'No email'} · {daysSince(client.created_at)}
                </div>
                {client.primary_concern && (
                  <div className={styles.concern}>{client.primary_concern}</div>
                )}
              </div>

              {/* Score */}
              <div className={styles.scoreCol}>
                <span
                  className={`${styles.scoreBadge} ${
                    client.wellness_score === 0 ? styles.badgeNew : styles.badgeActive
                  }`}
                >
                  {client.wellness_score === 0 ? 'New' : 'Active'}
                </span>
                <span
                  className={styles.scoreNum}
                  style={{ color: scoreColor(client.wellness_score) }}
                >
                  {client.wellness_score}
                </span>
                <span className={styles.scoreLabel}>Wellness</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
