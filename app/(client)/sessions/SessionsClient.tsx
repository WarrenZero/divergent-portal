'use client';

import { useState } from 'react';
import styles from './Sessions.module.css';

interface Props {
  firstName: string;
  email: string;
  subscriptionTier: string;
  sessionsCompleted: number;
  nextSession: { id: string; scheduled_at: string; session_type: string; status: string } | null;
}

const SESSIONS = [
  {
    id: 'initial',
    title: 'Initial Consultation',
    duration: '75 min',
    price: '$150',
    description:
      'Your first session with Warren — a deep-dive intake covering your health history, goals, and the foundation of your 90-day protocol.',
    cta: 'Schedule on Calendly →',
    calendly: true,
    requiresCompleted: 0,
    glyph: '✦',
  },
  {
    id: 'followup',
    title: 'Follow-Up Session',
    duration: '45 min',
    price: '$75',
    description:
      'Check in on protocol progress, adjust supplements based on your journal data, and address any symptoms that have shifted.',
    cta: 'Schedule on Calendly →',
    calendly: true,
    requiresCompleted: 1,
    glyph: '◈',
  },
  {
    id: 'protocol-review',
    title: 'Protocol Review',
    duration: '60 min',
    price: '$125',
    description:
      'A full mid-point review of your 90-day journey — lab marker trends, NAQ comparison, phase advancement, and next-step planning.',
    cta: 'Schedule on Calendly →',
    calendly: true,
    requiresCompleted: 1,
    glyph: '⊕',
  },
  {
    id: 'program-90',
    title: '90-Day Program',
    duration: 'Full program',
    price: '$1,497',
    description:
      'The complete Divergent experience: Initial consultation, three follow-ups, protocol review, daily portal access, and Warren\'s personal guidance for 90 days.',
    cta: 'Inquire by email →',
    calendly: false,
    requiresCompleted: 0,
    glyph: '◉',
    emailLink: 'mailto:warren@divergentnt.com?subject=90-Day%20Program%20Inquiry',
  },
];

function formatSessionDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function SessionsClient({
  firstName,
  email,
  sessionsCompleted,
  nextSession,
}: Props) {
  const [activeCalendly, setActiveCalendly] = useState<string | null>(null);

  const calendlyBase = 'https://calendly.com/rootcausedivergent';
  const prefill = email ? `?email=${encodeURIComponent(email)}&name=${encodeURIComponent(firstName)}` : '';

  return (
    <div className={styles.page}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageGlyph}>✦</div>
        <h1 className={styles.pageTitle}>Book a Session</h1>
        <p className={styles.pageSubtitle}>
          Every session is reviewed in the context of your portal data — your journal,
          check-ins, and protocol progress all inform Warren&rsquo;s preparation.
        </p>
      </div>

      {/* ── Next session banner ─────────────────────────────────── */}
      {nextSession && (
        <div className={styles.nextBanner}>
          <span className={styles.nextBannerGlyph}>◉</span>
          <div className={styles.nextBannerBody}>
            <div className={styles.nextBannerLabel}>UPCOMING SESSION</div>
            <div className={styles.nextBannerDate}>
              {formatSessionDateTime(nextSession.scheduled_at)}
            </div>
          </div>
        </div>
      )}

      {/* ── Google Calendar trust signal ────────────────────────── */}
      <div className={styles.trustRow}>
        <span className={styles.trustIcon}>📅</span>
        <span className={styles.trustText}>
          Sessions automatically sync to your Google Calendar or Apple Calendar after booking
        </span>
      </div>

      {/* ── Session cards ───────────────────────────────────────── */}
      <div className={styles.cards}>
        {SESSIONS.map((s) => {
          const locked = s.requiresCompleted > sessionsCompleted;
          const isOpen = activeCalendly === s.id;

          return (
            <div key={s.id} className={`${styles.card} ${locked ? styles.cardLocked : ''}`}>
              <div className={styles.cardTop}>
                <div className={styles.cardMeta}>
                  <span className={styles.cardGlyph}>{s.glyph}</span>
                  <div className={styles.cardTitleRow}>
                    <span className={styles.cardTitle}>{s.title}</span>
                    {locked && <span className={styles.lockBadge}>🔒 Complete your first session first</span>}
                  </div>
                </div>
                <div className={styles.cardPriceBlock}>
                  <span className={styles.cardPrice}>{s.price}</span>
                  <span className={styles.cardDuration}>{s.duration}</span>
                </div>
              </div>

              <p className={styles.cardDesc}>{s.description}</p>

              {!locked && (
                <>
                  {s.calendly ? (
                    <button
                      type="button"
                      className={`${styles.ctaBtn} ${isOpen ? styles.ctaBtnActive : ''}`}
                      onClick={() => setActiveCalendly(isOpen ? null : s.id)}
                    >
                      {isOpen ? 'Hide Scheduler ↑' : s.cta}
                    </button>
                  ) : (
                    <a
                      href={s.emailLink}
                      className={styles.ctaBtn}
                    >
                      {s.cta}
                    </a>
                  )}

                  {/* Calendly inline embed */}
                  {s.calendly && isOpen && (
                    <div className={styles.calendlyWrap}>
                      <iframe
                        src={`${calendlyBase}${prefill}`}
                        className={styles.calendlyFrame}
                        title={`Schedule ${s.title}`}
                        loading="lazy"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Cancellation policy ─────────────────────────────────── */}
      <div className={styles.policy}>
        <span className={styles.policyGlyph}>◈</span>
        <p className={styles.policyText}>
          24-hour cancellation policy — please reschedule at least 24 hours before your session
          to avoid a late-cancellation fee. Life happens; contact Warren directly if you need to
          make a same-day change.
        </p>
      </div>

    </div>
  );
}
