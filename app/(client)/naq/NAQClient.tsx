'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { NAQ_DOMAINS, SCALE_LABELS, type NAQDomainScore } from './data';
import { saveNAQDomain, completeNAQ, type DomainResponse } from './actions';
import styles from './NAQ.module.css';

// ─── Props ────────────────────────────────────────────────────

interface Props {
  firstName: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function burdenColor(burden: number): string {
  if (burden <= 25) return 'var(--pine-500)';
  if (burden <= 55) return '#D08C5C'; // copper-400
  return '#C45C40';                   // warm red
}

function burdenLabel(burden: number): string {
  if (burden <= 25) return 'Low';
  if (burden <= 55) return 'Moderate';
  if (burden <= 75) return 'Elevated';
  return 'High';
}

function wellnessOffset(score: number): number {
  // SVG r=45 → circumference ≈ 283
  return 283 * (1 - Math.max(0, Math.min(100, score)) / 100);
}

// ─── Component ────────────────────────────────────────────────

export default function NAQClient({ firstName }: Props) {
  const [domainIdx, setDomainIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [branchJustRevealed, setBranchJustRevealed] = useState(false);
  const [didRevealBranches, setDidRevealBranches] = useState(false);
  const [showRequired, setShowRequired] = useState(false);

  const [phase, setPhase] = useState<'assessment' | 'complete'>('assessment');
  const [domainScores, setDomainScores] = useState<NAQDomainScore[]>([]);
  const [wellnessScore, setWellnessScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const domain = NAQ_DOMAINS[domainIdx];
  const isLastDomain = domainIdx === NAQ_DOMAINS.length - 1;

  // ── Branch visibility — derived, never stored as state ────────
  // Storing branchVisible as state caused a render-window bug:
  // when domainIdx advanced, isPending went false before the
  // [domainIdx] cleanup effect could reset branchVisible, so the
  // new domain briefly showed all branches with allAnswered=false.
  const branchVisible =
    domain.branches.length > 0 &&
    domain.screening.some((q) => (responses[q.id] ?? -1) >= domain.branchThreshold);

  // ── Animate the reveal notice once per domain ─────────────────
  useEffect(() => {
    if (branchVisible && !didRevealBranches) {
      setDidRevealBranches(true);
      setBranchJustRevealed(true);
      const timer = setTimeout(() => setBranchJustRevealed(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [branchVisible, didRevealBranches]);

  // ── Reset per-domain transient state when domain advances ─────
  useEffect(() => {
    setDidRevealBranches(false);
    setBranchJustRevealed(false);
    setShowRequired(false);
  }, [domainIdx]);

  // ── Visible questions for current domain ─────────────────────
  const visibleQuestions = [
    ...domain.screening,
    ...(branchVisible ? domain.branches : []),
  ];

  // ── All visible questions answered? ─────────────────────────
  const allAnswered = visibleQuestions.every((q) => responses[q.id] !== undefined);

  // ── Handlers ─────────────────────────────────────────────────
  function setResponse(questionId: string, value: number) {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
    setShowRequired(false);
  }

  function handleContinue() {
    if (!allAnswered) {
      setShowRequired(true);
      return;
    }

    setError(null);

    const domainResponses: DomainResponse[] = visibleQuestions.map((q) => ({
      questionId: q.id,
      value: responses[q.id] ?? 0,
      isBranch: q.isBranch,
    }));

    startTransition(async () => {
      try {
        const saveResult = await saveNAQDomain(domain.name, domainResponses);
        if (saveResult.error) {
          setError(saveResult.error);
          return;
        }

        if (isLastDomain) {
          const result = await completeNAQ(responses);
          if (result.error) {
            setError(result.error);
            return;
          }
          setWellnessScore(result.wellnessScore);
          setDomainScores(result.domainScores);
          setPhase('complete');
        } else {
          setDomainIdx((i) => i + 1);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
      }
    });
  }

  // ── Completion screen ────────────────────────────────────────
  if (phase === 'complete') {
    const dashOffset = wellnessOffset(wellnessScore);
    return (
      <div className={styles.completionPage}>
        <div className={styles.completionHero}>
          <div className={styles.completionGlyph}>✦ Assessment Complete</div>

          <div className={styles.completionScoreRing}>
            <svg
              className={styles.completionRingSvg}
              viewBox="0 0 100 100"
              aria-label={`Wellness score: ${wellnessScore} out of 100`}
            >
              <circle className={styles.completionRingTrack} cx="50" cy="50" r="45" />
              <circle
                className={styles.completionRingFill}
                cx="50"
                cy="50"
                r="45"
                transform="rotate(-90 50 50)"
                style={{ strokeDashoffset: dashOffset }}
              />
              <text className={styles.completionScoreNum} x="50" y="47">
                {wellnessScore}
              </text>
              <text className={styles.completionScoreSub} x="50" y="62">
                / 100
              </text>
            </svg>
            <div className={styles.completionScoreLabel}>Wellness Score</div>
          </div>

          <h1 className={styles.completionTitle}>
            Well done, {firstName} ✦
          </h1>
          <p className={styles.completionSub}>
            Your practitioner can now see a full picture of your foundational health across
            all 10 systems. These findings will shape every protocol decision.
          </p>
        </div>

        <div className={styles.domainGrid}>
          {domainScores.map((ds) => (
            <div key={ds.domainId} className={styles.domainScoreCard}>
              <div className={styles.domainScoreHeader}>
                <span className={styles.domainScoreGlyph}>{ds.glyph}</span>
                <span className={styles.domainScoreName}>{ds.name}</span>
              </div>
              <div className={styles.domainBurdenBar}>
                <div
                  className={styles.domainBurdenFill}
                  style={{
                    width: `${ds.burden}%`,
                    background: burdenColor(ds.burden),
                  }}
                />
              </div>
              <div className={styles.domainBurdenMeta}>
                <span className={styles.domainBurdenPct}>{ds.burden}% burden</span>
                <span
                  className={styles.domainBurdenLabel}
                  style={{ color: burdenColor(ds.burden) }}
                >
                  {burdenLabel(ds.burden)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.completionActions}>
          <Link href="/checkin" className={`${styles.ctaBtn} ${styles.ctaBtnPrimary}`}>
            Return to Dashboard
          </Link>
          <Link href="/journal" className={`${styles.ctaBtn} ${styles.ctaBtnGhost}`}>
            Log a Meal
          </Link>
        </div>

        <p className={styles.disclaimer}>
          These results reflect self-reported symptom patterns and are intended to support
          foundational nutritional assessment. They are not a medical diagnosis and have not
          been evaluated by the FDA.
        </p>
      </div>
    );
  }

  // ── Assessment screen ────────────────────────────────────────
  const progressPct = (domainIdx / NAQ_DOMAINS.length) * 100;

  return (
    <div className={styles.page}>
      {/* ── Progress header ─────────────────────────────────── */}
      <div className={styles.progressHeader}>
        <div className={styles.progressMeta}>
          <div className={styles.progressTitle}>Nutritional Assessment</div>
          <div className={styles.progressFraction}>
            {domainIdx + 1} of {NAQ_DOMAINS.length}
          </div>
        </div>

        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className={styles.domainPills}>
          {NAQ_DOMAINS.map((d, i) => {
            const cls =
              i < domainIdx
                ? styles.domainPillDone
                : i === domainIdx
                ? styles.domainPillActive
                : styles.domainPillPending;
            return (
              <div key={d.id} className={`${styles.domainPill} ${cls}`}>
                {i < domainIdx ? '✓ ' : ''}{d.name}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className={styles.main}>
        {/* Domain hero */}
        <div className={styles.domainHero}>
          <div className={styles.domainGlyphRow}>
            <span className={styles.domainGlyph}>{domain.glyph}</span>
            <div>
              <div className={styles.domainNameLabel}>Foundation Domain {domainIdx + 1}</div>
              <h1 className={styles.domainName}>{domain.name}</h1>
            </div>
          </div>
          <p className={styles.domainTagline}>{domain.tagline}</p>
        </div>

        {/* Branch reveal notice */}
        {branchJustRevealed && domain.branches.length > 0 && (
          <div className={styles.branchReveal}>
            <span className={styles.branchRevealIcon}>✦</span>
            <span className={styles.branchRevealText}>
              Your responses triggered {domain.branches.length} additional{' '}
              {domain.branches.length === 1 ? 'question' : 'questions'} for deeper insight.
            </span>
          </div>
        )}

        {/* Questions */}
        {visibleQuestions.map((q, i) => (
          <div
            key={q.id}
            className={`${styles.questionCard} ${q.isBranch ? styles.questionCardBranch : ''}`}
          >
            <div className={styles.questionMeta}>
              <span className={styles.questionNum}>
                {q.isBranch ? 'Branch' : 'Screening'} Q{i + 1 - (q.isBranch ? domain.screening.length : 0)}
              </span>
              {q.branchTag && (
                <span className={styles.branchTag}>⟁ {q.branchTag}</span>
              )}
            </div>

            <p className={styles.questionText}>{q.text}</p>

            <div className={styles.scaleRow} role="group" aria-label={`Response scale for: ${q.text}`}>
              {([0, 1, 2, 3, 4] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`${styles.scaleBtn} ${responses[q.id] === val ? styles.scaleBtnSelected : ''}`}
                  onClick={() => setResponse(q.id, val)}
                  aria-pressed={responses[q.id] === val}
                  aria-label={`${SCALE_LABELS[val]} (${val})`}
                  disabled={isPending}
                >
                  <span className={styles.scaleBtnNum}>{val}</span>
                  <span className={styles.scaleBtnLabel}>{SCALE_LABELS[val]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {error && <div className={styles.requiredNote}>{error}</div>}
      </div>

      {/* ── Fixed footer ─────────────────────────────────────── */}
      <div className={styles.foot}>
        {showRequired && !allAnswered && (
          <div className={styles.requiredNote}>
            Please answer all questions before continuing
          </div>
        )}
        <button
          className={styles.continueBtn}
          onClick={handleContinue}
          disabled={isPending}
        >
          {isPending
            ? 'Saving…'
            : isLastDomain
            ? 'Complete Assessment ✦'
            : `Continue — ${NAQ_DOMAINS[domainIdx + 1]?.name} →`}
        </button>
      </div>
    </div>
  );
}
