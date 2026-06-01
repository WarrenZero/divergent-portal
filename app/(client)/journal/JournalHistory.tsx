'use client';

import { useState } from 'react';
import styles from './Journal.module.css';

// ─── Types ────────────────────────────────────────────────────

export interface JournalEntryData {
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

interface DateGroup {
  dateKey: string;
  dateLabel: string;
  entries: JournalEntryData[];
}

// ─── Helpers ──────────────────────────────────────────────────

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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function localDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatGroupLabel(dateKey: string): string {
  // Build comparison keys using today's local date
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${pad2(yesterday.getMonth() + 1)}-${pad2(yesterday.getDate())}`;

  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';

  // Parse dateKey as noon local time to avoid DST shifts
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatEntryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function groupByDate(entries: JournalEntryData[]): DateGroup[] {
  const map = new Map<string, JournalEntryData[]>();
  for (const entry of entries) {
    const key = localDateKey(entry.logged_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, grpEntries]) => ({
      dateKey,
      dateLabel: formatGroupLabel(dateKey),
      entries: grpEntries,
    }));
}

// ─── Individual entry accordion (using <details>) ──────────────

function EntryDetail({ entry }: { entry: JournalEntryData }) {
  return (
    <details className={styles.entry}>
      <summary className={styles.entrySummary}>
        <div className={styles.entryLeft}>
          <span className={styles.entryTime}>{formatEntryTime(entry.logged_at)}</span>
          {entry.meal_time && (
            <span className={styles.entryMeal}>{entry.meal_time}</span>
          )}
          {entry.foods_eaten && (
            <span className={styles.entryFoodsPreview}>
              {entry.foods_eaten.slice(0, 40)}{entry.foods_eaten.length > 40 ? '…' : ''}
            </span>
          )}
        </div>
        <div className={styles.entryRight}>
          {entry.mood_before ? (
            <span className={styles.moodPill}>
              Sx Before: <strong>{SYMPTOM_LABEL[entry.mood_before]}</strong>
            </span>
          ) : null}
          {entry.mood_after ? (
            <span className={styles.moodPill}>
              Sx After: <strong>{SYMPTOM_LABEL[entry.mood_after]}</strong>
            </span>
          ) : null}
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
                <span className={styles.symptomNote}>{entry.symptom_before_note}</span>
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
                <span className={styles.symptomNote}>{entry.symptom_after_note}</span>
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
            <div className={`${styles.entryFieldVal} ${styles.entryNote}`}>{entry.notes}</div>
          </div>
        )}
      </div>
    </details>
  );
}

// ─── Date group accordion ──────────────────────────────────────

function DateGroupAccordion({
  group,
  defaultOpen,
}: {
  group: DateGroup;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={styles.dateGroup}>
      <button
        className={`${styles.dateGroupHeader} ${isOpen ? styles.dateGroupHeaderOpen : ''}`}
        onClick={() => setIsOpen(v => !v)}
        type="button"
        aria-expanded={isOpen}
      >
        <div className={styles.dateGroupTitleRow}>
          <span className={styles.dateGroupTitle}>{group.dateLabel}</span>
          <span className={styles.dateGroupBadge}>
            {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <span className={`${styles.dateGroupChevron} ${isOpen ? styles.dateGroupChevronOpen : ''}`}>
          ▼
        </span>
      </button>

      <div className={`${styles.dateGroupContent} ${isOpen ? styles.dateGroupContentOpen : ''}`}>
        <div className={styles.dateGroupInner}>
          <div className={styles.dateGroupPad}>
            {group.entries.map(entry => (
              <EntryDetail key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

interface Props {
  entries: JournalEntryData[];
}

export default function JournalHistory({ entries }: Props) {
  if (entries.length === 0) {
    return (
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
    );
  }

  const groups = groupByDate(entries);

  return (
    <div className={styles.historyList}>
      {groups.map((group, idx) => (
        <DateGroupAccordion
          key={group.dateKey}
          group={group}
          defaultOpen={idx === 0}
        />
      ))}
    </div>
  );
}
