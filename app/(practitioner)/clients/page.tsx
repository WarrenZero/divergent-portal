import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import styles from './Clients.module.css';
import ClientListWithBulkActions from './ClientListWithBulkActions';

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
  shame_signal_active: boolean | null;
  last_psychological_state: string | null;
}

// ─── Page ─────────────────────────────────────────────────────

export default async function ClientsPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, primary_concern, wellness_score, created_at, shame_signal_active, last_psychological_state')
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

      {/* ── Client list with bulk actions ────────────────────── */}
      <ClientListWithBulkActions clients={rows} />
    </div>
  );
}
