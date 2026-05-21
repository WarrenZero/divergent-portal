'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  scheduleSession,
  editSessionDetails,
  updateSessionStatus,
} from './sessions.actions';
import styles from './SessionsView.module.css';
import type { SessionRow, ClientOption } from './page';

// ─── Constants ────────────────────────────────────────────────

const SESSION_TYPES = [
  'Initial Consultation',
  'Follow-Up',
  'Protocol Review',
  'Emergency',
];

const DURATIONS = [30, 60, 90];

// 8:00 AM → 6:00 PM in 30-min increments
const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 18; h++) {
  for (let m = 0; m < 60; m += 30) {
    if (h === 18 && m > 0) break;
    TIME_SLOTS.push(
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    );
  }
}

// ─── Types ────────────────────────────────────────────────────

interface FormState {
  clientId: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  durationMinutes: number;
  sessionType: string;
  soapNote: string;
}

interface Props {
  sessions: SessionRow[];
  clients: ClientOption[];
}

// ─── Helpers ──────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Sun
  copy.setDate(copy.getDate() - day + (day === 0 ? -6 : 1));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sessionDateKey(iso: string): string {
  return toDateKey(new Date(iso));
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function weekRangeLabel(start: Date): string {
  const end = addDays(start, 6);
  const startStr = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

function formatSessionType(type: string): string {
  if (type === 'telehealth') return 'Telehealth';
  return type;
}

function timeSlotLabel(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function buildScheduledAt(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function defaultForm(prefillDate = ''): FormState {
  return {
    clientId: '',
    date: prefillDate || toDateKey(new Date()),
    time: '09:00',
    durationMinutes: 60,
    sessionType: 'Follow-Up',
    soapNote: '',
  };
}

function formFromSession(s: SessionRow): FormState {
  const d = new Date(s.scheduled_at);
  return {
    clientId: s.client_id ?? '',
    date: toDateKey(d),
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    durationMinutes: s.duration_minutes,
    sessionType: SESSION_TYPES.includes(s.session_type) ? s.session_type : 'Follow-Up',
    soapNote: s.soap_note ?? '',
  };
}

// ─── Status badge ─────────────────────────────────────────────

function statusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case 'completed': return { label: 'Completed', cls: styles.statusCompleted };
    case 'cancelled': return { label: 'Cancelled', cls: styles.statusCancelled };
    default:           return { label: 'Scheduled', cls: styles.statusScheduled };
  }
}

// ─── Component ────────────────────────────────────────────────

export default function SessionsView({ sessions, clients }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // View mode
  const [view, setView] = useState<'list' | 'calendar'>('list');

  // Calendar week
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionRow | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [formError, setFormError] = useState<string | null>(null);

  // Inline cancel confirm
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  // Clients map for lookup
  const clientMap = new Map<string, ClientOption>();
  for (const c of clients) clientMap.set(c.id, c);

  function clientName(id: string | null): string {
    if (!id) return 'No client';
    const c = clientMap.get(id);
    return c ? `${c.first_name} ${c.last_name}` : 'Unknown';
  }

  // ── Modal open/close ─────────────────────────────────────────

  function openSchedule(prefillDate = '') {
    setEditingSession(null);
    setForm(defaultForm(prefillDate));
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(session: SessionRow) {
    setEditingSession(session);
    setForm(formFromSession(session));
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingSession(null);
    setFormError(null);
  }

  // ── Form submission ──────────────────────────────────────────

  function handleFormChange(
    field: keyof FormState,
    value: string | number,
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    if (!form.date || !form.time) {
      setFormError('Date and time are required.');
      return;
    }

    const scheduledAt = buildScheduledAt(form.date, form.time);

    startTransition(async () => {
      const data = {
        clientId: form.clientId,
        scheduledAt,
        durationMinutes: form.durationMinutes,
        sessionType: form.sessionType,
        soapNote: form.soapNote,
      };

      const result = editingSession
        ? await editSessionDetails(editingSession.id, data)
        : await scheduleSession(data);

      if (result.error) {
        setFormError(result.error);
        return;
      }

      closeModal();
      router.refresh();
    });
  }

  // ── Session status actions ───────────────────────────────────

  function handleComplete(sessionId: string) {
    startTransition(async () => {
      await updateSessionStatus(sessionId, 'completed');
      router.refresh();
    });
  }

  function handleCancel(sessionId: string) {
    startTransition(async () => {
      await updateSessionStatus(sessionId, 'cancelled');
      setCancelConfirmId(null);
      router.refresh();
    });
  }

  // ── Calendar helpers ─────────────────────────────────────────

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 7);

  const sessionsByDay = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    const d = new Date(s.scheduled_at);
    if (d >= weekStart && d < weekEnd) {
      const key = sessionDateKey(s.scheduled_at);
      if (!sessionsByDay.has(key)) sessionsByDay.set(key, []);
      sessionsByDay.get(key)!.push(s);
    }
  }

  const todayKey = toDateKey(new Date());

  // ── List view grouping ───────────────────────────────────────

  const now = new Date();
  const upcoming = sessions.filter(
    (s) => new Date(s.scheduled_at) >= now && s.status !== 'cancelled',
  );
  const past = sessions
    .filter((s) => new Date(s.scheduled_at) < now || s.status === 'cancelled')
    .reverse(); // most recent first

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Sessions</h1>
          <p className={styles.pageSubtitle}>
            Schedule, manage, and track telehealth sessions with your clients.
          </p>
        </div>
        <div className={styles.headerActions}>
          {/* View toggle */}
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewToggleBtn} ${view === 'list' ? styles.viewToggleActive : ''}`}
              onClick={() => setView('list')}
            >
              List
            </button>
            <button
              className={`${styles.viewToggleBtn} ${view === 'calendar' ? styles.viewToggleActive : ''}`}
              onClick={() => setView('calendar')}
            >
              Calendar
            </button>
          </div>
          <button className={styles.scheduleBtn} onClick={() => openSchedule()}>
            + Schedule Session
          </button>
        </div>
      </div>

      {/* ════ CALENDAR VIEW ════════════════════════════════════════ */}
      {view === 'calendar' && (
        <div className={styles.calendar}>

          {/* Week navigation */}
          <div className={styles.calNav}>
            <button
              className={styles.calNavBtn}
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              aria-label="Previous week"
            >
              ← Prev
            </button>
            <span className={styles.calNavLabel}>{weekRangeLabel(weekStart)}</span>
            <button
              className={styles.calNavBtn}
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              aria-label="Next week"
            >
              Next →
            </button>
          </div>

          {/* Day columns */}
          <div className={styles.calGrid}>
            {weekDays.map((day) => {
              const key = toDateKey(day);
              const isToday = key === todayKey;
              const daySessions = sessionsByDay.get(key) ?? [];

              return (
                <div
                  key={key}
                  className={`${styles.calDay} ${isToday ? styles.calDayToday : ''}`}
                >
                  <div className={styles.calDayHeader}>
                    <div className={styles.calDayName}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`${styles.calDayDate} ${isToday ? styles.calDayDateToday : ''}`}>
                      {day.getDate()}
                    </div>
                  </div>

                  <div className={styles.calDayBody}>
                    {daySessions.length === 0 ? (
                      <button
                        className={styles.calAddBtn}
                        onClick={() => openSchedule(key)}
                        aria-label={`Schedule session on ${day.toLocaleDateString()}`}
                      >
                        +
                      </button>
                    ) : (
                      <>
                        {daySessions.map((s) => {
                          const badge = statusBadge(s.status);
                          return (
                            <div
                              key={s.id}
                              className={`${styles.calSessionCard} ${
                                s.status === 'cancelled'
                                  ? styles.calSessionCancelled
                                  : s.status === 'completed'
                                  ? styles.calSessionCompleted
                                  : styles.calSessionScheduled
                              }`}
                              onClick={() => openEdit(s)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && openEdit(s)}
                            >
                              <div className={styles.calSessionTime}>
                                {formatTime(s.scheduled_at)}
                              </div>
                              <div className={styles.calSessionClient}>
                                {clientName(s.client_id)}
                              </div>
                              <div className={styles.calSessionType}>
                                {formatSessionType(s.session_type)}
                              </div>
                              <span className={`${styles.statusDot} ${badge.cls}`} />
                            </div>
                          );
                        })}
                        <button
                          className={styles.calAddBtn}
                          onClick={() => openSchedule(key)}
                          aria-label="Add another session"
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════ LIST VIEW ════════════════════════════════════════════ */}
      {view === 'list' && (
        <div className={styles.listView}>

          {/* Upcoming */}
          <section>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Upcoming</span>
              <span className={styles.sectionCount}>{upcoming.length}</span>
            </div>

            {upcoming.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyGlyph}>◉</div>
                <div className={styles.emptyTitle}>No upcoming sessions</div>
                <p className={styles.emptyText}>
                  Schedule a session to get started. Sessions appear on the dashboard
                  and in each client&apos;s check-in view.
                </p>
                <button className={styles.scheduleBtn} onClick={() => openSchedule()}>
                  + Schedule First Session
                </button>
              </div>
            ) : (
              <div className={styles.sessionList}>
                {upcoming.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    clientName={clientName(s.client_id)}
                    cancelConfirmId={cancelConfirmId}
                    isPending={isPending}
                    onEdit={() => openEdit(s)}
                    onComplete={() => handleComplete(s.id)}
                    onCancelRequest={() => setCancelConfirmId(s.id)}
                    onCancelConfirm={() => handleCancel(s.id)}
                    onCancelDismiss={() => setCancelConfirmId(null)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Past & Cancelled */}
          {past.length > 0 && (
            <section>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Past &amp; Cancelled</span>
                <span className={styles.sectionCount}>{past.length}</span>
              </div>
              <div className={styles.sessionList}>
                {past.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    clientName={clientName(s.client_id)}
                    cancelConfirmId={cancelConfirmId}
                    isPending={isPending}
                    onEdit={() => openEdit(s)}
                    onComplete={() => handleComplete(s.id)}
                    onCancelRequest={() => setCancelConfirmId(s.id)}
                    onCancelConfirm={() => handleCancel(s.id)}
                    onCancelDismiss={() => setCancelConfirmId(null)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ════ SCHEDULE / EDIT MODAL ════════════════════════════════ */}
      {modalOpen && (
        <div className={styles.overlay} onClick={closeModal}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={editingSession ? 'Edit Session' : 'Schedule Session'}
          >
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>
                {editingSession ? 'Edit Session' : 'Schedule Session'}
              </span>
              <button
                className={styles.modalClose}
                onClick={closeModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Client */}
              <div className={styles.formField}>
                <label className={styles.formLabel}>Client</label>
                <select
                  className={styles.formSelect}
                  value={form.clientId}
                  onChange={(e) => handleFormChange('clientId', e.target.value)}
                >
                  <option value="">— No client selected —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.last_name}, {c.first_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date + Time row */}
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Date</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={form.date}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Time</label>
                  <select
                    className={styles.formSelect}
                    value={form.time}
                    onChange={(e) => handleFormChange('time', e.target.value)}
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {timeSlotLabel(slot)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Duration + Type row */}
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Duration</label>
                  <select
                    className={styles.formSelect}
                    value={form.durationMinutes}
                    onChange={(e) =>
                      handleFormChange('durationMinutes', Number(e.target.value))
                    }
                  >
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d} min
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Session Type</label>
                  <select
                    className={styles.formSelect}
                    value={form.sessionType}
                    onChange={(e) => handleFormChange('sessionType', e.target.value)}
                  >
                    {SESSION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Session Notes{' '}
                  <span className={styles.formLabelOptional}>(optional)</span>
                </label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="Preparation notes, session agenda, or clinical observations…"
                  value={form.soapNote}
                  onChange={(e) => handleFormChange('soapNote', e.target.value)}
                  rows={3}
                />
              </div>

              {formError && (
                <div className={styles.formError}>{formError}</div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={closeModal}>
                Cancel
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSubmit}
                disabled={!form.date || !form.time || isPending}
              >
                {isPending
                  ? editingSession
                    ? 'Saving…'
                    : 'Scheduling…'
                  : editingSession
                  ? 'Save Changes'
                  : 'Schedule Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────

interface SessionCardProps {
  session: SessionRow;
  clientName: string;
  cancelConfirmId: string | null;
  isPending: boolean;
  onEdit: () => void;
  onComplete: () => void;
  onCancelRequest: () => void;
  onCancelConfirm: () => void;
  onCancelDismiss: () => void;
}

function SessionCard({
  session,
  clientName,
  cancelConfirmId,
  isPending,
  onEdit,
  onComplete,
  onCancelRequest,
  onCancelConfirm,
  onCancelDismiss,
}: SessionCardProps) {
  const badge = statusBadge(session.status);
  const isUpcoming =
    new Date(session.scheduled_at) >= new Date() &&
    session.status === 'scheduled';

  return (
    <div
      className={`${styles.sessionCard} ${
        session.status === 'cancelled'
          ? styles.sessionCardCancelled
          : session.status === 'completed'
          ? styles.sessionCardCompleted
          : ''
      }`}
    >
      {/* Left: details */}
      <div className={styles.sessionCardLeft}>
        <div className={styles.sessionCardClient}>{clientName}</div>
        <div className={styles.sessionCardDateTime}>
          {formatFullDate(session.scheduled_at)} &middot;{' '}
          {formatTime(session.scheduled_at)}
        </div>
        <div className={styles.sessionCardMeta}>
          <span>{session.duration_minutes} min</span>
          <span className={styles.sessionCardDot}>·</span>
          <span>{formatSessionType(session.session_type)}</span>
        </div>
        {session.soap_note && (
          <div className={styles.sessionCardNote}>{session.soap_note}</div>
        )}
      </div>

      {/* Right: status + actions */}
      <div className={styles.sessionCardRight}>
        <span className={`${styles.statusBadge} ${badge.cls}`}>
          {badge.label}
        </span>

        {/* Action buttons — only for upcoming scheduled sessions */}
        {isUpcoming && cancelConfirmId !== session.id && (
          <div className={styles.sessionActions}>
            <button
              className={styles.actionBtnPine}
              onClick={onComplete}
              disabled={isPending}
              title="Mark as completed"
            >
              ✓ Complete
            </button>
            <button
              className={styles.actionBtnGhost}
              onClick={onEdit}
              title="Edit session"
            >
              Edit
            </button>
            <button
              className={styles.actionBtnDanger}
              onClick={onCancelRequest}
              title="Cancel session"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Cancel confirmation */}
        {cancelConfirmId === session.id && (
          <div className={styles.cancelConfirm}>
            <span className={styles.cancelConfirmText}>Cancel this session?</span>
            <button
              className={styles.cancelConfirmYes}
              onClick={onCancelConfirm}
              disabled={isPending}
            >
              {isPending ? 'Cancelling…' : 'Yes, cancel'}
            </button>
            <button
              className={styles.cancelConfirmNo}
              onClick={onCancelDismiss}
            >
              Keep
            </button>
          </div>
        )}

        {/* Edit-only for completed sessions */}
        {session.status === 'completed' && (
          <button className={styles.actionBtnGhost} onClick={onEdit}>
            Edit Notes
          </button>
        )}
      </div>
    </div>
  );
}
