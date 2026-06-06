'use client';

import { useState, useMemo } from 'react';
import styles from './Engagement.module.css';

// ─── Types ────────────────────────────────────────────────────────

export interface ClientEngagement {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  wellnessScore: number;
  engagementScore: number;
  status: 'engaged' | 'nudge' | 'at-risk';
  daysSincePulse: number | null;
  daysSinceJournal: number | null;
  daysSinceNaq: number | null;
  lastSessionDate: string | null;
  protocolName: string | null;
  protocolDay: number | null;
  protocolPhase: number | null;
  hasNaq: boolean;
  hasJournal: boolean;
  hasPulseStreak7: boolean;
  milestones: string[];
  lastNudgeDate: string | null;
}

interface Props {
  clients: ClientEngagement[];
  practitionerId: string;
}

type Sort = 'score' | 'name' | 'wellness';

// ─── Helpers ──────────────────────────────────────────────────────

function formatDaysAgo(days: number | null): string {
  if (days === null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function daysBetween(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────

export default function EngagementClient({ clients, practitionerId }: Props) {
  const [sort, setSort] = useState<Sort>('score');
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [nudgeDates, setNudgeDates] = useState<Record<string, string>>({});
  const [bulkSending, setBulkSending] = useState(false);
  const [digestSending, setDigestSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [nudgeAllModalOpen, setNudgeAllModalOpen] = useState(false);
  const [nudgePersonalNote, setNudgePersonalNote] = useState('');

  const now = new Date();

  // Merge server-provided lastNudgeDate with live-updated nudgeDates
  const resolvedNudgeDate = (c: ClientEngagement) =>
    nudgeDates[c.id] ?? c.lastNudgeDate;

  // ── Stats ───────────────────────────────────────────────────────
  const engaged = clients.filter((c) => c.status === 'engaged').length;
  const nudgeNeeded = clients.filter((c) => c.status === 'nudge').length;
  const atRisk = clients.filter((c) => c.status === 'at-risk').length;

  // ── Sorted list ─────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const list = [...clients];
    if (sort === 'score') list.sort((a, b) => a.engagementScore - b.engagementScore); // least first
    if (sort === 'name') list.sort((a, b) => a.lastName.localeCompare(b.lastName));
    if (sort === 'wellness') list.sort((a, b) => b.wellnessScore - a.wellnessScore);
    return list;
  }, [clients, sort]);

  // ── Nudge single client ─────────────────────────────────────────
  async function sendNudge(clientId: string) {
    setSendingIds((prev) => new Set([...prev, clientId]));
    try {
      const res = await fetch('/api/engagement/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, nudgeType: 'auto' }),
      });
      if (res.ok) {
        const data = (await res.json()) as { sentAt: string };
        setNudgeDates((prev) => ({ ...prev, [clientId]: data.sentAt }));
        showToast('Nudge sent');
      } else {
        showToast('Failed to send nudge');
      }
    } catch {
      showToast('Failed to send nudge');
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
    }
  }

  // ── Bulk nudge all at-risk ──────────────────────────────────────
  async function nudgeAllAtRisk() {
    const targets = sorted.filter((c) => c.status === 'at-risk');
    if (targets.length === 0) { showToast('No at-risk clients to nudge'); return; }
    setBulkSending(true);
    let sent = 0;
    for (const client of targets) {
      await sendNudge(client.id);
      sent++;
      await new Promise((r) => setTimeout(r, 150));
    }
    setBulkSending(false);
    showToast(`Sent nudges to ${sent} at-risk client${sent !== 1 ? 's' : ''}`);
  }

  // ── Weekly digest ───────────────────────────────────────────────
  async function sendWeeklyDigest() {
    setDigestSending(true);
    try {
      const res = await fetch('/api/engagement/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = (await res.json()) as { sent: number };
        showToast(`Weekly digest sent to ${data.sent} client${data.sent !== 1 ? 's' : ''}`);
      } else {
        showToast('Failed to send digest');
      }
    } catch {
      showToast('Failed to send digest');
    } finally {
      setDigestSending(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Nudge All At-Risk confirmation modal */}
      {nudgeAllModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setNudgeAllModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>Nudge All At-Risk Clients</div>
            <p className={styles.modalDesc}>
              This will send a check-in nudge email to {atRisk} at-risk {atRisk === 1 ? 'client' : 'clients'}.
            </p>
            <label className={styles.modalLabel}>
              Add a personal note (optional):
              <textarea
                className={styles.modalTextarea}
                placeholder='e.g. "I noticed you haven&apos;t checked in — just wanted to see how you&apos;re feeling this week."'
                value={nudgePersonalNote}
                onChange={(e) => setNudgePersonalNote(e.target.value)}
                rows={3}
              />
            </label>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setNudgeAllModalOpen(false)}>
                Cancel
              </button>
              <button
                className={styles.modalConfirm}
                disabled={bulkSending}
                onClick={async () => {
                  setNudgeAllModalOpen(false);
                  setBulkSending(true);
                  const atRiskClients = sorted.filter((c) => c.status === 'at-risk');
                  for (const c of atRiskClients) {
                    await fetch('/api/engagement/nudge', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clientId: c.id, nudgeType: 'at-risk', personalNote: nudgePersonalNote }),
                    });
                  }
                  setBulkSending(false);
                  setNudgePersonalNote('');
                  showToast(`Nudged ${atRiskClients.length} at-risk ${atRiskClients.length === 1 ? 'client' : 'clients'}`);
                }}
              >
                {bulkSending ? 'Sending…' : `Send to ${atRisk} ${atRisk === 1 ? 'client' : 'clients'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.sectionLabel}>Practitioner Tools</div>
          <h1 className={styles.title}>
            Engagement Loop <span className={styles.aiBadge}>AI</span>
          </h1>
          <p className={styles.subtitle}>
            Monitor client activity, send context-aware nudges, and celebrate milestones between sessions.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => setNudgeAllModalOpen(true)}
            disabled={bulkSending || atRisk === 0}
          >
            {bulkSending ? 'Sending…' : `Nudge All At-Risk${atRisk > 0 ? ` (${atRisk})` : ''}`}
          </button>
          <button
            className={`${styles.btn} ${styles.btnCopper}`}
            onClick={sendWeeklyDigest}
            disabled={digestSending}
          >
            {digestSending ? 'Sending…' : 'Send Weekly Digest'}
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className={styles.statsStrip}>
        <div className={styles.statItem}>
          <div className={styles.statVal}>{clients.length}</div>
          <div className={styles.statLab}>Total Clients</div>
        </div>
        <div className={`${styles.statItem} ${styles.statEngaged}`}>
          <div className={styles.statVal}>{engaged}</div>
          <div className={styles.statLab}>Engaged</div>
        </div>
        <div className={`${styles.statItem} ${styles.statNudge}`}>
          <div className={styles.statVal}>{nudgeNeeded}</div>
          <div className={styles.statLab}>Needs Nudge</div>
        </div>
        <div className={`${styles.statItem} ${styles.statRisk}`}>
          <div className={styles.statVal}>{atRisk}</div>
          <div className={styles.statLab}>At Risk</div>
        </div>
      </div>

      {/* Sort controls */}
      <div className={styles.controls}>
        <span className={styles.controlsLabel}>Sort by:</span>
        {(['score', 'name', 'wellness'] as Sort[]).map((s) => (
          <button
            key={s}
            className={`${styles.sortBtn} ${sort === s ? styles.sortBtnActive : ''}`}
            onClick={() => setSort(s)}
          >
            {s === 'score' ? 'Least Engaged' : s === 'name' ? 'Name' : 'Wellness Score'}
          </button>
        ))}
        <span className={styles.clientCount}>{clients.length} clients</span>
      </div>

      {/* Client list */}
      {clients.length === 0 ? (
        <div className={styles.empty}>
          No clients yet. Add clients from the Clients page to track engagement.
        </div>
      ) : (
        <div className={styles.clientList}>
          {sorted.map((client) => {
            const isSending = sendingIds.has(client.id);
            const lastNudge = resolvedNudgeDate(client);
            const statusClass =
              client.status === 'engaged'
                ? styles.statusEngaged
                : client.status === 'nudge'
                ? styles.statusNudge
                : styles.statusRisk;

            return (
              <div key={client.id} className={`${styles.clientRow} ${statusClass}`}>

                {/* Avatar */}
                <div className={`${styles.avatar} ${statusClass}Avatar`}>
                  {initials(client.firstName, client.lastName)}
                </div>

                {/* Name + milestones */}
                <div className={styles.nameBlock}>
                  <div className={styles.clientName}>
                    {client.firstName} {client.lastName}
                  </div>
                  <div className={styles.clientEmail}>{client.email ?? '—'}</div>
                  {client.protocolName && (
                    <div className={styles.protocolLine}>
                      {client.protocolName}
                      {client.protocolDay ? ` · Day ${client.protocolDay}` : ''}
                      {client.protocolPhase ? ` · Phase ${client.protocolPhase}` : ''}
                    </div>
                  )}
                  {client.milestones.length > 0 && (
                    <div className={styles.milestones}>
                      {client.milestones.map((m) => (
                        <span key={m} className={styles.milestoneBadge}>✦ {m}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Activity stats */}
                <div className={styles.statsGrid}>
                  <div className={styles.statCell}>
                    <div className={styles.statCellVal}>
                      {formatDaysAgo(client.daysSincePulse)}
                    </div>
                    <div className={styles.statCellLab}>Last Pulse</div>
                  </div>
                  <div className={styles.statCell}>
                    <div className={styles.statCellVal}>
                      {formatDaysAgo(client.daysSinceJournal)}
                    </div>
                    <div className={styles.statCellLab}>Last Journal</div>
                  </div>
                  <div className={styles.statCell}>
                    <div className={styles.statCellVal}>
                      {client.protocolDay ? `Day ${client.protocolDay}` : '—'}
                    </div>
                    <div className={styles.statCellLab}>Protocol</div>
                  </div>
                  <div className={styles.statCell}>
                    <div className={styles.statCellVal}>
                      {formatDate(client.lastSessionDate)}
                    </div>
                    <div className={styles.statCellLab}>Last Session</div>
                  </div>
                  <div className={styles.statCell}>
                    <div className={styles.statCellVal}>
                      {resolvedNudgeDate(client)
                        ? formatDaysAgo(daysBetween(new Date(resolvedNudgeDate(client)!), now))
                        : 'Never'}
                    </div>
                    <div className={styles.statCellLab}>Last Nudge</div>
                  </div>
                </div>

                {/* Engagement score */}
                <div className={styles.scoreBlock}>
                  <div className={`${styles.scoreNum} ${statusClass}Score`}>
                    {client.engagementScore}
                  </div>
                  <div className={styles.scoreSub}>/ 100</div>
                  <div className={`${styles.statusBadge} ${statusClass}Badge`}>
                    {client.status === 'engaged'
                      ? 'Engaged'
                      : client.status === 'nudge'
                      ? 'Needs Nudge'
                      : 'At Risk'}
                  </div>
                </div>

                {/* Nudge action */}
                <div className={styles.nudgeBlock}>
                  <button
                    className={`${styles.btn} ${styles.btnNudge}`}
                    onClick={() => sendNudge(client.id)}
                    disabled={isSending}
                  >
                    {isSending ? '…' : 'Send Nudge'}
                  </button>
                  {lastNudge && (
                    <div className={styles.lastNudge}>
                      Last: {formatDate(lastNudge)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Milestone Tracker section */}
      {clients.some((c) => c.milestones.length > 0) && (
        <div className={styles.milestoneSection}>
          <div className={styles.milestoneSectionTitle}>✦ Active Milestones</div>
          <div className={styles.milestoneGrid}>
            {clients
              .filter((c) => c.milestones.length > 0)
              .map((c) => (
                <div key={c.id} className={styles.milestoneCard}>
                  <div className={styles.milestoneCardName}>
                    {c.firstName} {c.lastName}
                  </div>
                  <div className={styles.milestoneCardBadges}>
                    {c.milestones.map((m) => (
                      <span key={m} className={styles.milestoneBadge}>{m}</span>
                    ))}
                  </div>
                  <button
                    className={`${styles.btn} ${styles.btnNudge}`}
                    style={{ marginTop: '8px', fontSize: '11px', padding: '5px 10px' }}
                    onClick={() => sendNudge(c.id)}
                    disabled={sendingIds.has(c.id)}
                  >
                    {sendingIds.has(c.id) ? '…' : 'Celebrate →'}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
