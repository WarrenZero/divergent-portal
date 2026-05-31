'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './WhatTodayButton.module.css';

type TodayAction = 'checkin_needed' | 'naq_needed' | 'session_tomorrow' | 'all_done';

interface TodayData {
  action: TodayAction;
  sessionDate?: string;
}

const ACTION_CONFIG: Record<TodayAction, { headline: string; cta?: string; href?: string }> = {
  checkin_needed: {
    headline: 'Log your daily check-in →',
    cta: 'How Are You Feeling?',
    href: '/checkin',
  },
  naq_needed: {
    headline: 'Complete your Health Assessment →',
    cta: 'Start Assessment',
    href: '/naq',
  },
  session_tomorrow: {
    headline: 'Your session with Warren is tomorrow',
    cta: 'Add notes for him →',
    href: '/journal',
  },
  all_done: {
    headline: 'You\'re all caught up ✦',
  },
};

export default function WhatTodayButton() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    setOpen(true);
    if (data) return; // already fetched
    setLoading(true);
    try {
      const res = await fetch('/api/client/today-action');
      if (res.ok) setData(await res.json());
    } catch {
      setData({ action: 'all_done' });
    } finally {
      setLoading(false);
    }
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const config = data ? ACTION_CONFIG[data.action] : null;

  return (
    <>
      {/* Floating ? button */}
      <button
        className={styles.fab}
        onClick={handleOpen}
        aria-label="What should I do today?"
        aria-expanded={open}
      >
        ?
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className={styles.backdrop}
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sheet */}
      {open && (
        <div className={styles.sheet} role="dialog" aria-modal aria-label="Today's action">
          <div className={styles.sheetHandle} />

          <button
            className={styles.closeBtn}
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            ×
          </button>

          <p className={styles.sheetLabel}>Here&apos;s your one thing today:</p>

          {loading && (
            <div className={styles.loading}>Finding your next step…</div>
          )}

          {config && !loading && (
            <>
              {config.href ? (
                <Link
                  href={config.href}
                  className={styles.actionBtn}
                  onClick={() => setOpen(false)}
                >
                  {config.headline}
                </Link>
              ) : (
                <div className={styles.allDone}>
                  <span className={styles.allDoneGlyph}>✦</span>
                  <div className={styles.allDoneText}>{config.headline}</div>
                  <div className={styles.allDoneSub}>
                    Come back tomorrow for your next check-in.
                  </div>
                </div>
              )}

              <div className={styles.quickLinks}>
                <Link href="/journal" onClick={() => setOpen(false)} className={styles.quickLink}>
                  Message Warren
                </Link>
                <Link href="/checkin" onClick={() => setOpen(false)} className={styles.quickLink}>
                  My plan
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
