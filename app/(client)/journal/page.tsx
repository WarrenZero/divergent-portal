import { getCurrentClient } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import JournalForm from './JournalForm';
import JournalHistory from './JournalHistory';
import type { JournalEntryData } from './JournalHistory';
import styles from './Journal.module.css';

export const metadata = { title: 'Food Journal · Divergent' };

export default async function JournalPage() {
  const client = await getCurrentClient();
  const firstName = client?.first_name ?? 'there';

  let entries: JournalEntryData[] = [];
  if (client) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('journal_entries')
      .select(
        'id, meal_time, foods_eaten, mood_before, mood_after, symptoms, symptom_before_note, symptom_after_note, bowel_rating, notes, logged_at',
      )
      .eq('client_id', client.id)
      .order('logged_at', { ascending: false })
      .limit(30);
    entries = (data ?? []) as JournalEntryData[];
  }

  return (
    <div className={styles.page}>

      {/* ── Top bar ────────────────────────────────────────── */}
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div>
            <div className={styles.topBarLabel}>Food + Mood Journal</div>
            <h1 className={styles.topBarTitle}>
              What are you nourishing today,{' '}
              <em className={styles.topBarEm}>{firstName}</em>?
            </h1>
          </div>
          <div className={styles.topBarGlyph}>✦</div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className={styles.content}>

        <div className={styles.sectionLabel}>Log an Entry</div>
        <JournalForm />

        <div className={styles.historySection}>
          <div className={styles.sectionLabel}>
            Recent Entries
            {entries.length > 0 ? ` · ${entries.length}` : ''}
          </div>
          <JournalHistory entries={entries} />
        </div>

      </div>
    </div>
  );
}
