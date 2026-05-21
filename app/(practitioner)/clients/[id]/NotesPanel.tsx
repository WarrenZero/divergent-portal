'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addManualNote } from './notes.actions';
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
    const d = new Date(note.created_at);
    const key = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(note);
  }

  return Array.from(map.entries()).map(([label, notes]) => ({ label, notes }));
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
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
  const [modalOpen, setModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const groups = groupByDate(initialNotes);

  function openModal() {
    setNoteText('');
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setNoteText('');
    setError(null);
  }

  function handleSave() {
    if (!noteText.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await addManualNote(clientId, noteText);
      if (result.error) {
        setError(result.error);
      } else {
        closeModal();
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>Clinical Notes</span>
          <button className={styles.addBtn} onClick={openModal}>
            + Add Note
          </button>
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
                    <div className={styles.noteMeta}>
                      <span className={styles.noteIcon}>
                        {note.note_type === 'copilot_summary' ? '✦' : '✏'}
                      </span>
                      <span className={styles.noteTime}>{formatTime(note.created_at)}</span>
                      <span className={styles.noteType}>
                        {note.note_type === 'copilot_summary' ? 'Co-Pilot Summary' : 'Manual Note'}
                      </span>
                    </div>
                    <div className={styles.noteContent}>{note.content}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Note Modal ─────────────────────────────────────── */}
      {modalOpen && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Add Clinical Note</span>
              <button className={styles.modalClose} onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>
            <textarea
              className={styles.modalTextarea}
              placeholder="Enter your clinical note…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              autoFocus
              rows={6}
            />
            {error && <div className={styles.modalError}>{error}</div>}
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeModal}>
                Cancel
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={!noteText.trim() || isPending}
              >
                {isPending ? 'Saving…' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
