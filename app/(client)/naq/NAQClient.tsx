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

  const [phase, setPhase] = useState<'intro' | 'assessment' | 'complete'>('intro');
  const [domainScores, setDomainScores] = useState<NAQDomainScore[]>([]);
  const [wellnessScore, setWellnessScore] = useState(0);
  const [showDetailedScores, setShowDetailedScores] = useState(false);
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
    const unanswered = visibleQuestions.filter((q) => responses[q.id] === undefined);

    // ── Debug logging ────────────────────────────────────────
    console.group('[NAQ] Continue clicked');
    console.log('Domain index:', domainIdx, '—', domain.name);
    console.log('Branch visible:', branchVisible, '| Visible questions:', visibleQuestions.length);
    console.log('All answered:', unanswered.length === 0);
    if (unanswered.length > 0) {
      console.warn('Unanswered question IDs:', unanswered.map((q) => q.id));
      console.table(unanswered.map((q) => ({ id: q.id, branch: q.isBranch, text: q.text.slice(0, 60) })));
    }
    console.log('Current responses snapshot:', { ...responses });
    console.groupEnd();
    // ────────────────────────────────────────────────────────

    if (!allAnswered) {
      setShowRequired(true);
      // Scroll to first unanswered question so user can see it
      const firstUnansweredId = unanswered[0]?.id;
      if (firstUnansweredId) {
        setTimeout(() => {
          document.getElementById(`naq-q-${firstUnansweredId}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
      }
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
        console.log('[NAQ] saveNAQDomain result:', saveResult);
        if (saveResult.error) {
          setError(saveResult.error);
          return;
        }

        if (isLastDomain) {
          const result = await completeNAQ(responses);
          console.log('[NAQ] completeNAQ result:', result);
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
        console.error('[NAQ] Unexpected error in handleContinue:', err);
        setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
      }
    });
  }

  // ── Intro screen ─────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className={styles.page}>
        <div className={styles.main} style={{ maxWidth: 560, margin: '0 auto', paddingTop: 48 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pine-400)', marginBottom: 12 }}>
              ✦ Health Assessment
            </div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800, color: 'var(--text-1)', margin: '0 0 8px', lineHeight: 1.15 }}>
              Your Health Assessment
            </h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--pine-100)', color: 'var(--pine-600)', fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: 20, marginTop: 4 }}>
              ⏱ 10 min
            </span>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px 28px 24px', marginBottom: 20 }}>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '15px', color: 'var(--text-1)', lineHeight: 1.7, margin: '0 0 16px' }}>
              This 10-minute assessment helps Warren see exactly where your body needs support. He reviews every answer before building your personal plan.
            </p>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '15px', color: 'var(--text-1)', lineHeight: 1.7, margin: 0 }}>
              There are no right or wrong answers — just answer honestly based on how you&rsquo;ve been feeling over the last 30 days.
            </p>
          </div>

          <div style={{ background: 'var(--pine-100)', border: '1px solid var(--pine-200)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 32, fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: '13px', color: 'var(--pine-600)', lineHeight: 1.5 }}>
            You can pause and return anytime — your answers are saved as you go.
          </div>

          <button
            className={styles.continueBtn}
            onClick={() => setPhase('assessment')}
          >
            Begin Assessment →
          </button>
        </div>
      </div>
    );
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

        <button
          type="button"
          onClick={() => setShowDetailedScores((prev) => !prev)}
          style={{
            background: 'none',
            border: '1px solid var(--pine-400)',
            borderRadius: 6,
            padding: '4px 10px',
            fontFamily: "'Syne', sans-serif",
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--pine-500)',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            marginBottom: 12,
            display: 'block',
            margin: '0 auto 16px',
          }}
        >
          {showDetailedScores ? 'Hide details' : 'Show detailed scores'}
        </button>

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
              {showDetailedScores && (
                <div style={{
                  fontSize: 10,
                  fontFamily: "'Syne', sans-serif",
                  color: 'var(--text-3)',
                  letterSpacing: '0.04em',
                  marginTop: 4,
                }}>
                  Score: {Math.round(ds.burden)}% burden
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            const lines = [
              `NAQ Assessment Results — ${firstName}`,
              `Wellness Score: ${wellnessScore}/100`,
              '',
              'Domain Burden:',
              ...domainScores.map((d) => `  ${d.name}: ${Math.round(d.burden)}% burden — ${burdenLabel(d.burden)}`),
              '',
              'Generated by Divergent Nutritional Therapy Portal',
            ];
            const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `NAQ-results-${firstName}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          style={{
            background: 'none',
            border: '1px solid var(--bone-400)',
            borderRadius: 6,
            padding: '6px 14px',
            fontFamily: "'Syne', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--bone-600)',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            marginTop: 12,
            display: 'block',
            margin: '12px auto 0',
          }}
        >
          ↓ Download my results
        </button>

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

        {/* Answered progress within domain */}
        {visibleQuestions.length > 2 && (
          <div className={styles.domainProgress}>
            <span className={styles.domainProgressText}>
              {visibleQuestions.filter((q) => responses[q.id] !== undefined).length}
              {' / '}
              {visibleQuestions.length} answered
            </span>
            <div className={styles.domainProgressTrack}>
              <div
                className={styles.domainProgressFill}
                style={{
                  width: `${(visibleQuestions.filter((q) => responses[q.id] !== undefined).length / visibleQuestions.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Questions */}
        {visibleQuestions.map((q, i) => (
          <div
            key={q.id}
            id={`naq-q-${q.id}`}
            className={[
              styles.questionCard,
              q.isBranch ? styles.questionCardBranch : '',
              showRequired && responses[q.id] === undefined ? styles.questionCardUnanswered : '',
            ].join(' ').trim()}
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
            {visibleQuestions.filter((q) => responses[q.id] === undefined).length} question
            {visibleQuestions.filter((q) => responses[q.id] === undefined).length !== 1 ? 's' : ''}{' '}
            still need{visibleQuestions.filter((q) => responses[q.id] === undefined).length === 1 ? 's' : ''}{' '}
            an answer — scrolling up to show{visibleQuestions.filter((q) => responses[q.id] === undefined).length !== 1 ? ' them' : ' it'}
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
