'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './Clients.module.css';

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  primary_concern: string | null;
  wellness_score: number;
  created_at: string;
}

interface Props {
  clients: ClientRow[];
}

// ─── Helpers ───────────────────────────────────────────────────

const GRADIENTS = [
  'linear-gradient(135deg, #C07848, #DFA878)',
  'linear-gradient(135deg, #3A5C42, #5A7C62)',
  'linear-gradient(135deg, #2A4330, #3A5C42)',
  'linear-gradient(135deg, #8A5028, #C07848)',
  'linear-gradient(135deg, #5A4C38, #9A8A72)',
  'linear-gradient(135deg, #162A1A, #2A4330)',
];

function avatarGradient(firstName: string): string {
  return GRADIENTS[(firstName.charCodeAt(0) ?? 0) % GRADIENTS.length];
}

function initials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function scoreColor(score: number): string {
  if (score >= 67) return 'var(--pine-500)';
  if (score >= 34) return 'var(--warn)';
  return 'var(--danger)';
}

function daysSince(iso: string): string {
  const days = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return 'Added today';
  if (days === 1) return 'Added yesterday';
  return `Added ${days} days ago`;
}

// ─── Component ────────────────────────────────────────────────

export default function ClientListWithBulkActions({ clients }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function sendBulkNudge() {
    for (const id of selectedIds) {
      await fetch('/api/engagement/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: id, nudgeType: 'auto' }),
      });
    }
    setSelectedIds(new Set());
  }

  function exportSelectedCSV() {
    const selected = clients.filter((c) => selectedIds.has(c.id));
    const rows = [
      ['Name', 'Email', 'Wellness Score', 'Primary Concern', 'Added'],
      ...selected.map((c) => [
        `${c.first_name} ${c.last_name}`,
        c.email ?? '',
        String(c.wellness_score),
        c.primary_concern ?? '',
        daysSince(c.created_at),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (clients.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyGlyph}>◉</div>
        <div className={styles.emptyTitle}>No clients yet</div>
        <p className={styles.emptyText}>
          Add your first client to start tracking their wellness journey,
          assigning protocols, and running AI-assisted assessments.
        </p>
        <Link href="/clients/new" className={styles.btnPrimary}>
          + Add First Client
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className={styles.list}>
        {clients.map((client) => (
          <div
            key={client.id}
            className={styles.card}
            style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: 16, alignItems: 'center', textDecoration: 'none' }}
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={selectedIds.has(client.id)}
              onChange={(e) => toggleSelect(client.id, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 16, height: 16, accentColor: 'var(--copper-500)', cursor: 'pointer', flexShrink: 0 }}
              aria-label={`Select ${client.first_name} ${client.last_name}`}
            />

            {/* Clickable area: Avatar + Info + Score */}
            <Link
              href={`/clients/${client.id}`}
              style={{ display: 'contents', textDecoration: 'none' }}
            >
              {/* Avatar */}
              <div
                className={styles.avatar}
                style={{ background: avatarGradient(client.first_name) }}
              >
                {initials(client.first_name, client.last_name)}
              </div>

              {/* Info */}
              <div>
                <div className={styles.name}>
                  {client.first_name} {client.last_name}
                </div>
                <div className={styles.meta}>
                  {client.email ?? 'No email'} · {daysSince(client.created_at)}
                </div>
                {client.primary_concern && (
                  <div className={styles.concern}>{client.primary_concern}</div>
                )}
              </div>

              {/* Score */}
              <div className={styles.scoreCol}>
                <span
                  className={`${styles.scoreBadge} ${
                    client.wellness_score === 0 ? styles.badgeNew : styles.badgeActive
                  }`}
                >
                  {client.wellness_score === 0 ? 'New' : 'Active'}
                </span>
                <span
                  className={styles.scoreNum}
                  style={{ color: scoreColor(client.wellness_score) }}
                >
                  {client.wellness_score}
                </span>
                <span className={styles.scoreLabel}>Wellness</span>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--pine-900)',
          borderTop: '1px solid var(--pine-700)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 100,
        }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: '#fff' }}>
            {selectedIds.size} {selectedIds.size === 1 ? 'client' : 'clients'} selected
          </span>
          <button
            onClick={() => {/* send message — placeholder */}}
            style={{ padding: '6px 14px', background: 'var(--pine-700)', color: '#fff', border: 'none', borderRadius: 6, fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            Send message
          </button>
          <button
            onClick={sendBulkNudge}
            style={{ padding: '6px 14px', background: 'var(--copper-500)', color: '#fff', border: 'none', borderRadius: 6, fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            Send nudge
          </button>
          <button
            onClick={exportSelectedCSV}
            style={{ padding: '6px 14px', background: 'none', color: 'var(--pine-200)', border: '1px solid var(--pine-600)', borderRadius: 6, fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            Export CSV
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--pine-400)', fontSize: 16, cursor: 'pointer' }}
            aria-label="Clear selection"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
