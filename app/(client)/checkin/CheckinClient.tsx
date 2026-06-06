'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import DailyPulseCard from '@/components/client/DailyPulseCard';
import MilestoneCard from '@/components/client/MilestoneCard';
import WeeklyInsightCard from '@/components/client/WeeklyInsightCard';
import ProgressCelebration from '@/components/client/ProgressCelebration';
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

export interface LatestInsight {
  id: string;
  text: string;
  generatedAt: string;
  isRead: boolean;
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
  weeklyFocus: string[] | null;
  voiceNoteUrl: string | null;
  latestInsight: LatestInsight | null;
  recentJournalCount: number;
  naqComplete: boolean;
  articlesRead: number;
  consecutiveDays: number;
}

// ─── Constants ────────────────────────────────────────────────

const SUPPLEMENT_WHY: Record<string, string> = {
  'Liquid Ionic Boron':             "Helps your nervous system send clearer signals — supports focus, mood, and digestion",
  'Boron Glycinate':                "A gentle form of boron that supports calm, clear thinking and steady digestion",
  'Boron Glycinate Encapsulations': "A gentle form of boron that supports calm, clear thinking and steady digestion",
  'Magnesium Malate':               "Helps your muscles relax and your energy feel more even throughout the day",
  'Magnesium':                      "Supports restful sleep, muscle ease, and a calmer nervous system",
};

function supplementWhy(name: string): string {
  return SUPPLEMENT_WHY[name] ?? 'Added by Warren specifically for your protocol';
}

type SectionKey = 'checkin' | 'quickactions' | 'nextsession' | 'supplements';
const SECTION_KEYS: SectionKey[] = ['checkin', 'quickactions', 'nextsession', 'supplements'];
const STORAGE_PREFIX = 'divergent-section-';
const POWER_VIEW_KEY = 'divergent-power-view';

function toTitleCase(s: string): string { return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }

function groupSupplementsByTime(supplements: SupplementRow[]): {
  morning: SupplementRow[];
  evening: SupplementRow[];
  other: SupplementRow[];
} {
  const morning: SupplementRow[] = [];
  const evening: SupplementRow[] = [];
  const other: SupplementRow[] = [];
  for (const s of supplements) {
    const t = (s.timing ?? '').toLowerCase();
    if (t.includes('breakfast') || t.includes('morning') || t.includes('am')) {
      morning.push(s);
    } else if (t.includes('dinner') || t.includes('evening') || t.includes('pm') || t.includes('night')) {
      evening.push(s);
    } else {
      other.push(s);
    }
  }
  return { morning, evening, other };
}

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
  weeklyFocus,
  voiceNoteUrl,
  latestInsight,
  recentJournalCount,
  naqComplete,
  articlesRead,
  consecutiveDays,
}: CheckinClientProps) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    checkin: false,
    quickactions: false,
    nextsession: false,
    supplements: false,
  });
  const [highlighted, setHighlighted] = useState(false);
  const [powerView, setPowerView] = useState(false);
  const checkinRef = useRef<HTMLDivElement>(null);

  // Trigger weekly insight generation if eligible (fire and forget)
  useEffect(() => {
    if (recentJournalCount >= 3) {
      fetch('/api/insights/weekly', { method: 'POST' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const pv = localStorage.getItem(POWER_VIEW_KEY);
    if (pv === 'true') {
      setPowerView(true);
      setOpen({ checkin: true, quickactions: true, nextsession: true, supplements: true });
    }
  }, []);

  function toggleSection(key: SectionKey) {
    if (powerView) return; // In power view, sections stay open
    setOpen(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(STORAGE_PREFIX + key, String(next[key])); } catch { /* ignore */ }
      return next;
    });
  }

  function togglePowerView() {
    const next = !powerView;
    setPowerView(next);
    try { localStorage.setItem(POWER_VIEW_KEY, String(next)); } catch { /* ignore */ }
    if (next) {
      const allOpen: Record<SectionKey, boolean> = { checkin: true, quickactions: true, nextsession: true, supplements: true };
      setOpen(allOpen);
      for (const key of SECTION_KEYS) {
        try { localStorage.setItem(STORAGE_PREFIX + key, 'true'); } catch { /* ignore */ }
      }
    }
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

      {/* ── Warren's Weekly Message ───────────────────────────── */}
      <div style={{
        background: 'var(--pine-900)',
        borderRadius: 12,
        padding: '16px 18px',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ color: 'var(--copper-300)', fontSize: 14 }}>✦</span>
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: 'var(--copper-500)',
          }}>
            From Warren This Week
          </span>
        </div>
        <p style={{
          fontFamily: "'Lora', Georgia, serif",
          fontStyle: 'italic',
          fontSize: 13,
          color: 'var(--pine-200)',
          margin: '0 0 6px',
          lineHeight: 1.5,
        }}>
          Warren&rsquo;s weekly message
        </p>
        {voiceNoteUrl ? (
          <audio controls style={{ width: '100%', borderRadius: 6 }} src={voiceNoteUrl}>
            Your browser does not support audio.
          </audio>
        ) : (
          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
            fontSize: 12,
            color: 'var(--pine-400)',
            margin: 0,
            lineHeight: 1.5,
          }}>
            Warren will record his first message this week
          </p>
        )}
      </div>

      {/* ── Accordion sections ─────────────────────────────────── */}
      <div className={styles.sections}>
        <div className={styles.powerViewRow}>
          <button
            type="button"
            className={`${styles.powerViewBtn} ${powerView ? styles.powerViewBtnActive : ''}`}
            onClick={togglePowerView}
            title={powerView ? 'Collapse all sections' : 'Expand all sections'}
            aria-label={powerView ? 'Collapse all sections' : 'Expand all sections'}
          >
            {powerView ? '⊟ Compact View' : '⊞ Expand All'}
          </button>
        </div>

        {/* Progress celebration (one per milestone, localStorage-gated) */}
        <ProgressCelebration
          wellnessScore={wellnessScore}
          naqComplete={naqComplete}
          recentJournalCount={recentJournalCount}
          consecutiveDays={consecutiveDays}
          articlesRead={articlesRead}
          hasInsight={latestInsight !== null}
          protocolDay={protocolDayNum}
        />

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

        {/* ── This Week's Focus ────────────────────────────────── */}
        {weeklyFocus && (
          <div style={{
            background: 'var(--pine-100)',
            border: '1px solid var(--pine-300)',
            borderRadius: 12,
            padding: '16px 18px',
            marginBottom: 12,
          }}>
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: 'var(--copper-500)',
              marginBottom: 12,
            }}>
              This week with Warren
            </div>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {weeklyFocus.map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--copper-500)', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, minWidth: 16 }}>
                    {i + 1}.
                  </span>
                  <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 13, color: 'var(--pine-800)', lineHeight: 1.55 }}>
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Weekly Insight Card ──────────────────────────────── */}
        {recentJournalCount >= 3 && latestInsight && (
          <WeeklyInsightCard
            insightId={latestInsight.id}
            insight={latestInsight.text}
            generatedAt={latestInsight.generatedAt}
            isRead={latestInsight.isRead}
          />
        )}

        {/* ── AI Pattern Note ──────────────────────────────────── */}
        <div className={styles.aiNudge}>
          <div className={styles.aiNudgeLabel}>✦ WHAT YOUR DATA IS SHOWING</div>
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
            <Link
              href="/sessions"
              className={`${styles.qaBtn} ${styles.qaBtnGhost}`}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <span className={styles.qaIcon}>◉</span>
              Book a Session →
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
              <div style={{ marginBottom: 14 }}>No upcoming sessions scheduled.</div>
              <Link
                href="/sessions"
                style={{
                  display: 'inline-block',
                  background: 'var(--copper-500)',
                  color: '#fff',
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  padding: '9px 18px',
                  borderRadius: 8,
                  textDecoration: 'none',
                }}
              >
                Book your next session →
              </Link>
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
            <>
              {(() => {
                const { morning, evening, other } = groupSupplementsByTime(supplements);
                return (
                  <div className={styles.suppSchedule}>
                    {morning.length > 0 && (
                      <div className={styles.suppTimeBlock}>
                        <div className={styles.suppTimeHeader}>
                          <span className={styles.suppTimeIcon}>☀️</span>
                          <span className={styles.suppTimeLabel}>Morning</span>
                          <span className={styles.suppTimeSub}>with breakfast</span>
                        </div>
                        <ul className={styles.suppTimeList}>
                          {morning.map((s) => (
                            <li key={s.id} className={styles.suppTimeItem}>• {s.name}{s.dose ? ` — ${s.dose}` : ''}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {evening.length > 0 && (
                      <div className={styles.suppTimeBlock}>
                        <div className={styles.suppTimeHeader}>
                          <span className={styles.suppTimeIcon}>🌙</span>
                          <span className={styles.suppTimeLabel}>Evening</span>
                          <span className={styles.suppTimeSub}>with dinner</span>
                        </div>
                        <ul className={styles.suppTimeList}>
                          {evening.map((s) => (
                            <li key={s.id} className={styles.suppTimeItem}>• {s.name}{s.dose ? ` — ${s.dose}` : ''}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {other.length > 0 && (
                      <div className={styles.suppTimeBlock}>
                        <div className={styles.suppTimeHeader}>
                          <span className={styles.suppTimeIcon}>◈</span>
                          <span className={styles.suppTimeLabel}>Other</span>
                        </div>
                        <ul className={styles.suppTimeList}>
                          {other.map((s) => (
                            <li key={s.id} className={styles.suppTimeItem}>• {s.name}{s.dose ? ` — ${s.dose}` : ''}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}
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
                      {s.timing && <div className={styles.suppTiming}>{toTitleCase(s.timing)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Accordion>

      </div>
    </div>
  );
}
