'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import DailyPulseCard from '@/components/client/DailyPulseCard';
import MilestoneCard from '@/components/client/MilestoneCard';
import styles from './Checkin.module.css';

// ─── Types ────────────────────────────────────────────────────

export interface SupplementRow {
  id: string;
  name: string;
  dose: string | null;
  timing: string | null;
  brand: string | null;
}

export interface SessionRow {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  session_type: string;
  status: string;
}

export interface ProtocolInfo {
  name: string;
  phase: number;
  startDate: string;
}

export interface CheckinClientProps {
  firstName: string;
  wellnessScore: number;
  dashOffset: number;
  protocol: ProtocolInfo | null;
  protocolDay: string | null;
  protocolDayNum: number | null;
  phaseText: string | null;
  supplements: SupplementRow[];
  nextSession: SessionRow | null;
  aiNote: string;
}

// ─── Constants ────────────────────────────────────────────────

const SUPPLEMENT_WHY: Record<string, string> = {
  'Liquid Ionic Boron':             "Supports your nervous system's electrical balance",
  'Boron Glycinate':                "A gentle form of boron for deeper cellular support",
  'Boron Glycinate Encapsulations': "A gentle form of boron for deeper cellular support",
  'Magnesium Malate':               "Helps your muscles relax and your energy stabilize",
  'Magnesium':                      "Helps your muscles relax and your energy stabilize",
};

function supplementWhy(name: string): string {
  return SUPPLEMENT_WHY[name] ?? 'Added by Warren for your protocol';
}

type SectionKey = 'checkin' | 'quickactions' | 'nextsession' | 'supplements';
const SECTION_KEYS: SectionKey[] = ['checkin', 'quickactions', 'nextsession', 'supplements'];
const STORAGE_PREFIX = 'divergent-section-';

function formatSessionShort(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} · ${timePart}`;
}

function formatSessionFull(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Accordion sub-component ──────────────────────────────────

interface AccordionProps {
  title: string;
  badge?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  accordionRef?: React.RefObject<HTMLDivElement>;
  isHighlighted?: boolean;
}

function Accordion({
  title,
  badge,
  isOpen,
  onToggle,
  children,
  accordionRef,
  isHighlighted,
}: AccordionProps) {
  return (
    <div
      ref={accordionRef}
      className={`${styles.accordion} ${isHighlighted ? styles.accordionHighlight : ''}`}
    >
      <button
        className={`${styles.accordionHeader} ${isOpen ? styles.accordionHeaderOpen : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        type="button"
      >
        <div className={styles.accordionTitleRow}>
          <span className={styles.accordionTitle}>{title}</span>
          {badge && <span className={styles.accordionBadge}>{badge}</span>}
        </div>
        <span className={`${styles.accordionChevron} ${isOpen ? styles.accordionChevronOpen : ''}`}>
          ▼
        </span>
      </button>

      <div className={`${styles.accordionContent} ${isOpen ? styles.accordionContentOpen : ''}`}>
        <div className={styles.accordionInner}>
          <div className={styles.accordionPad}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function CheckinClient({
  firstName,
  wellnessScore,
  dashOffset,
  protocol,
  protocolDay,
  protocolDayNum,
  phaseText,
  supplements,
  nextSession,
  aiNote,
}: CheckinClientProps) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    checkin: false,
    quickactions: false,
    nextsession: false,
    supplements: false,
  });
  const [highlighted, setHighlighted] = useState(false);
  const checkinRef = useRef<HTMLDivElement>(null);

  // Restore section state from localStorage on mount
  useEffect(() => {
    const restored: Partial<Record<SectionKey, boolean>> = {};
    for (const key of SECTION_KEYS) {
      const val = localStorage.getItem(STORAGE_PREFIX + key);
      if (val !== null) restored[key] = val === 'true';
    }
    if (Object.keys(restored).length > 0) {
      setOpen(prev => ({ ...prev, ...restored }));
    }
  }, []);

  function toggleSection(key: SectionKey) {
    setOpen(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(STORAGE_PREFIX + key, String(next[key])); } catch { /* ignore */ }
      return next;
    });
  }

  function handleCheckinButton() {
    // Open the section
    setOpen(prev => {
      const next = { ...prev, checkin: true };
      try { localStorage.setItem(STORAGE_PREFIX + 'checkin', 'true'); } catch { /* ignore */ }
      return next;
    });
    // Scroll + highlight after state propagates
    setTimeout(() => {
      checkinRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setHighlighted(true);
      setTimeout(() => setHighlighted(false), 1600);
    }, 80);
  }

  const dayNum = protocolDayNum;

  return (
    <div className={styles.page}>

      {/* ── Featured Hero Card ─────────────────────────────────── */}
      <div className={styles.heroCard}>
        <div className={styles.heroCardInner}>

          {/* Day counter */}
          <div className={styles.heroDayBlock}>
            {dayNum !== null ? (
              <>
                <div className={styles.heroDayNum}>{dayNum}</div>
                <div className={styles.heroDayLabel}>DAYS</div>
              </>
            ) : (
              <div className={styles.heroDayGlyph}>✦</div>
            )}
          </div>

          {/* Text content */}
          <div className={styles.heroCardContent}>
            <div className={styles.heroWelcome}>Welcome back, {firstName}</div>
            <div className={styles.heroPhase}>
              {phaseText ?? 'Your journey starts today'} ✦
            </div>
            <p className={styles.heroNote}>{aiNote}</p>
            <button
              className={styles.heroCheckinBtn}
              onClick={handleCheckinButton}
              type="button"
            >
              Daily Check-In →
            </button>
          </div>

          {/* Wellness score ring */}
          <div className={styles.heroRing}>
            <svg
              className={styles.scoreSvg}
              viewBox="0 0 100 100"
              aria-label={`Wellness score: ${wellnessScore} out of 100`}
            >
              <circle className={styles.scoreTrack} cx="50" cy="50" r="45" />
              <circle
                className={styles.scoreFill}
                cx="50"
                cy="50"
                r="45"
                transform="rotate(-90 50 50)"
                style={{ strokeDashoffset: dashOffset }}
              />
              <text className={styles.scoreText} x="50" y="46">{wellnessScore}</text>
              <text className={styles.scoreSub} x="50" y="60">/ 100</text>
            </svg>
            <div className={styles.scoreLabel}>Wellness Score</div>
          </div>

        </div>
      </div>

      {/* ── Accordion sections ─────────────────────────────────── */}
      <div className={styles.sections}>

        {/* Milestone celebration (milestone days only) */}
        {protocolDayNum !== null && (
          <MilestoneCard day={protocolDayNum} wellnessScore={wellnessScore} />
        )}

        {/* ── How Are You Feeling? ─────────────────────────────── */}
        <Accordion
          title="How Are You Feeling?"
          isOpen={open.checkin}
          onToggle={() => toggleSection('checkin')}
          accordionRef={checkinRef}
          isHighlighted={highlighted}
        >
          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '13px',
            color: 'var(--pine-400)',
            margin: '0 0 16px',
            lineHeight: 1.55,
          }}>
            {protocol
              ? `${firstName}, each check-in adds a data point I use to adjust your protocol — even the small shifts matter.`
              : `Your first step, ${firstName}. A quick daily check-in tells me more than any lab ever could about how you're feeling day to day.`}
          </p>
          <DailyPulseCard firstName={firstName} />
        </Accordion>

        {/* ── Journal shortcut ─────────────────────────────────── */}
        <Link href="/journal" className={styles.journalCard}>
          <div className={styles.journalCardGlyph}>⚘</div>
          <div className={styles.journalCardBody}>
            <div className={styles.journalCardTitle}>Food + Mood Journal</div>
            <div className={styles.journalCardSub}>
              Log today&rsquo;s meals, mood, and symptoms — reviewed before every session
            </div>
          </div>
          <div className={styles.journalCardArrow}>→</div>
        </Link>

        {/* ── AI Pattern Note ──────────────────────────────────── */}
        <div className={styles.aiNudge}>
          <div className={styles.aiNudgeLabel}>✦ A NOTE FROM YOUR DATA</div>
          <p className={styles.aiNudgeText}>{aiNote}</p>
        </div>

        {/* ── Quick Actions ─────────────────────────────────────── */}
        <Accordion
          title="Quick Actions"
          isOpen={open.quickactions}
          onToggle={() => toggleSection('quickactions')}
        >
          <div className={styles.qaList}>
            <Link
              href="/protocol"
              className={`${styles.qaBtn} ${styles.qaBtnGhost}`}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <span className={styles.qaIcon}>◈</span>
              View My Plan →
            </Link>
            <Link
              href="/meals"
              className={`${styles.qaBtn} ${styles.qaBtnGhost}`}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <span className={styles.qaIcon}>✿</span>
              Browse Recipes →
            </Link>
            <Link
              href="/vault"
              className={`${styles.qaBtn} ${styles.qaBtnGhost}`}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <span className={styles.qaIcon}>🗝</span>
              My Library →
            </Link>
            <a
              href="mailto:warren@divergentportal.com"
              className={`${styles.qaBtn} ${styles.qaBtnGhost}`}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <span className={styles.qaIcon}>💬</span>
              Message Warren →
            </a>
          </div>
        </Accordion>

        {/* ── Next Session ──────────────────────────────────────── */}
        <Accordion
          title="Next Session"
          badge={nextSession ? formatSessionShort(nextSession.scheduled_at) : 'No upcoming sessions'}
          isOpen={open.nextsession}
          onToggle={() => toggleSection('nextsession')}
        >
          {nextSession ? (
            <div className={styles.sessionBlock}>
              <div className={styles.sessionDate}>
                {formatSessionFull(nextSession.scheduled_at)}
              </div>
              <div className={styles.sessionType}>
                {nextSession.session_type === 'telehealth'
                  ? 'Telehealth Session'
                  : nextSession.session_type}
              </div>
              <div className={styles.sessionDuration}>
                {nextSession.duration_minutes} min
              </div>
              <a href="#" className={styles.joinBtn}>
                Join Session →
              </a>
            </div>
          ) : (
            <div className={styles.sessionEmpty}>
              No upcoming sessions scheduled. Book one via your practitioner.
            </div>
          )}
        </Accordion>

        {/* ── Active Supplements ────────────────────────────────── */}
        <Accordion
          title="Active Supplements"
          badge={
            supplements.length > 0
              ? `${supplements.length} supplement${supplements.length !== 1 ? 's' : ''}`
              : undefined
          }
          isOpen={open.supplements}
          onToggle={() => toggleSection('supplements')}
        >
          {supplements.length === 0 ? (
            <div className={styles.suppEmpty}>
              Your supplement protocol will appear here once your practitioner assigns it.
            </div>
          ) : (
            <div className={styles.suppList}>
              {supplements.map((s) => (
                <div key={s.id} className={styles.suppItem}>
                  <div>
                    <div className={styles.suppName}>{s.name}</div>
                    <div style={{
                      fontFamily: "'Lora', Georgia, serif",
                      fontStyle: 'italic',
                      fontSize: '11px',
                      color: 'var(--pine-400)',
                      marginTop: '2px',
                      lineHeight: 1.4,
                    }}>
                      {supplementWhy(s.name)}
                    </div>
                    {s.brand && <div className={styles.suppDose}>{s.brand}</div>}
                    {s.dose && <div className={styles.suppDose}>{s.dose}</div>}
                    {s.timing && <div className={styles.suppTiming}>{s.timing}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Accordion>

      </div>
    </div>
  );
}
