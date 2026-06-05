'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logJournalEntry } from './actions';
import styles from './Journal.module.css';

// ─── Constants ────────────────────────────────────────────────

const MEAL_TIMES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const SYMPTOM_LABELS: Record<number, string> = {
  1: 'None',
  2: 'Mild',
  3: 'Moderate',
  4: 'Significant',
  5: 'Severe',
};

const BRISTOL_LABELS: Record<number, { short: string; color: string; hint?: string; hintColor?: string }> = {
  1: { short: 'Hard lumps',     color: 'var(--warn)',    hint: 'may indicate constipation', hintColor: 'var(--bone-600)' },
  2: { short: 'Lumpy sausage',  color: 'var(--warn)',    hint: 'may indicate constipation', hintColor: 'var(--bone-600)' },
  3: { short: 'Cracked sausage',color: 'var(--pine-500)',hint: 'optimal',                   hintColor: 'var(--pine-500)' },
  4: { short: 'Smooth sausage', color: 'var(--pine-500)',hint: 'optimal',                   hintColor: 'var(--pine-500)' },
  5: { short: 'Soft blobs',     color: 'var(--pine-400)' },
  6: { short: 'Fluffy pieces',  color: 'var(--warn)',    hint: 'may indicate inflammation', hintColor: 'var(--bone-600)' },
  7: { short: 'Watery',         color: 'var(--danger)',  hint: 'may indicate inflammation', hintColor: 'var(--bone-600)' },
};

const SYMPTOM_NOTE_PLACEHOLDER =
  'e.g. bloating, cramping, fatigue, brain fog, reflux, nausea, heartburn…';

const EMPTY_FORM = {
  meal_time: '',
  time_eaten: '',
  foods_eaten: '',
  mood_before: 0,             // DB column: stores "Symptoms Before" score (1-5)
  mood_after: 0,              // DB column: stores "Symptoms After" score (1-5)
  symptom_before_note: '',
  symptom_after_note: '',
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
  const [hadBowelMovement, setHadBowelMovement] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSymptomScore(field: 'mood_before' | 'mood_after', score: number) {
    const noteField = field === 'mood_before' ? 'symptom_before_note' : 'symptom_after_note';
    setForm((prev) => ({
      ...prev,
      [field]: score,
      // Clear the note when selecting "None" (1)
      ...(score <= 1 ? { [noteField]: '' } : {}),
    }));
    setSaved(false);
  }

  function handleBowelToggle(value: boolean) {
    setHadBowelMovement(value);
    if (!value) setForm((prev) => ({ ...prev, bowel_rating: 0 }));
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    // Require symptom note when score > 1
    if (form.mood_before > 1 && !form.symptom_before_note.trim()) {
      setError('Please describe your symptoms before eating.');
      return;
    }
    if (form.mood_after > 1 && !form.symptom_after_note.trim()) {
      setError('Please describe your symptoms after eating.');
      return;
    }

    startTransition(async () => {
      const result = await logJournalEntry({
        ...form,
        bowel_rating: hadBowelMovement === true ? form.bowel_rating : 0,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setForm({ ...EMPTY_FORM, time_eaten: nowHHMM() });
        setHadBowelMovement(null);
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 4000);
      }
    });
  }

  const bristolInfo = form.bowel_rating ? BRISTOL_LABELS[form.bowel_rating] : null;

  return (
    <form onSubmit={handleSubmit} className={styles.formCard}>

      {/* ── Meal time + Time eaten ─────────────────────────── */}
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

      {/* ── Symptoms before ────────────────────────────────── */}
      <div className={styles.formSection}>
        <div className={styles.fieldLabel}>Symptoms Before Eating</div>
        <div className={styles.scaleRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.scaleBtn} ${form.mood_before === n ? styles.scaleBtnActive : ''}`}
              onClick={() => handleSymptomScore('mood_before', n)}
              disabled={isPending}
              title={SYMPTOM_LABELS[n]}
            >
              {n}
            </button>
          ))}
        </div>
        {form.mood_before > 0 && (
          <div className={styles.scaleCaption}>
            {form.mood_before} · {SYMPTOM_LABELS[form.mood_before]}
          </div>
        )}
        <div className={styles.scaleRange}>
          <span>None</span><span>Severe</span>
        </div>
        {form.mood_before > 1 && (
          <div className={styles.symptomNoteWrap}>
            <label className={styles.symptomNoteLabel} htmlFor="j-sx-before">
              Describe your symptoms
            </label>
            <textarea
              id="j-sx-before"
              className={styles.textarea}
              placeholder={SYMPTOM_NOTE_PLACEHOLDER}
              rows={2}
              value={form.symptom_before_note}
              onChange={(e) => set('symptom_before_note', e.target.value)}
              disabled={isPending}
            />
          </div>
        )}
      </div>

      {/* ── Symptoms after ─────────────────────────────────── */}
      <div className={styles.formSection}>
        <div className={styles.fieldLabel}>Symptoms After Eating</div>
        <div className={styles.scaleRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.scaleBtn} ${form.mood_after === n ? styles.scaleBtnActive : ''}`}
              onClick={() => handleSymptomScore('mood_after', n)}
              disabled={isPending}
              title={SYMPTOM_LABELS[n]}
            >
              {n}
            </button>
          ))}
        </div>
        {form.mood_after > 0 && (
          <div className={styles.scaleCaption}>
            {form.mood_after} · {SYMPTOM_LABELS[form.mood_after]}
          </div>
        )}
        <div className={styles.scaleRange}>
          <span>None</span><span>Severe</span>
        </div>
        {form.mood_after > 1 && (
          <div className={styles.symptomNoteWrap}>
            <label className={styles.symptomNoteLabel} htmlFor="j-sx-after">
              Describe your symptoms
            </label>
            <textarea
              id="j-sx-after"
              className={styles.textarea}
              placeholder={SYMPTOM_NOTE_PLACEHOLDER}
              rows={2}
              value={form.symptom_after_note}
              onChange={(e) => set('symptom_after_note', e.target.value)}
              disabled={isPending}
            />
          </div>
        )}
      </div>

      {/* ── Bowel movement YES / NO ────────────────────────── */}
      <div className={styles.formSection}>
        <div className={styles.fieldLabel}>
          Any changes in digestion after eating?
        </div>
        <div className={styles.yesNoRow}>
          <button
            type="button"
            className={`${styles.yesNoBtn} ${hadBowelMovement === true ? styles.yesNoBtnActive : ''}`}
            onClick={() => handleBowelToggle(true)}
            disabled={isPending}
          >
            Yes
          </button>
          <button
            type="button"
            className={`${styles.yesNoBtn} ${hadBowelMovement === false ? styles.yesNoBtnActive : ''}`}
            onClick={() => handleBowelToggle(false)}
            disabled={isPending}
          >
            No
          </button>
        </div>
      </div>

      {/* ── Bristol Scale (only if YES) ────────────────────── */}
      {hadBowelMovement === true && (
        <div className={styles.formSection}>
          <div className={styles.fieldLabel}>What type?</div>
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: '12px', color: 'var(--pine-400)', margin: '4px 0 8px', lineHeight: 1.5 }}>
            This tells Warren how well your body is digesting — tap the number that best matches today.
          </p>
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
            <div>
              <div style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: '12px', color: 'var(--pine-400)', marginTop: 6 }}>
                Type {form.bowel_rating} — {bristolInfo.short}
              </div>
              {bristolInfo.hint && (
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: '11px', color: bristolInfo.hintColor, marginTop: 2 }}>
                  {bristolInfo.hint}
                </div>
              )}
            </div>
          )}
          <div className={styles.scaleRange}>
            <span>Constipation</span><span>Watery</span>
          </div>
        </div>
      )}

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
