'use client';

import { useState, useCallback } from 'react';
import { submitDailyPulse } from '@/app/(client)/checkin/actions';
import styles from './DailyPulseCard.module.css';

interface Props {
  firstName: string;
}

interface SliderConfig {
  key: 'digestion' | 'sleep' | 'stress';
  label: string;
  defaultValue: number;
  color: string;       // CSS value for val readout + track
}

const SLIDERS: SliderConfig[] = [
  { key: 'digestion', label: 'Digestion',    defaultValue: 7, color: 'var(--pine-500)'   },
  { key: 'sleep',     label: 'Sleep Quality', defaultValue: 7, color: 'var(--copper-500)' },
  { key: 'stress',    label: 'Stress Burden', defaultValue: 4, color: '#B04848'           },
];

export default function DailyPulseCard({ firstName }: Props) {
  const [values, setValues] = useState({ digestion: 7, sleep: 7, stress: 4 });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = useCallback(
    (key: SliderConfig['key'], val: number) =>
      setValues((prev) => ({ ...prev, [key]: val })),
    [],
  );

  async function handleSubmit() {
    setStatus('submitting');
    setErrorMsg('');

    const result = await submitDailyPulse({
      digestion_score: values.digestion,
      sleep_score: values.sleep,
      stress_score: values.stress,
    });

    if (result.error) {
      setErrorMsg(result.error);
      setStatus('error');
    } else {
      setStatus('success');
    }
  }

  return (
    <div className={styles.card}>
      {/* ─── Header ─── */}
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitle}>Daily Pulse ✦</div>
          <div className={styles.headerSub}>20 seconds · Feeds AI pattern engine</div>
        </div>
        <span className={styles.headerBadge}>Daily</span>
      </div>

      {/* ─── Body ─── */}
      <div className={styles.body}>
        {status === 'success' ? (
          <SuccessState firstName={firstName} />
        ) : (
          <>
            {status === 'error' && errorMsg && (
              <div className={styles.errorBox}>{errorMsg}</div>
            )}

            {SLIDERS.map(({ key, label, defaultValue, color }) => (
              <PulseSlider
                key={key}
                label={label}
                color={color}
                value={values[key]}
                defaultValue={defaultValue}
                onChange={(v) => handleChange(key, v)}
              />
            ))}

            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={status === 'submitting'}
              aria-busy={status === 'submitting'}
            >
              {status === 'submitting' ? 'Saving…' : 'Submit Today\'s Pulse →'}
            </button>

            <p className={styles.submitHint}>
              Your weekly AI NAQ is a separate deeper conversation →
            </p>
          </>
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
  // Drive the CSS gradient fill with an inline custom property
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

function SuccessState({ firstName }: { firstName: string }) {
  return (
    <div className={styles.successBox}>
      <span className={styles.successGlyph}>✦</span>
      <div className={styles.successTitle}>
        Pulse logged, {firstName}.
      </div>
      <div className={styles.successSub}>
        Your pattern engine has been updated. Check back tomorrow.
      </div>
    </div>
  );
}
