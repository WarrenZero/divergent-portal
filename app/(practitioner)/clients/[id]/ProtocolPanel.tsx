'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assignProtocol } from './actions';
import styles from './ClientProfile.module.css';
import modalStyles from './ProtocolModal.module.css';

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

// ─── Component ────────────────────────────────────────────────

export default function ProtocolPanel({ clientId, initialProtocol, protocols, days }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const protocol = initialProtocol;
  const activeDays = protocol ? protocolDays(protocol.start_date) : days;

  function handleAssign() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await assignProtocol(clientId, selected);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        setSelected(null);
        router.refresh();
      }
    });
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
          ) : (
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
          </div>
        </div>
      )}
    </>
  );
}
