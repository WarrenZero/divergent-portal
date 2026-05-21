'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addManualNote, editNote, deleteNote } from './notes.actions';
import styles from './NotesPanel.module.css';

// ─── Types ────────────────────────────────────────────────────

export interface NoteRow {
  id: string;
  note_type: 'copilot_summary' | 'manual';
  content: string;
  created_at: string;
}

interface DateGroup {
  label: string;
  notes: NoteRow[];
}

// ─── Helpers ──────────────────────────────────────────────────

function groupByDate(notes: NoteRow[]): DateGroup[] {
  const map = new Map<string, NoteRow[]>();
  for (const note of notes) {
    const key = new Date(note.created_at).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(note);
  }
  return Array.from(map.entries()).map(([label, notes]) => ({ label, notes }));
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// ─── Component ────────────────────────────────────────────────

interface Props {
  clientId: string;
  initialNotes: NoteRow[];
}

export default function NotesPanel({ clientId, initialNotes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Add modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addText, setAddText] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Inline delete confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const groups = groupByDate(initialNotes);

  // ── Add note ──────────────────────────────────────────────

  function openAdd() { setAddText(''); setAddError(null); setAddOpen(true); }
  function closeAdd() { setAddOpen(false); setAddText(''); setAddError(null); }

  function handleAdd() {
    if (!addText.trim()) return;
    startTransition(async () => {
      const result = await addManualNote(clientId, addText);
      if (result.error) { setAddError(result.error); return; }
      closeAdd();
      router.refresh();
    });
  }

  // ── Edit note ─────────────────────────────────────────────

  function startEdit(note: NoteRow) {
    setDeletingId(null);
    setEditingId(note.id);
    setEditText(note.content);
    setEditError(null);
  }

  function cancelEdit() { setEditingId(null); setEditText(''); setEditError(null); }

  function handleEdit(noteId: string) {
    if (!editText.trim()) return;
    startTransition(async () => {
      const result = await editNote(noteId, clientId, editText);
      if (result.error) { setEditError(result.error); return; }
      cancelEdit();
      router.refresh();
    });
  }

  // ── Delete note ───────────────────────────────────────────

  function startDelete(noteId: string) {
    setEditingId(null);
    setDeletingId(noteId);
  }

  function cancelDelete() { setDeletingId(null); }

  function handleDelete(noteId: string) {
    startTransition(async () => {
      await deleteNote(noteId, clientId);
      setDeletingId(null);
      router.refresh();
    });
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>My Notes</span>
          <button className={styles.addBtn} onClick={openAdd}>+ Add Note</button>
        </div>

        {groups.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyGlyph}>✦</div>
            <div className={styles.emptyTitle}>No notes yet</div>
            <p className={styles.emptyText}>
              Co-Pilot summaries will appear here automatically after each session.
              You can also add manual notes at any time.
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {groups.map((group) => (
              <div key={group.label} className={styles.dateGroup}>
                <div className={styles.dateLabel}>{group.label}</div>

                {group.notes.map((note) => (
                  <div key={note.id} className={styles.noteRow}>
                    {/* Meta row with hover-revealed actions */}
                    <div className={styles.noteMeta}>
                      <span className={styles.noteIcon}>
                        {note.note_type === 'copilot_summary' ? '✦' : '✏'}
                      </span>
                      <span className={styles.noteTime}>{formatTime(note.created_at)}</span>
                      <span className={styles.noteType}>
                        {note.note_type === 'copilot_summary' ? 'Co-Pilot Summary' : 'Manual Note'}
                      </span>
                      <div className={styles.noteActions}>
                        <button
                          className={styles.noteActionBtn}
                          onClick={() => startEdit(note)}
                          aria-label="Edit note"
                          title="Edit"
                        >
                          {/* Pencil icon */}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className={`${styles.noteActionBtn} ${styles.noteActionDanger}`}
                          onClick={() => startDelete(note.id)}
                          aria-label="Delete note"
                          title="Delete"
                        >
                          {/* Trash icon */}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Inline edit */}
                    {editingId === note.id ? (
                      <div className={styles.inlineEdit}>
                        <textarea
                          className={styles.inlineTextarea}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          autoFocus
                          rows={4}
                        />
                        {editError && <div className={styles.inlineError}>{editError}</div>}
                        <div className={styles.inlineActions}>
                          <button className={styles.inlineSave} onClick={() => handleEdit(note.id)} disabled={!editText.trim() || isPending}>
                            {isPending ? 'Saving…' : 'Save'}
                          </button>
                          <button className={styles.inlineCancel} onClick={cancelEdit}>Cancel</button>
                        </div>
                      </div>
                    ) : deletingId === note.id ? (
                      /* Inline delete confirm */
                      <div className={styles.deleteConfirm}>
                        <span className={styles.deleteQuestion}>Delete this note?</span>
                        <div className={styles.inlineActions}>
                          <button className={styles.deleteYes} onClick={() => handleDelete(note.id)} disabled={isPending}>
                            {isPending ? 'Deleting…' : 'Yes, delete'}
                          </button>
                          <button className={styles.inlineCancel} onClick={cancelDelete}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.noteContent}>{note.content}</div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Note Modal ─────────────────────────────────────── */}
      {addOpen && (
        <div className={styles.overlay} onClick={closeAdd}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Add Clinical Note</span>
              <button className={styles.modalClose} onClick={closeAdd} aria-label="Close">×</button>
            </div>
            <textarea
              className={styles.modalTextarea}
              placeholder="Enter your clinical note…"
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              autoFocus
              rows={6}
            />
            {addError && <div className={styles.modalError}>{addError}</div>}
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeAdd}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleAdd} disabled={!addText.trim() || isPending}>
                {isPending ? 'Saving…' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
