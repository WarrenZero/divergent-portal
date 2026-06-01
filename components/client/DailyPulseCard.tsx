'use client';

import { useState, useCallback, useEffect } from 'react';
import { submitDailyPulse } from '@/app/(client)/checkin/actions';
import styles from './DailyPulseCard.module.css';

interface Props {
  firstName: string;
}

const EMOJIS: Array<{ value: number; emoji: string; label: string }> = [
  { value: 1, emoji: '😔', label: 'Not great' },
  { value: 2, emoji: '😐', label: 'Low' },
  { value: 3, emoji: '🙂', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
];

interface SliderConfig {
  key: 'digestion' | 'sleep' | 'stress';
  label: string;
  defaultValue: number;
  color: string;
}

const SLIDERS: SliderConfig[] = [
  { key: 'digestion', label: 'Digestion',     defaultValue: 7, color: 'var(--pine-500)'   },
  { key: 'sleep',     label: 'Sleep Quality', defaultValue: 7, color: 'var(--copper-500)' },
  { key: 'stress',    label: 'Stress Burden', defaultValue: 4, color: '#B04848'           },
];

export default function DailyPulseCard({ firstName }: Props) {
  const [selectedEmoji, setSelectedEmoji] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [sliders, setSliders] = useState({ digestion: 7, sleep: 7, stress: 4 });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSlider = useCallback(
    (key: SliderConfig['key'], val: number) =>
      setSliders((prev) => ({ ...prev, [key]: val })),
    [],
  );

  // Auto-dismiss success after 3 seconds
  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(() => setStatus('idle'), 3000);
    return () => clearTimeout(t);
  }, [status]);

  async function handleSubmit() {
    if (!selectedEmoji) return;
    setStatus('submitting');
    setErrorMsg('');

    const result = await submitDailyPulse({
      energy_score: selectedEmoji,
      ...(expanded && {
        digestion_score: sliders.digestion,
        sleep_score: sliders.sleep,
        stress_score: sliders.stress,
      }),
    });

    if (result.error) {
      setErrorMsg(result.error);
      setStatus('error');
    } else {
      setStatus('success');
    }
  }

  if (status === 'success') {
    return (
      <div className={styles.card}>
        <div className={styles.successBox}>
          <span className={styles.successGlyph}>✦</span>
          <div className={styles.successTitle}>✓ Logged · Warren will see this before your next session</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {/* ─── Header ─── */}
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitle}>How Are You Feeling? ✦</div>
          <div className={styles.headerSub}>30 seconds · Warren reads this</div>
        </div>
        <span className={styles.headerBadge}>Daily</span>
      </div>

      {/* ─── Body ─── */}
      <div className={styles.body}>
        {status === 'error' && errorMsg && (
          <div className={styles.errorBox}>{errorMsg}</div>
        )}

        {/* Emoji row */}
        <div className={styles.emojiRow} role="group" aria-label="How are you feeling today?">
          {EMOJIS.map(({ value, emoji, label }) => (
            <button
              key={value}
              className={`${styles.emojiBtn} ${selectedEmoji === value ? styles.emojiBtnSelected : ''}`}
              onClick={() => setSelectedEmoji(value)}
              aria-label={label}
              aria-pressed={selectedEmoji === value}
              type="button"
            >
              <span className={styles.emojiChar}>{emoji}</span>
            </button>
          ))}
        </div>

        {/* Detail toggle */}
        <button
          className={styles.detailToggle}
          onClick={() => setExpanded((e) => !e)}
          type="button"
        >
          {expanded ? 'Hide details ↑' : 'Add more detail →'}
        </button>

        {/* Expanded sliders */}
        {expanded && (
          <div className={styles.slidersSection}>
            <p className={styles.warrensVoice}>
              Your responses build your wellness picture over time
            </p>
            {SLIDERS.map(({ key, label, defaultValue, color }) => (
              <PulseSlider
                key={key}
                label={label}
                color={color}
                value={sliders[key]}
                defaultValue={defaultValue}
                onChange={(v) => handleSlider(key, v)}
              />
            ))}
          </div>
        )}

        {/* Submit */}
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={status === 'submitting' || !selectedEmoji}
          aria-busy={status === 'submitting'}
          type="button"
        >
          {status === 'submitting' ? 'Saving…' : 'Save My Check-In ✦'}
        </button>

        {!selectedEmoji && (
          <p className={styles.submitHint}>Tap an emoji to log how you&rsquo;re feeling</p>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

interface SliderProps {
  label: string;
  color: string;
  value: number;
  defaultValue: number;
  onChange: (v: number) => void;
}

function PulseSlider({ label, color, value, defaultValue, onChange }: SliderProps) {
  const fillPct = ((value - 1) / 9) * 100;

  return (
    <div className={styles.sliderWrap}>
      <div className={styles.sliderLabel}>
        <span className={styles.sliderName}>{label}</span>
        <span className={styles.sliderVal} style={{ color }}>{value}</span>
      </div>
      <input
        type="range"
        className={styles.range}
        min={1}
        max={10}
        step={1}
        defaultValue={defaultValue}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={value}
        style={
          {
            '--track-color': color,
            '--fill-pct': `${fillPct}%`,
          } as React.CSSProperties
        }
      />
      <div className={styles.scaleHint}>
        <span>Low concern</span>
        <span>High burden</span>
      </div>
    </div>
  );
}
