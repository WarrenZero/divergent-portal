'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import styles from './VocabularyManager.module.css';
import type { VocabTerm } from './page';

interface Props {
  terms: VocabTerm[];
  practitionerId: string;
}

export default function VocabularyManager({ terms: initialTerms, practitionerId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [terms, setTerms] = useState<VocabTerm[]>(initialTerms);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form state
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Edit form state (keyed by id)
  const [editForms, setEditForms] = useState<Record<string, { term: string; definition: string; phonetic: string }>>({});

  function openEdit(term: VocabTerm) {
    setEditingId(term.id);
    setEditForms((prev) => ({
      ...prev,
      [term.id]: {
        term: term.term,
        definition: term.definition,
        phonetic: term.phonetic_variants.join(', '),
      },
    }));
  }

  async function handleAdd() {
    if (!newTerm.trim() || !newDefinition.trim()) {
      setAddError('Term and definition are required.');
      return;
    }

    setAddError(null);
    startTransition(async () => {
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          term: newTerm.trim(),
          definition: newDefinition.trim(),
          phonetic_variants: newPhonetic
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });

      if (res.ok) {
        const { term } = await res.json();
        setTerms((prev) => [...prev, term as VocabTerm]);
        setNewTerm('');
        setNewDefinition('');
        setNewPhonetic('');
        setShowAddForm(false);
      }
    });
  }

  async function handleSaveEdit(id: string) {
    const form = editForms[id];
    if (!form) return;

    startTransition(async () => {
      const res = await fetch(`/api/vocabulary/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          term: form.term.trim(),
          definition: form.definition.trim(),
          phonetic_variants: form.phonetic
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });

      if (res.ok) {
        const { term } = await res.json();
        setTerms((prev) => prev.map((t) => (t.id === id ? (term as VocabTerm) : t)));
        setEditingId(null);
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/vocabulary/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTerms((prev) => prev.filter((t) => t.id !== id));
        if (editingId === id) setEditingId(null);
      }
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Custom Vocabulary</h1>
          <p className={styles.pageSubtitle}>
            Clinical terms and abbreviations included in every AI session processing call.
            Add phonetic variants to help with speech recognition accuracy.
          </p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowAddForm(true)}>
          + Add Term
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className={styles.addForm}>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Abbreviation / Term</label>
              <input
                className={styles.formInput}
                placeholder="e.g. HTMA"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Full Definition</label>
              <input
                className={styles.formInput}
                placeholder="e.g. Hair Tissue Mineral Analysis"
                value={newDefinition}
                onChange={(e) => setNewDefinition(e.target.value)}
              />
            </div>
            <div className={`${styles.formField} ${styles.formFieldFull}`}>
              <label className={styles.formLabel}>
                Phonetic Variants <span className={styles.formLabelOptional}>(comma-separated, optional)</span>
              </label>
              <input
                className={styles.formInput}
                placeholder="e.g. hymn a, h-t-m-a, htma"
                value={newPhonetic}
                onChange={(e) => setNewPhonetic(e.target.value)}
              />
            </div>
          </div>
          {addError && <div className={styles.formError}>{addError}</div>}
          <div className={styles.formActions}>
            <button className={styles.cancelBtn} onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button
              className={styles.saveBtn}
              onClick={handleAdd}
              disabled={isPending || !newTerm.trim() || !newDefinition.trim()}
            >
              {isPending ? 'Adding…' : 'Add Term'}
            </button>
          </div>
        </div>
      )}

      {/* Terms table */}
      <div className={styles.termsList}>
        {terms.length === 0 ? (
          <div className={styles.emptyState}>
            No vocabulary terms yet. Add your first term above.
          </div>
        ) : (
          terms.map((term) => (
            <div key={term.id} className={styles.termRow}>
              {editingId === term.id ? (
                /* Edit mode */
                <div className={styles.termEditForm}>
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Term</label>
                      <input
                        className={styles.formInput}
                        value={editForms[term.id]?.term ?? ''}
                        onChange={(e) =>
                          setEditForms((prev) => ({
                            ...prev,
                            [term.id]: { ...prev[term.id], term: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Definition</label>
                      <input
                        className={styles.formInput}
                        value={editForms[term.id]?.definition ?? ''}
                        onChange={(e) =>
                          setEditForms((prev) => ({
                            ...prev,
                            [term.id]: { ...prev[term.id], definition: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className={`${styles.formField} ${styles.formFieldFull}`}>
                      <label className={styles.formLabel}>Phonetic Variants (comma-separated)</label>
                      <input
                        className={styles.formInput}
                        value={editForms[term.id]?.phonetic ?? ''}
                        onChange={(e) =>
                          setEditForms((prev) => ({
                            ...prev,
                            [term.id]: { ...prev[term.id], phonetic: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className={styles.formActions}>
                    <button
                      className={styles.dangerBtn}
                      onClick={() => handleDelete(term.id)}
                      disabled={isPending}
                    >
                      Delete
                    </button>
                    <div className={styles.formActionsRight}>
                      <button className={styles.cancelBtn} onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                      <button
                        className={styles.saveBtn}
                        onClick={() => handleSaveEdit(term.id)}
                        disabled={isPending}
                      >
                        {isPending ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className={styles.termView}>
                  <div className={styles.termLeft}>
                    <span className={styles.termAbbrev}>{term.term}</span>
                    <span className={styles.termDef}>{term.definition}</span>
                    {term.phonetic_variants.length > 0 && (
                      <div className={styles.termPhonetic}>
                        {term.phonetic_variants.map((v) => (
                          <span key={v} className={styles.phoneticChip}>{v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className={styles.editBtn}
                    onClick={() => openEdit(term)}
                    aria-label={`Edit ${term.term}`}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <p className={styles.footNote}>
        These terms are injected into the AI&apos;s context before processing each session
        transcript, ensuring clinical abbreviations are never misidentified.
      </p>
    </div>
  );
}
