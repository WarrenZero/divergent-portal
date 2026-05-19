'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logJournalEntry } from './actions';
import styles from './Journal.module.css';

// ─── Constants ────────────────────────────────────────────────

const MEAL_TIMES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const MOOD_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Fair',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
};

const BRISTOL_LABELS: Record<number, { short: string; color: string }> = {
  1: { short: 'Hard lumps', color: 'var(--warn)' },
  2: { short: 'Lumpy', color: 'var(--warn)' },
  3: { short: 'Cracked', color: 'var(--pine-500)' },
  4: { short: 'Smooth · Ideal', color: 'var(--pine-500)' },
  5: { short: 'Soft blobs', color: 'var(--pine-400)' },
  6: { short: 'Mushy', color: 'var(--warn)' },
  7: { short: 'Watery', color: 'var(--danger)' },
};

const EMPTY_FORM = {
  meal_time: '',
  time_eaten: '',   // HH:MM — lazy-initialized to current time in useState
  foods_eaten: '',
  mood_before: 0,
  mood_after: 0,
  symptoms: '',
  bowel_rating: 0,
  notes: '',
};

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────

export default function JournalForm() {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, time_eaten: nowHHMM() }));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await logJournalEntry(form);
      if (result.error) {
        setError(result.error);
      } else {
        setForm({ ...EMPTY_FORM, time_eaten: nowHHMM() });
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 4000);
      }
    });
  }

  const bristolInfo = form.bowel_rating ? BRISTOL_LABELS[form.bowel_rating] : null;

  return (
    <form onSubmit={handleSubmit} className={styles.formCard}>

      {/* ── Meal time + Time eaten (same row) ─────────────── */}
      <div className={styles.mealTimeRow}>
        <div className={styles.mealPillsGroup}>
          <div className={styles.fieldLabel}>Meal Time</div>
          <div className={styles.mealPills}>
            {MEAL_TIMES.map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.pill} ${form.meal_time === t ? styles.pillActive : ''}`}
                onClick={() => set('meal_time', t)}
                disabled={isPending}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.timeGroup}>
          <label className={styles.fieldLabel} htmlFor="j-time">Time eaten</label>
          <input
            id="j-time"
            type="time"
            className={styles.timeInput}
            value={form.time_eaten}
            onChange={(e) => set('time_eaten', e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      {/* ── Foods eaten ────────────────────────────────────── */}
      <div className={styles.formSection}>
        <label className={styles.fieldLabel} htmlFor="j-foods">
          Foods Eaten <span className={styles.required}>*</span>
        </label>
        <textarea
          id="j-foods"
          className={styles.textarea}
          placeholder="e.g. Scrambled eggs with spinach, avocado, black coffee…"
          rows={3}
          value={form.foods_eaten}
          onChange={(e) => set('foods_eaten', e.target.value)}
          disabled={isPending}
        />
      </div>

      {/* ── Mood before + after ────────────────────────────── */}
      <div className={styles.moodRow}>
        <div className={styles.formSection}>
          <div className={styles.fieldLabel}>Mood Before Eating</div>
          <div className={styles.scaleRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.scaleBtn} ${form.mood_before === n ? styles.scaleBtnActive : ''}`}
                onClick={() => set('mood_before', n)}
                disabled={isPending}
                title={MOOD_LABELS[n]}
              >
                {n}
              </button>
            ))}
          </div>
          {form.mood_before > 0 && (
            <div className={styles.scaleCaption}>{MOOD_LABELS[form.mood_before]}</div>
          )}
          <div className={styles.scaleRange}>
            <span>Low</span><span>Great</span>
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.fieldLabel}>Mood After Eating</div>
          <div className={styles.scaleRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.scaleBtn} ${form.mood_after === n ? styles.scaleBtnActive : ''}`}
                onClick={() => set('mood_after', n)}
                disabled={isPending}
                title={MOOD_LABELS[n]}
              >
                {n}
              </button>
            ))}
          </div>
          {form.mood_after > 0 && (
            <div className={styles.scaleCaption}>{MOOD_LABELS[form.mood_after]}</div>
          )}
          <div className={styles.scaleRange}>
            <span>Low</span><span>Great</span>
          </div>
        </div>
      </div>

      {/* ── Bristol stool scale ────────────────────────────── */}
      <div className={styles.formSection}>
        <div className={styles.fieldLabel}>
          Bristol Scale
          <span className={styles.fieldHint}> — bowel movement type</span>
        </div>
        <div className={styles.bristolRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const info = BRISTOL_LABELS[n];
            return (
              <button
                key={n}
                type="button"
                className={`${styles.bristolBtn} ${form.bowel_rating === n ? styles.bristolBtnActive : ''}`}
                style={form.bowel_rating === n ? { borderColor: info.color, color: info.color } : {}}
                onClick={() => set('bowel_rating', n)}
                disabled={isPending}
                title={info.short}
              >
                {n}
              </button>
            );
          })}
        </div>
        {bristolInfo && (
          <div className={styles.bristolCaption} style={{ color: bristolInfo.color }}>
            Type {form.bowel_rating} — {bristolInfo.short}
          </div>
        )}
        <div className={styles.scaleRange}>
          <span>Constipation</span><span>Watery</span>
        </div>
      </div>

      {/* ── Symptoms ───────────────────────────────────────── */}
      <div className={styles.formSection}>
        <label className={styles.fieldLabel} htmlFor="j-symptoms">
          Symptoms{' '}
          <span className={styles.optional}>(optional)</span>
        </label>
        <textarea
          id="j-symptoms"
          className={styles.textarea}
          placeholder="Bloating, cramping, fatigue, brain fog, reflux…"
          rows={2}
          value={form.symptoms}
          onChange={(e) => set('symptoms', e.target.value)}
          disabled={isPending}
        />
      </div>

      {/* ── Notes ──────────────────────────────────────────── */}
      <div className={styles.formSection}>
        <label className={styles.fieldLabel} htmlFor="j-notes">
          Notes{' '}
          <span className={styles.optional}>(optional)</span>
        </label>
        <textarea
          id="j-notes"
          className={styles.textarea}
          placeholder="Any other observations — stress, sleep quality, environment…"
          rows={2}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          disabled={isPending}
        />
      </div>

      {/* ── Submit ─────────────────────────────────────────── */}
      <div className={styles.formFooter}>
        {error && <div className={styles.formError}>{error}</div>}
        {saved && (
          <div className={styles.formSuccess}>
            ✓ Entry saved — your practitioner can see this in your profile.
          </div>
        )}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isPending || !form.meal_time || !form.foods_eaten.trim()}
        >
          {isPending ? 'Saving…' : 'Log Entry'}
        </button>
      </div>

    </form>
  );
}
