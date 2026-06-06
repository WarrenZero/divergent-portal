'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assignProtocol, autoAddProtocolSupplements, advanceClientPhase } from './actions';
import styles from './ClientProfile.module.css';
import modalStyles from './ProtocolModal.module.css';

const SUPPLEMENT_PRESETS: Record<string, string[]> = {
  'ENS Signal-to-Noise Protocol': [
    'Liquid Ionic Boron · 3mg · WITH BREAKFAST',
    'Magnesium Malate · 400mg · WITH BREAKFAST',
    'Boron Glycinate · 3mg · WITH DINNER',
  ],
  'ENS Restoration Protocol': [
    'Liquid Ionic Boron · 2mg · WITH BREAKFAST',
    'Magnesium Malate · 200mg · WITH BREAKFAST',
  ],
};

// ─── Types ────────────────────────────────────────────────────

interface Protocol {
  id: string;
  name: string;
  category: string | null;
  phase_count: number;
}

interface ProtocolAssignment {
  current_phase: number;
  start_date: string | null;
  protocols: { name: string } | null;
}

interface Props {
  clientId: string;
  initialProtocol: ProtocolAssignment | null;
  protocols: Protocol[];
  days: number;
}

// ─── Helpers ──────────────────────────────────────────────────

function protocolDays(startDate: string | null): number {
  if (!startDate) return 0;
  return Math.max(1, Math.floor(
    (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
  ) + 1);
}

function getMilestoneDay(protocolName: string, currentPhase: number): number | null {
  const n = protocolName.toLowerCase();
  if (n.includes('signal-to-noise')) {
    const days: Record<number, number> = { 1: 30, 2: 60, 3: 90 };
    return days[currentPhase] ?? null;
  }
  if (n.includes('restoration')) {
    const days: Record<number, number> = { 1: 28, 2: 56 };
    return days[currentPhase] ?? null;
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────

export default function ProtocolPanel({ clientId, initialProtocol, protocols, days }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [supplementConfirm, setSupplementConfirm] = useState<{ protocolName: string; supplements: string[] } | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [advanceDone, setAdvanceDone] = useState(false);
  const router = useRouter();

  const protocol = initialProtocol;
  const activeDays = protocol ? protocolDays(protocol.start_date) : days;
  const protocolName = protocol?.protocols?.name ?? '';
  const currentPhase = protocol?.current_phase ?? 1;
  const milestoneDay = protocol ? getMilestoneDay(protocolName, currentPhase) : null;

  function handleAssign() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await assignProtocol(clientId, selected);
      if (result.error) {
        setError(result.error);
      } else {
        const selectedProtocol = protocols.find((p) => p.id === selected);
        const protocolName = selectedProtocol?.name ?? '';
        const knownSupps = SUPPLEMENT_PRESETS[protocolName];
        if (knownSupps && knownSupps.length > 0) {
          setSupplementConfirm({ protocolName, supplements: knownSupps });
        } else {
          setOpen(false);
          setSelected(null);
          router.refresh();
        }
      }
    });
  }

  async function handleYesSupplements() {
    if (!supplementConfirm) return;
    startTransition(async () => {
      await autoAddProtocolSupplements(clientId, supplementConfirm.protocolName);
      setSupplementConfirm(null);
      setOpen(false);
      setSelected(null);
      router.refresh();
    });
  }

  function handleSkipSupplements() {
    setSupplementConfirm(null);
    setOpen(false);
    setSelected(null);
    router.refresh();
  }

  return (
    <>
      {/* ── Protocol card ─────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Protocol</span>
          {protocol && (
            <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>
          )}
        </div>
        <div className={styles.cardPad}>
          {protocol ? (
            <div className={styles.protocolBlock}>
              <div className={styles.protocolBadge}>
                <span className={styles.protocolDot} />
                Phase {protocol.current_phase}
              </div>
              <div className={styles.protocolName}>{protocol.protocols?.name}</div>
              {protocol.start_date && (
                <div className={styles.protocolMeta}>
                  Started{' '}
                  {new Date(protocol.start_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                  })}
                  {' · '}Day {activeDays}
                </div>
              )}
              <button
                className={styles.btnGhost}
                style={{ marginTop: 8, fontSize: 10 }}
                onClick={() => setOpen(true)}
              >
                Change Protocol
              </button>
            </div>
          ) : null}

          {/* ── Phase advancement prompt ─────────────────────── */}
          {protocol && !advanceDone && milestoneDay !== null && activeDays >= milestoneDay && activeDays < milestoneDay + 7 && (
            <div className={styles.advancePrompt}>
              <div className={styles.advancePromptTitle}>
                ✦ Day {milestoneDay} milestone reached
              </div>
              <p className={styles.advancePromptText}>
                Ready to advance {protocolName} to Phase {currentPhase + 1}?
              </p>
              {advanceError && (
                <div className={styles.advanceError}>{advanceError}</div>
              )}
              <div className={styles.advanceActions}>
                <button
                  className={styles.advanceBtn}
                  disabled={advancing || isPending}
                  onClick={async () => {
                    setAdvancing(true);
                    setAdvanceError(null);
                    const result = await advanceClientPhase(clientId);
                    if (result.error) {
                      setAdvanceError(result.error);
                    } else {
                      setAdvanceDone(true);
                      router.refresh();
                    }
                    setAdvancing(false);
                  }}
                >
                  {advancing ? 'Advancing…' : `Advance to Phase ${currentPhase + 1}`}
                </button>
                <button
                  className={styles.advanceSkipBtn}
                  onClick={() => setAdvanceDone(true)}
                >
                  Keep in Phase {currentPhase}
                </button>
              </div>
            </div>
          )}

          {!protocol && (
            <div className={styles.emptyState} style={{ padding: '20px 0' }}>
              <div className={styles.emptyGlyph}>⊞</div>
              <div className={styles.emptyTitle}>No protocol assigned</div>
              <p className={styles.emptyText}>
                Assign a protocol from the Protocol Library to begin tracking this
                client&rsquo;s progress.
              </p>
              <button className={styles.btnPine} onClick={() => setOpen(true)}>
                Assign Protocol
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────── */}
      {open && (
        <div className={modalStyles.overlay} onClick={() => setOpen(false)}>
          <div
            className={modalStyles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Assign Protocol"
          >
            <div className={modalStyles.header}>
              <span className={modalStyles.title}>Assign Protocol</span>
              <button
                className={modalStyles.close}
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className={modalStyles.body}>
              {protocols.length === 0 ? (
                <div className={modalStyles.empty}>
                  No protocols in the library yet. Add templates from the Protocol Library.
                </div>
              ) : (
                <div className={modalStyles.list}>
                  {protocols.map((p) => (
                    <button
                      key={p.id}
                      className={`${modalStyles.protocolRow} ${selected === p.id ? modalStyles.protocolRowSelected : ''}`}
                      onClick={() => setSelected(p.id)}
                    >
                      <div className={modalStyles.protocolRowName}>{p.name}</div>
                      <div className={modalStyles.protocolRowMeta}>
                        {[
                          p.category,
                          `${p.phase_count} phase${p.phase_count !== 1 ? 's' : ''}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                      {selected === p.id && (
                        <span className={modalStyles.checkmark}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {error && <div className={modalStyles.error}>{error}</div>}
            </div>

            {supplementConfirm ? (
              <div className={modalStyles.footer} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--pine-900)' }}>
                  Add standard supplements for this protocol?
                </div>
                <ul style={{ fontSize: 12, fontFamily: "'Lora', Georgia, serif", color: 'var(--bone-800)', margin: '0 0 4px', paddingLeft: 18 }}>
                  {supplementConfirm.supplements.map((s) => <li key={s}>{s}</li>)}
                </ul>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className={styles.btnPine} onClick={handleYesSupplements} disabled={isPending}>
                    {isPending ? 'Adding…' : 'Yes, Add All'}
                  </button>
                  <button className={styles.btnGhost} onClick={handleSkipSupplements} disabled={isPending}>
                    Skip
                  </button>
                </div>
              </div>
            ) : (
              <div className={modalStyles.footer}>
                <button
                  className={styles.btnGhost}
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  className={styles.btnPine}
                  onClick={handleAssign}
                  disabled={!selected || isPending}
                >
                  {isPending ? 'Assigning…' : 'Assign Protocol'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
