'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AssessmentSession } from './page';
import type { NAQDomain, NAQDomainScore } from '@/app/(client)/naq/data';
import styles from './SymptomMap.module.css';

// ─── SVG radar constants ──────────────────────────────────────
const CX = 220;
const CY = 220;
const MAX_R = 160;
const VIEWBOX = 440;

function polarToXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
  };
}

function domainAngle(index: number) {
  // Start from -90 (top), go clockwise
  return -90 + index * 36;
}

function polygonPoints(values: number[], scale = 1): string {
  return values
    .map((v, i) => {
      const { x, y } = polarToXY(domainAngle(i), v * scale);
      return `${x},${y}`;
    })
    .join(' ');
}

// Zone ring at a given radius
function ringPoints(r: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const { x, y } = polarToXY(domainAngle(i), r);
    return `${x},${y}`;
  }).join(' ');
}

// ─── Radar sub-component ──────────────────────────────────────

interface RadarProps {
  scores: NAQDomainScore[];
  domains: NAQDomain[];
  onSelectDomain: (id: string) => void;
  activeDomain: string | null;
  compareScores?: NAQDomainScore[];
}

function RadarChart({ scores, domains, onSelectDomain, activeDomain, compareScores }: RadarProps) {
  // Map domain id -> burden (0–100). Radius = (burden/100) * MAX_R
  const burdenMap = Object.fromEntries(scores.map((s) => [s.domainId, s.burden]));
  const compareMap = compareScores
    ? Object.fromEntries(compareScores.map((s) => [s.domainId, s.burden]))
    : null;

  const radii = domains.map((d) => ((burdenMap[d.id] ?? 0) / 100) * MAX_R);
  const compareRadii = compareMap
    ? domains.map((d) => ((compareMap[d.id] ?? 0) / 100) * MAX_R)
    : null;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      className={styles.radar}
      role="img"
      aria-label="Symptom burden radar chart"
    >
      {/* Zone rings */}
      <polygon points={ringPoints(MAX_R)} className={styles.zoneRed} />
      <polygon points={ringPoints(MAX_R * 0.55)} className={styles.zoneCopper} />
      <polygon points={ringPoints(MAX_R * 0.25)} className={styles.zoneGreen} />

      {/* Grid spokes */}
      {domains.map((d, i) => {
        const outer = polarToXY(domainAngle(i), MAX_R);
        return (
          <line
            key={d.id}
            x1={CX}
            y1={CY}
            x2={outer.x}
            y2={outer.y}
            className={styles.spoke}
          />
        );
      })}

      {/* Ring grid lines at 25%, 55%, 100% */}
      {[0.25, 0.55, 1].map((pct) => (
        <polygon
          key={pct}
          points={ringPoints(MAX_R * pct)}
          className={styles.gridRing}
        />
      ))}

      {/* Compare polygon (baseline ghost) */}
      {compareRadii && (
        <polygon
          points={polygonPoints(compareRadii)}
          className={styles.comparePolygon}
        />
      )}

      {/* Current burden polygon */}
      <polygon
        points={polygonPoints(radii)}
        className={styles.burdenPolygon}
      />

      {/* Domain hit areas + labels */}
      {domains.map((d, i) => {
        const angle = domainAngle(i);
        const labelR = MAX_R + 28;
        const { x, y } = polarToXY(angle, labelR);
        const isActive = activeDomain === d.id;
        const burden = burdenMap[d.id] ?? 0;
        const dotR = polarToXY(angle, ((burden / 100) * MAX_R));

        // Text anchor depends on x position relative to center
        const anchor = x < CX - 10 ? 'end' : x > CX + 10 ? 'start' : 'middle';

        return (
          <g
            key={d.id}
            className={`${styles.domainGroup} ${isActive ? styles.domainGroupActive : ''}`}
            onClick={() => onSelectDomain(d.id)}
            role="button"
            tabIndex={0}
            aria-label={`${d.name}: ${burden}% burden`}
            onKeyDown={(e) => e.key === 'Enter' && onSelectDomain(d.id)}
          >
            {/* Invisible spoke hit zone */}
            <line
              x1={CX}
              y1={CY}
              x2={polarToXY(angle, MAX_R + 10).x}
              y2={polarToXY(angle, MAX_R + 10).y}
              strokeWidth="28"
              stroke="transparent"
            />

            {/* Domain dot on polygon */}
            <circle
              cx={dotR.x}
              cy={dotR.y}
              r={isActive ? 7 : 5}
              className={isActive ? styles.domainDotActive : styles.domainDot}
            />

            {/* Label */}
            <text
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className={isActive ? styles.domainLabelActive : styles.domainLabel}
            >
              {d.name}
            </text>
          </g>
        );
      })}

      {/* Center wellness score */}
      <circle cx={CX} cy={CY} r={22} className={styles.centerCircle} />
    </svg>
  );
}

// ─── Domain detail panel ──────────────────────────────────────

interface DomainDetailProps {
  domain: NAQDomain;
  current: NAQDomainScore;
  compare: NAQDomainScore | null;
  onClose: () => void;
}

const SCALE_LABELS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'];

function DomainDetail({ domain, current, compare, onClose }: DomainDetailProps) {
  const delta = compare ? current.burden - compare.burden : null;

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <div>
          <div className={styles.detailGlyph}>{domain.glyph}</div>
          <h3 className={styles.detailTitle}>{domain.name}</h3>
          <p className={styles.detailTagline}>{domain.tagline}</p>
        </div>
        <button className={styles.detailClose} onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div className={styles.detailScoreRow}>
        <div className={styles.detailScoreBlock}>
          <div className={styles.detailScoreLabel}>Burden</div>
          <div
            className={styles.detailScoreValue}
            style={{
              color: current.burden >= 55 ? '#B04848' : current.burden >= 25 ? 'var(--copper-500)' : 'var(--pine-400)',
            }}
          >
            {current.burden}%
          </div>
        </div>
        {delta !== null && (
          <div className={styles.detailScoreBlock}>
            <div className={styles.detailScoreLabel}>vs Baseline</div>
            <div
              className={styles.detailScoreValue}
              style={{ color: delta > 0 ? '#B04848' : delta < 0 ? 'var(--pine-400)' : 'var(--text-3)' }}
            >
              {delta > 0 ? '+' : ''}{delta}%
            </div>
          </div>
        )}
      </div>

      <div className={styles.detailQuestions}>
        <div className={styles.detailSectionLabel}>Screening Questions</div>
        {domain.screening.map((q) => (
          <div key={q.id} className={styles.detailQuestion}>
            <span className={styles.detailQText}>{q.text}</span>
          </div>
        ))}

        {domain.branches.length > 0 && (
          <>
            <div className={styles.detailSectionLabel} style={{ marginTop: 16 }}>Branch Questions</div>
            {domain.branches.map((q) => (
              <div key={q.id} className={styles.detailQuestion}>
                <span className={styles.detailQText}>{q.text}</span>
                {q.branchTag && (
                  <span className={styles.branchTag}>{q.branchTag}</span>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

interface Props {
  clientId: string;
  clientName: string;
  primaryConcern: string | null;
  sessions: AssessmentSession[];
  domains: NAQDomain[];
}

export default function SymptomMap({
  clientId,
  clientName,
  primaryConcern,
  sessions,
  domains,
}: Props) {
  const [view, setView] = useState<'radar' | 'trend'>('radar');
  const [sessionIndex, setSessionIndex] = useState(sessions.length > 0 ? sessions.length - 1 : 0);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  const hasData = sessions.length > 0;
  const currentSession = hasData ? sessions[sessionIndex] : null;
  const baselineSession = hasData ? sessions[0] : null;
  const showCompare = hasData && sessions.length > 1 && sessionIndex > 0;

  const currentScores = currentSession?.domainScores ?? [];
  const baselineScores = baselineSession?.domainScores ?? [];

  const activeDomainData = activeDomain ? domains.find((d) => d.id === activeDomain) : null;
  const activeCurrent = activeDomain ? currentScores.find((s) => s.domainId === activeDomain) : null;
  const activeBaseline = activeDomain && showCompare ? baselineScores.find((s) => s.domainId === activeDomain) : null;

  function handleSelectDomain(id: string) {
    setActiveDomain((prev) => (prev === id ? null : id));
  }

  // Sort domains by burden descending for trend list
  const sortedByBurden = [...currentScores].sort((a, b) => b.burden - a.burden);

  return (
    <div className={styles.page}>
      {/* ── Breadcrumb ─── */}
      <div className={styles.breadcrumb}>
        <Link href="/symptom-maps" className={styles.breadcrumbLink}>Symptom Maps</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <Link href={`/clients/${clientId}`} className={styles.breadcrumbLink}>{clientName}</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span>Symptom Map</span>
      </div>

      {/* ── Page header ─── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{clientName}</h1>
          {primaryConcern && (
            <p className={styles.subtitle}>{primaryConcern}</p>
          )}
        </div>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleBtn} ${view === 'radar' ? styles.toggleActive : ''}`}
            onClick={() => setView('radar')}
          >
            ◎ Radar
          </button>
          <button
            className={`${styles.toggleBtn} ${view === 'trend' ? styles.toggleActive : ''}`}
            onClick={() => setView('trend')}
          >
            ↑ Trend
          </button>
        </div>
      </header>

      {!hasData ? (
        <div className={styles.empty}>
          <span className={styles.emptyGlyph}>◎</span>
          <p>No NAQ responses yet. Ask the client to complete the Nutritional Assessment Questionnaire.</p>
          <Link href={`/clients/${clientId}`} className={styles.emptyLink}>← Back to client profile</Link>
        </div>
      ) : (
        <>
          {/* ── Session selector ─── */}
          {sessions.length > 1 && (
            <div className={styles.sessionRow}>
              {sessions.map((s, i) => (
                <button
                  key={i}
                  className={`${styles.sessionBtn} ${i === sessionIndex ? styles.sessionBtnActive : ''}`}
                  onClick={() => { setSessionIndex(i); setActiveDomain(null); }}
                >
                  {s.label}
                  <span className={styles.sessionDate}>{s.date}</span>
                </button>
              ))}
            </div>
          )}

          {view === 'radar' ? (
            <div className={styles.radarLayout}>
              {/* Radar */}
              <div className={styles.radarWrap}>
                <RadarChart
                  scores={currentScores}
                  domains={domains}
                  onSelectDomain={handleSelectDomain}
                  activeDomain={activeDomain}
                  compareScores={showCompare ? baselineScores : undefined}
                />

                {/* Wellness score badge */}
                <div className={styles.wellnessBadge}>
                  <div
                    className={styles.wellnessScore}
                    style={{
                      color: (currentSession?.wellnessScore ?? 0) >= 70
                        ? 'var(--pine-400)'
                        : (currentSession?.wellnessScore ?? 0) >= 40
                        ? 'var(--copper-500)'
                        : '#B04848',
                    }}
                  >
                    {currentSession?.wellnessScore ?? 0}
                  </div>
                  <div className={styles.wellnessLabel}>Wellness</div>
                  <div className={styles.wellnessDate}>{currentSession?.date}</div>
                </div>

                {/* Legend */}
                <div className={styles.legend}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: 'var(--pine-400)' }} />
                    Optimal (0–25%)
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: 'var(--copper-500)' }} />
                    Moderate (25–55%)
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: '#B04848' }} />
                    High burden (55%+)
                  </div>
                  {showCompare && (
                    <div className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: 'var(--pine-200)', opacity: 0.6 }} />
                      Baseline
                    </div>
                  )}
                </div>
              </div>

              {/* Domain detail sidebar */}
              <div className={styles.detailWrap}>
                {activeDomainData && activeCurrent ? (
                  <DomainDetail
                    domain={activeDomainData}
                    current={activeCurrent}
                    compare={activeBaseline ?? null}
                    onClose={() => setActiveDomain(null)}
                  />
                ) : (
                  <div className={styles.detailPrompt}>
                    <span className={styles.detailPromptGlyph}>◎</span>
                    <p>Click a domain on the radar to view question details and trend data.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── Trend view ─── */
            <div className={styles.trendLayout}>
              <div className={styles.trendHeader}>
                <div className={styles.trendCol} />
                {sessions.map((s, i) => (
                  <div key={i} className={`${styles.trendColHeader} ${i === sessionIndex ? styles.trendColActive : ''}`}>
                    <div className={styles.trendSessionLabel}>{s.label}</div>
                    <div className={styles.trendSessionDate}>{s.date}</div>
                    <div
                      className={styles.trendWellness}
                      style={{
                        color: s.wellnessScore >= 70 ? 'var(--pine-400)' : s.wellnessScore >= 40 ? 'var(--copper-500)' : '#B04848',
                      }}
                    >
                      {s.wellnessScore}
                    </div>
                  </div>
                ))}
                {sessions.length > 1 && (
                  <div className={styles.trendColHeader}>
                    <div className={styles.trendSessionLabel}>Change</div>
                    <div className={styles.trendSessionDate}>(baseline → latest)</div>
                  </div>
                )}
              </div>

              {sortedByBurden.map((score) => {
                const domain = domains.find((d) => d.id === score.domainId);
                if (!domain) return null;

                const baseline = baselineScores.find((s) => s.domainId === score.domainId);
                const latest = sessions[sessions.length - 1].domainScores.find((s) => s.domainId === score.domainId);
                const delta = baseline && latest ? latest.burden - baseline.burden : null;

                return (
                  <div
                    key={score.domainId}
                    className={`${styles.trendRow} ${activeDomain === score.domainId ? styles.trendRowActive : ''}`}
                    onClick={() => setActiveDomain((p) => p === score.domainId ? null : score.domainId)}
                  >
                    <div className={styles.trendDomainCell}>
                      <span className={styles.trendGlyph}>{domain.glyph}</span>
                      <span className={styles.trendDomainName}>{domain.name}</span>
                    </div>

                    {sessions.map((s, i) => {
                      const ds = s.domainScores.find((x) => x.domainId === score.domainId);
                      const b = ds?.burden ?? 0;
                      return (
                        <div key={i} className={`${styles.trendCell} ${i === sessionIndex ? styles.trendCellActive : ''}`}>
                          <div className={styles.trendBar}>
                            <div
                              className={styles.trendBarFill}
                              style={{
                                width: `${b}%`,
                                background: b >= 55 ? '#B04848' : b >= 25 ? 'var(--copper-500)' : 'var(--pine-400)',
                              }}
                            />
                          </div>
                          <span className={styles.trendBurden}>{b}%</span>
                        </div>
                      );
                    })}

                    {sessions.length > 1 && delta !== null && (
                      <div className={styles.trendCell}>
                        <span
                          className={styles.trendDelta}
                          style={{
                            color: delta > 0 ? '#B04848' : delta < 0 ? 'var(--pine-400)' : 'var(--text-3)',
                          }}
                        >
                          {delta > 0 ? '↑' : delta < 0 ? '↓' : '—'} {Math.abs(delta)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
