'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addSupplement } from './actions';
import styles from './ClientProfile.module.css';
import modalStyles from './ProtocolModal.module.css';
import suppStyles from './SupplementModal.module.css';

// ─── Types ────────────────────────────────────────────────────

interface SupplementRow {
  id: string;
  name: string;
  dose: string | null;
  timing: string | null;
}

interface Props {
  clientId: string;
  initialSupplements: SupplementRow[];
}

const TIMING_OPTIONS = [
  'Morning fasted',
  'With breakfast',
  'With lunch',
  'With dinner',
  'Bedtime',
  'As needed',
];

const EMPTY_FORM = {
  name: '',
  brand: '',
  dose: '',
  timing: '',
  notes: '',
};

// ─── Component ────────────────────────────────────────────────

export default function SupplementPanel({ clientId, initialSupplements }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const supplements = initialSupplements;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleClose() {
    setOpen(false);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addSupplement(clientId, form);
      if (result.error) {
        setError(result.error);
      } else {
        handleClose();
        router.refresh();
      }
    });
  }

  return (
    <>
      {/* ── Supplements card ──────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>
            Supplements{supplements.length > 0 ? ` · ${supplements.length}` : ''}
          </span>
          <button
            className={styles.btnGhost}
            style={{ padding: '4px 10px', fontSize: 10 }}
            onClick={() => setOpen(true)}
          >
            + Add
          </button>
        </div>

        {supplements.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyGlyph}>💊</div>
            <div className={styles.emptyTitle}>No supplements assigned</div>
            <p className={styles.emptyText}>
              Add supplements to build this client&rsquo;s personalised protocol.
            </p>
          </div>
        ) : (
          <div className={`${styles.cardPad} ${styles.suppList}`}>
            {supplements.map((s) => (
              <div key={s.id} className={styles.suppRow}>
                <div style={{ flex: 1 }}>
                  <div className={styles.suppName}>{s.name}</div>
                  {s.dose && <div className={styles.suppDose}>{s.dose}</div>}
                </div>
                {s.timing && (
                  <span className={styles.suppTiming}>{s.timing}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ─────────────────────────────────────────── */}
      {open && (
        <div className={modalStyles.overlay} onClick={handleClose}>
          <div
            className={modalStyles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Add Supplement"
          >
            <div className={modalStyles.header}>
              <span className={modalStyles.title}>Add Supplement</span>
              <button
                className={modalStyles.close}
                onClick={handleClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={suppStyles.body}>
                <div className={suppStyles.fieldGroup}>
                  <label className={suppStyles.label} htmlFor="supp-name">
                    Supplement name <span className={suppStyles.required}>*</span>
                  </label>
                  <input
                    id="supp-name"
                    name="name"
                    type="text"
                    className={suppStyles.input}
                    placeholder="e.g. Magnesium Glycinate"
                    value={form.name}
                    onChange={handleChange}
                    required
                    disabled={isPending}
                    autoFocus
                  />
                </div>

                <div className={suppStyles.fieldGroup}>
                  <label className={suppStyles.label} htmlFor="supp-brand">
                    Brand <span className={suppStyles.optional}>(optional)</span>
                  </label>
                  <input
                    id="supp-brand"
                    name="brand"
                    type="text"
                    className={suppStyles.input}
                    placeholder="e.g. Thorne, Pure Encapsulations"
                    value={form.brand}
                    onChange={handleChange}
                    disabled={isPending}
                  />
                </div>

                <div className={suppStyles.row}>
                  <div className={suppStyles.fieldGroup}>
                    <label className={suppStyles.label} htmlFor="supp-dose">
                      Dose
                    </label>
                    <input
                      id="supp-dose"
                      name="dose"
                      type="text"
                      className={suppStyles.input}
                      placeholder="e.g. 400mg"
                      value={form.dose}
                      onChange={handleChange}
                      disabled={isPending}
                    />
                  </div>

                  <div className={suppStyles.fieldGroup}>
                    <label className={suppStyles.label} htmlFor="supp-timing">
                      Timing
                    </label>
                    <select
                      id="supp-timing"
                      name="timing"
                      className={suppStyles.select}
                      value={form.timing}
                      onChange={handleChange}
                      disabled={isPending}
                    >
                      <option value="">— Select —</option>
                      {TIMING_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={suppStyles.fieldGroup}>
                  <label className={suppStyles.label} htmlFor="supp-notes">
                    Notes <span className={suppStyles.optional}>(optional)</span>
                  </label>
                  <textarea
                    id="supp-notes"
                    name="notes"
                    className={suppStyles.textarea}
                    placeholder="Take with food, avoid calcium within 2h…"
                    rows={3}
                    value={form.notes}
                    onChange={handleChange}
                    disabled={isPending}
                  />
                </div>

                {error && <div className={modalStyles.error}>{error}</div>}
              </div>

              <div className={modalStyles.footer}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPine}
                  disabled={isPending || !form.name.trim()}
                >
                  {isPending ? 'Saving…' : 'Add Supplement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
