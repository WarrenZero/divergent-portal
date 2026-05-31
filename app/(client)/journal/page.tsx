import { getCurrentClient } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import JournalForm from './JournalForm';
import styles from './Journal.module.css';

export const metadata = { title: 'Food Journal · Divergent' };

// ─── Types ────────────────────────────────────────────────────

interface JournalEntry {
  id: string;
  meal_time: string | null;
  foods_eaten: string | null;
  mood_before: number | null;
  mood_after: number | null;
  symptoms: string | null;
  symptom_before_note: string | null;
  symptom_after_note: string | null;
  bowel_rating: number | null;
  notes: string | null;
  logged_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────

const BRISTOL_SHORT: Record<number, string> = {
  1: 'Hard lumps',
  2: 'Lumpy',
  3: 'Cracked',
  4: 'Smooth (ideal)',
  5: 'Soft blobs',
  6: 'Mushy',
  7: 'Watery',
};

const BRISTOL_COLOR: Record<number, string> = {
  1: 'var(--warn)', 2: 'var(--warn)',
  3: 'var(--pine-500)', 4: 'var(--pine-500)', 5: 'var(--pine-400)',
  6: 'var(--warn)', 7: 'var(--danger)',
};

const SYMPTOM_LABEL: Record<number, string> = {
  1: 'None', 2: 'Mild', 3: 'Moderate', 4: 'Significant', 5: 'Severe',
};

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatEntryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function symptomDots(before: number | null, after: number | null) {
  if (!before && !after) return null;
  return (
    <span className={styles.moodPills}>
      {before ? (
        <span className={styles.moodPill}>
          Sx Before: <strong>{SYMPTOM_LABEL[before]}</strong>
        </span>
      ) : null}
      {after ? (
        <span className={styles.moodPill}>
          Sx After: <strong>{SYMPTOM_LABEL[after]}</strong>
        </span>
      ) : null}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default async function JournalPage() {
  const client = await getCurrentClient();
  const firstName = client?.first_name ?? 'there';

  let entries: JournalEntry[] = [];
  if (client) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('journal_entries')
      .select(
        'id, meal_time, foods_eaten, mood_before, mood_after, symptoms, symptom_before_note, symptom_after_note, bowel_rating, notes, logged_at',
      )
      .eq('client_id', client.id)
      .order('logged_at', { ascending: false })
      .limit(7);
    entries = (data ?? []) as JournalEntry[];
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

        {/* Log form */}
        <div className={styles.sectionLabel}>Log an Entry</div>
        <JournalForm />

        {/* History */}
        <div className={styles.historySection}>
          <div className={styles.sectionLabel}>
            Recent Entries
            {entries.length > 0 ? ` · ${entries.length}` : ''}
          </div>

          {entries.length === 0 ? (
            <div className={styles.historyEmpty}>
              <div className={styles.emptyGlyph}>⚘</div>
              <div className={styles.emptyTitle}>No entries yet</div>
              <p className={styles.emptyText}>
                Your food and mood log will appear here after your first submission.
                Consistent logging — even on simple days — gives your practitioner
                the clearest picture of how your body responds.
              </p>
              <p style={{
                fontFamily: "'Lora', Georgia, serif",
                fontStyle: 'italic',
                fontSize: '13px',
                color: 'var(--pine-400)',
                marginTop: '12px',
                lineHeight: 1.55,
              }}>
                — I read every entry before our sessions. What you eat and how you feel after is some of the most valuable clinical data I have.
              </p>
            </div>
          ) : (
            <div className={styles.historyList}>
              {entries.map((entry) => (
                <details key={entry.id} className={styles.entry}>
                  <summary className={styles.entrySummary}>
                    <div className={styles.entryLeft}>
                      <span className={styles.entryDate}>
                        {formatEntryDate(entry.logged_at)}
                      </span>
                      <span className={styles.entryTime}>
                        {formatEntryTime(entry.logged_at)}
                      </span>
                      {entry.meal_time && (
                        <span className={styles.entryMeal}>{entry.meal_time}</span>
                      )}
                    </div>
                    <div className={styles.entryRight}>
                      {symptomDots(entry.mood_before, entry.mood_after)}
                      {entry.bowel_rating && (
                        <span
                          className={styles.bristolTag}
                          style={{ color: BRISTOL_COLOR[entry.bowel_rating] }}
                        >
                          B{entry.bowel_rating}
                        </span>
                      )}
                      <span className={styles.chevron}>›</span>
                    </div>
                  </summary>

                  <div className={styles.entryBody}>
                    {entry.foods_eaten && (
                      <div className={styles.entryField}>
                        <div className={styles.entryFieldLabel}>Foods Eaten</div>
                        <div className={styles.entryFieldVal}>{entry.foods_eaten}</div>
                      </div>
                    )}

                    <div className={styles.entryMeta}>
                      {entry.mood_before && (
                        <div className={styles.entryMetaItem}>
                          <span className={styles.entryMetaLabel}>Symptoms Before</span>
                          <span className={styles.entryMetaVal}>
                            {entry.mood_before} — {SYMPTOM_LABEL[entry.mood_before]}
                          </span>
                          {entry.symptom_before_note && (
                            <span className={styles.symptomNote}>
                              {entry.symptom_before_note}
                            </span>
                          )}
                        </div>
                      )}
                      {entry.mood_after && (
                        <div className={styles.entryMetaItem}>
                          <span className={styles.entryMetaLabel}>Symptoms After</span>
                          <span className={styles.entryMetaVal}>
                            {entry.mood_after} — {SYMPTOM_LABEL[entry.mood_after]}
                          </span>
                          {entry.symptom_after_note && (
                            <span className={styles.symptomNote}>
                              {entry.symptom_after_note}
                            </span>
                          )}
                        </div>
                      )}
                      {entry.bowel_rating && (
                        <div className={styles.entryMetaItem}>
                          <span className={styles.entryMetaLabel}>Bristol Type</span>
                          <span
                            className={styles.entryMetaVal}
                            style={{ color: BRISTOL_COLOR[entry.bowel_rating] }}
                          >
                            {entry.bowel_rating} — {BRISTOL_SHORT[entry.bowel_rating]}
                          </span>
                        </div>
                      )}
                    </div>

                    {entry.symptoms && (
                      <div className={styles.entryField}>
                        <div className={styles.entryFieldLabel}>Symptoms</div>
                        <div className={styles.entryFieldVal}>{entry.symptoms}</div>
                      </div>
                    )}
                    {entry.notes && (
                      <div className={styles.entryField}>
                        <div className={styles.entryFieldLabel}>Notes</div>
                        <div className={`${styles.entryFieldVal} ${styles.entryNote}`}>
                          {entry.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
