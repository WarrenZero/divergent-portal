'use client';

import { useState } from 'react';
import styles from './MilestoneCard.module.css';

interface Props {
  day: number;
  wellnessScore: number;
  onContinue?: () => void;
}

interface MilestoneContent {
  headline: string;
  warrensNote: string;
  showScore: boolean;
  identityStatement?: string;
}

const MILESTONE_DATA: Record<number, MilestoneContent> = {
  1: {
    headline: 'Day one ✦ · You\'ve started something real.',
    warrensNote: 'Every journey begins with a single step. I\'m glad you\'re here.',
    showScore: false,
  },
  7: {
    headline: 'One week in ✦',
    warrensNote: 'Seven days of data. I can already see patterns forming. Keep going.',
    showScore: true,
    identityStatement: "You're the kind of person who shows up even when it's new.",
  },
  14: {
    headline: 'Two weeks ✦',
    warrensNote: 'Your body is starting to respond. The work you\'re doing now is compounding.',
    showScore: false,
    identityStatement: "Two weeks in — you're building a practice, not just a habit.",
  },
  30: {
    headline: 'Thirty days ✦',
    warrensNote: 'One third of your journey. The foundation is set. Week 2 begins.',
    showScore: true,
    identityStatement: "One month of consistent self-care. That's a real identity shift.",
  },
  60: {
    headline: 'Sixty days ✦',
    warrensNote: 'Two thirds through. Most people feel the shift somewhere around here.',
    showScore: false,
    identityStatement: "Sixty days shows this isn't a phase. This is who you are.",
  },
  90: {
    headline: 'Your journey ✦ · Ninety days.',
    warrensNote: 'You did it. This is what commitment looks like.',
    showScore: true,
    identityStatement: "Ninety days. You've become someone who honors their body.",
  },
};

export default function MilestoneCard({ day, wellnessScore, onContinue }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const content = MILESTONE_DATA[day];

  if (dismissed || !content) return null;

  function handleContinue() {
    setDismissed(true);
    onContinue?.();
  }

  return (
    <div className={styles.card}>
      {/* Ring animation */}
      <div className={styles.ringWrap}>
        <span className={styles.glyph}>✦</span>
        <span className={styles.ring} />
      </div>

      {/* Day number */}
      <div className={styles.dayNum}>{day}</div>
      <div className={styles.dayLabel}>days</div>

      {/* Headline */}
      <h2 className={styles.headline}>{content.headline}</h2>

      {/* Wellness score on milestone days that show it */}
      {content.showScore && wellnessScore > 0 && (
        <div className={styles.scoreBlock}>
          <div className={styles.scoreNum}>{wellnessScore}</div>
          <div className={styles.scoreLab}>Wellness Score</div>
          <div className={styles.scoreBar}>
            <div
              className={styles.scoreBarFill}
              style={{ width: `${Math.min(100, wellnessScore)}%` }}
            />
          </div>
        </div>
      )}

      {/* Warren's note */}
      <p className={styles.note}>
        &ldquo;{content.warrensNote}&rdquo;
      </p>
      <p className={styles.noteAttr}>— Warren</p>

      {/* Identity statement */}
      {content.identityStatement && (
        <p style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: 13,
          color: '#DFA878',
          textAlign: 'center',
          marginTop: 14,
          marginBottom: 0,
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}>
          {content.identityStatement}
        </p>
      )}

      {/* CTA */}
      <button className={styles.continueBtn} onClick={handleContinue}>
        Daily Check-In →
      </button>
    </div>
  );
}
