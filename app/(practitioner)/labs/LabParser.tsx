'use client';

import { useState, useRef, useCallback } from 'react';
import styles from './LabParser.module.css';
import type { ClientOption } from './page';
import type { ParsedMarker, FunctionalFlag } from '@/app/api/labs/parse/route';

// ─── Types ────────────────────────────────────────────────────

interface ParseResult {
  markers: ParsedMarker[];
  flags: FunctionalFlag[];
  labId: string | null;
}

type MarkerStatus = 'optimal' | 'suboptimal' | 'out_of_range' | 'not_assessed';

interface DisplayMarker {
  test_name: string;
  value: string;
  unit: string;
  standard_range: string;
  functional_range: string;
  functional_low: number | null;
  functional_high: number | null;
  status: MarkerStatus;
  direction: 'low' | 'high' | null;
  note: string;
}

interface Props {
  clients: ClientOption[];
}

// ─── Helpers ──────────────────────────────────────────────────

function buildFunctionalRangeStr(low: number | null, high: number | null): string {
  if (low != null && high != null) return `${low}–${high}`;
  if (high != null) return `<${high}`;
  if (low != null) return `>${low}`;
  return '—';
}

function buildStandardRangeStr(marker: ParsedMarker): string {
  if (marker.reference_range) return marker.reference_range;
  const lo = marker.standard_low;
  const hi = marker.standard_high;
  if (lo != null && hi != null) return `${lo}–${hi}`;
  if (hi != null) return `<${hi}`;
  if (lo != null) return `>${lo}`;
  return '—';
}

function mergeMarkersWithFlags(
  markers: ParsedMarker[],
  flags: FunctionalFlag[],
): DisplayMarker[] {
  const flagMap = new Map<string, FunctionalFlag>();
  for (const flag of flags) {
    flagMap.set(flag.test_name.toLowerCase().trim(), flag);
  }

  return markers.map((marker) => {
    const key = marker.test_name.toLowerCase().trim();
    const flag = flagMap.get(key);

    return {
      test_name: marker.test_name,
      value: String(marker.value),
      unit: marker.unit,
      standard_range: buildStandardRangeStr(marker),
      functional_range: flag
        ? buildFunctionalRangeStr(flag.functional_low, flag.functional_high)
        : '—',
      functional_low: flag?.functional_low ?? null,
      functional_high: flag?.functional_high ?? null,
      status: flag ? flag.status : 'not_assessed',
      direction: flag?.direction ?? null,
      note: flag?.note ?? '',
    };
  });
}

function buildCopilotText(result: ParseResult, clientName: string): string {
  const date = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const flagged = result.flags.filter((f) => f.status !== 'optimal');
  const optimal = result.flags.filter((f) => f.status === 'optimal');

  const lines: string[] = [
    `LAB ANALYSIS${clientName ? ` — ${clientName}` : ''} — ${date}`,
    '',
    'FLAGGED MARKERS (outside functional range):',
    '',
  ];

  if (flagged.length === 0) {
    lines.push('No markers flagged — all assessed values within functional range.');
    lines.push('');
  } else {
    for (const f of flagged) {
      const funcRange = buildFunctionalRangeStr(f.functional_low, f.functional_high);
      const stdRange = buildFunctionalRangeStr(f.standard_low, f.standard_high);
      const severity = f.status === 'out_of_range' ? 'OUT OF RANGE' : 'SUBOPTIMAL';
      const dir = f.direction ? ` (${f.direction.toUpperCase()})` : '';
      lines.push(`⚠ ${f.test_name}: ${f.value} ${f.unit} — ${severity}${dir}`);
      lines.push(`  Functional: ${funcRange} | Standard: ${stdRange}`);
      lines.push(`  ${f.note}`);
      lines.push('');
    }
  }

  if (optimal.length > 0) {
    lines.push('WITHIN FUNCTIONAL RANGE:');
    for (const f of optimal) {
      lines.push(`• ${f.test_name}: ${f.value} ${f.unit} ✓`);
    }
    lines.push('');
  }

  lines.push(
    'Please analyze these results through the lens of HTMA and metabolic typing. What patterns do you see? Which flagged markers relate to adrenal/thyroid burden, and what nutritional interventions may support recalibration?',
  );

  return lines.join('\n');
}

function statusBadgeInfo(
  status: MarkerStatus,
  direction: 'low' | 'high' | null,
): { label: string; className: string } {
  switch (status) {
    case 'optimal':
      return { label: '✓ Optimal', className: styles.badgeOptimal };
    case 'suboptimal':
      return {
        label: direction === 'low' ? '⚠ Low' : direction === 'high' ? '⚠ High' : '⚠ Suboptimal',
        className: styles.badgeSuboptimal,
      };
    case 'out_of_range':
      return {
        label: direction === 'low' ? '⚠ Low' : direction === 'high' ? '⚠ High' : '⚠ Out of Range',
        className: styles.badgeDanger,
      };
    default:
      return { label: '—', className: styles.badgeNone };
  }
}

// ─── Component ────────────────────────────────────────────────

export default function LabParser({ clients }: Props) {
  const [clientId, setClientId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Drag-and-drop handlers ───────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      setFile(dropped);
      setError(null);
    } else {
      setError('Please upload a PDF file.');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) { setFile(selected); setError(null); }
  };

  // ── Parse ────────────────────────────────────────────────────

  async function handleParse() {
    if (!file) return;
    setIsLoading(true);
    setError(null);

    try {
      // Convert PDF to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.byteLength; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const pdfBase64 = btoa(binary);

      const res = await fetch('/api/labs/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          clientId: clientId || null,
          fileName: file.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Parsing failed. Please try again.');
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    setError(null);
    setCopied(false);
  }

  async function handleCopyForCopilot() {
    if (!result) return;
    const client = clients.find((c) => c.id === clientId);
    const clientName = client ? `${client.first_name} ${client.last_name}` : '';
    const text = buildCopilotText(result, clientName);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // ── Derived state ────────────────────────────────────────────

  const displayMarkers = result ? mergeMarkersWithFlags(result.markers, result.flags) : [];
  const flaggedDisplay = displayMarkers.filter(
    (m) => m.status === 'suboptimal' || m.status === 'out_of_range',
  );
  const totalMarkers = result?.markers.length ?? 0;
  const analyzedCount = result?.flags.length ?? 0;
  const flaggedCount = result?.flags.filter((f) => f.status !== 'optimal').length ?? 0;

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageGlyph}>✦</div>
        <div>
          <h1 className={styles.pageTitle}>Lab Parser</h1>
          <p className={styles.pageSubtitle}>
            Upload a client&apos;s lab PDF. Claude extracts every marker and compares
            against functional reference ranges.
          </p>
        </div>
      </div>

      {!result ? (

        /* ════ UPLOAD FORM ════════════════════════════════════════ */

        <div className={styles.uploadCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>New Lab Analysis</span>
          </div>
          <div className={styles.cardBody}>

            {/* Client selector */}
            <div className={styles.field}>
              <label className={styles.label}>Client</label>
              <select
                className={styles.select}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">— No client selected —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.last_name}, {c.first_name}
                  </option>
                ))}
              </select>
              <div className={styles.fieldHint}>
                Selecting a client saves the results to their record.
              </div>
            </div>

            {/* PDF drop zone */}
            <div className={styles.field}>
              <label className={styles.label}>Lab Report PDF</label>
              <div
                className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''} ${file ? styles.dropZoneHasFile : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                aria-label={file ? `Selected: ${file.name}. Click to change.` : 'Drop PDF here or click to browse'}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {file ? (
                  <>
                    <div className={styles.dropZoneIconWrap}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="9" y1="13" x2="15" y2="13" />
                        <line x1="9" y1="17" x2="13" y2="17" />
                      </svg>
                    </div>
                    <div className={styles.dropZoneFileName}>{file.name}</div>
                    <div className={styles.dropZoneHint}>Click to change file</div>
                  </>
                ) : (
                  <>
                    <div className={styles.dropZoneIconWrap}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 16 12 12 8 16" />
                        <line x1="12" y1="12" x2="12" y2="21" />
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                      </svg>
                    </div>
                    <div className={styles.dropZoneText}>
                      Drag &amp; drop a PDF lab report here
                    </div>
                    <div className={styles.dropZoneHint}>or click to browse your files</div>
                  </>
                )}
              </div>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <button
              className={`${styles.parseBtn} ${isLoading ? styles.parseBtnLoading : ''}`}
              onClick={handleParse}
              disabled={!file || isLoading}
            >
              {isLoading ? (
                <span className={styles.parseBtnInner}>
                  <span className={styles.parseBtnGlyph}>✦</span>
                  Analyzing with Claude…
                </span>
              ) : (
                <span className={styles.parseBtnInner}>
                  <span className={styles.parseBtnGlyph}>✦</span>
                  Parse Lab Report
                </span>
              )}
            </button>

            {isLoading && (
              <div className={styles.loadingNote}>
                Claude is reading the PDF and extracting lab values. This takes about 15–30 seconds.
              </div>
            )}
          </div>
        </div>

      ) : (

        /* ════ RESULTS ════════════════════════════════════════════ */

        <div className={styles.results}>

          {/* Summary banner */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryStats}>
              <div className={styles.statBlock}>
                <span className={styles.statNumber}>{totalMarkers}</span>
                <span className={styles.statLabel}>markers extracted</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statBlock}>
                <span className={styles.statNumber}>{analyzedCount}</span>
                <span className={styles.statLabel}>assessed</span>
              </div>
              <div className={styles.statDivider} />
              <div className={`${styles.statBlock} ${flaggedCount > 0 ? styles.statBlockFlagged : ''}`}>
                <span className={styles.statNumber}>{flaggedCount}</span>
                <span className={styles.statLabel}>{flaggedCount === 1 ? 'flag' : 'flags'}</span>
              </div>
            </div>
            <div className={styles.summaryActions}>
              <button
                className={`${styles.copyForCopilotBtn} ${copied ? styles.copyForCopilotBtnCopied : ''}`}
                onClick={handleCopyForCopilot}
              >
                {copied ? '✓ Copied to clipboard' : '⌥ Copy for Co-Pilot'}
              </button>
              <button className={styles.parseAnotherBtn} onClick={handleReset}>
                ← Parse Another
              </button>
            </div>
          </div>

          {/* Flagged markers grid */}
          {flaggedDisplay.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Flagged Markers</span>
                <span className={styles.sectionCount}>{flaggedDisplay.length}</span>
              </div>
              <div className={styles.flagGrid}>
                {flaggedDisplay.map((m) => {
                  const badge = statusBadgeInfo(m.status, m.direction);
                  const isDanger = m.status === 'out_of_range';
                  return (
                    <div
                      key={m.test_name}
                      className={`${styles.flagCard} ${isDanger ? styles.flagCardDanger : styles.flagCardWarn}`}
                    >
                      <div className={styles.flagCardTop}>
                        <span className={styles.flagCardName}>{m.test_name}</span>
                        <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>
                      </div>
                      <div className={styles.flagCardValue}>
                        {m.value}
                        <span className={styles.flagCardUnit}> {m.unit}</span>
                      </div>
                      <div className={styles.flagCardRanges}>
                        <span>Functional: <strong>{m.functional_range}</strong></span>
                        <span>Standard: {m.standard_range}</span>
                      </div>
                      {m.note && (
                        <div className={styles.flagCardNote}>{m.note}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {flaggedDisplay.length === 0 && analyzedCount > 0 && (
            <div className={styles.allOptimalBanner}>
              <span className={styles.allOptimalGlyph}>✦</span>
              All assessed markers are within functional ranges.
            </div>
          )}

          {/* Full marker table */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>All Markers</span>
              <span className={styles.sectionCount}>{displayMarkers.length}</span>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Test</th>
                    <th className={styles.th}>Value</th>
                    <th className={`${styles.th} ${styles.thUnit}`}>Unit</th>
                    <th className={styles.th}>Standard Range</th>
                    <th className={styles.th}>Functional Range</th>
                    <th className={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayMarkers.map((m, i) => {
                    const badge = statusBadgeInfo(m.status, m.direction);
                    return (
                      <tr
                        key={`${m.test_name}-${i}`}
                        className={`${styles.tr} ${
                          m.status === 'out_of_range'
                            ? styles.trDanger
                            : m.status === 'suboptimal'
                            ? styles.trWarn
                            : m.status === 'optimal'
                            ? styles.trOptimal
                            : ''
                        }`}
                        title={m.note || undefined}
                      >
                        <td className={`${styles.td} ${styles.tdName}`}>
                          {(m.status === 'suboptimal' || m.status === 'out_of_range') && (
                            <span className={styles.warnIcon} aria-label="Flagged">⚠</span>
                          )}
                          {m.test_name}
                        </td>
                        <td className={`${styles.td} ${styles.tdValue}`}>{m.value}</td>
                        <td className={`${styles.td} ${styles.tdUnit}`}>{m.unit}</td>
                        <td className={styles.td}>{m.standard_range}</td>
                        <td className={`${styles.td} ${m.functional_range !== '—' ? styles.tdFunctional : ''}`}>
                          {m.functional_range}
                        </td>
                        <td className={styles.td}>
                          <span className={`${styles.badge} ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendOptimal}`} />
              <span>Optimal — within functional range</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendSuboptimal}`} />
              <span>Suboptimal — within standard range, outside functional</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendDanger}`} />
              <span>Out of range — outside standard laboratory range</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendNone}`} />
              <span>Not assessed — not in functional range database</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
