'use client';

import { useState, useEffect } from 'react';

interface Props {
  wellnessScore: number;
  naqComplete: boolean;
  recentJournalCount: number;
  consecutiveDays: number;
  articlesRead: number;
  hasInsight: boolean;
  protocolDay: number | null;
}

interface Celebration {
  id: string;
  title: string;
  body: string;
}

const STORAGE_KEY = 'divergent-celebrations-shown';

export default function ProgressCelebration({
  wellnessScore,
  naqComplete,
  recentJournalCount,
  consecutiveDays,
  articlesRead,
  hasInsight,
  protocolDay,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  useEffect(() => {
    let shown: string[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      shown = stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      shown = [];
    }

    // Determine which celebration to show (first match wins)
    const candidates: Celebration[] = [
      consecutiveDays >= 3
        ? {
            id: 'consec_3',
            title: '3 days in a row ✦',
            body: "You've logged for 3 consecutive days. Your body's patterns are starting to emerge.",
          }
        : null,
      naqComplete
        ? {
            id: 'naq_complete',
            title: 'NAQ complete ✦',
            body: `Your wellness picture is now complete. ${wellnessScore} wellness score established — your learning path has been personalized.`,
          }
        : null,
      protocolDay !== null && protocolDay >= 7
        ? {
            id: 'week_1',
            title: 'First week ✦',
            body: '7 days of data. Keep going — the first week is the hardest part of building any new habit.',
          }
        : null,
      articlesRead >= 3
        ? {
            id: 'articles_3',
            title: 'Reading milestone ✦',
            body: "You've read 3 foundation articles. Knowledge is the first layer of healing.",
          }
        : null,
      hasInsight
        ? {
            id: 'insight_unlocked',
            title: 'Insights unlocked ✦',
            body: 'Your data is generating personalized insights. Check your weekly insight card above.',
          }
        : null,
    ].filter((c): c is Celebration => c !== null);

    const toShow = candidates.find((c) => !shown.includes(c.id));
    if (toShow) {
      setCelebration(toShow);
      setVisible(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    if (!celebration) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const shown: string[] = stored ? (JSON.parse(stored) as string[]) : [];
      shown.push(celebration.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shown));
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible || !celebration) return null;

  return (
    <div
      style={{
        width: '100%',
        background: 'var(--pine-800)',
        border: '1px solid var(--pine-700)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '16px 20px',
        marginBottom: '12px',
        animation: 'celebrationSlideDown 300ms cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
    >
      <style>{`
        @keyframes celebrationSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--copper-500)', fontSize: '16px' }}>✦</span>
          <span
            style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '14px',
              fontWeight: 800,
              color: 'var(--copper-300)',
            }}
          >
            {celebration.title}
          </span>
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss celebration"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--pine-400)',
            fontFamily: 'Syne, sans-serif',
            fontSize: '12px',
            padding: '2px 6px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Body text */}
      <p
        style={{
          fontFamily: 'Lora, Georgia, serif',
          fontStyle: 'italic',
          fontSize: '13px',
          color: 'var(--pine-200)',
          margin: '8px 0 0',
          lineHeight: 1.6,
        }}
      >
        {celebration.body}
      </p>
    </div>
  );
}
