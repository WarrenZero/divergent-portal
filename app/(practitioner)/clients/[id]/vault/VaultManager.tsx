'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './VaultManager.module.css';

// ─── Types ────────────────────────────────────────────────────────

export interface VaultRow {
  id: string;
  title: string;
  contentType: 'article' | 'document' | 'protocol_resource';
  body: string | null;
  fileUrl: string | null;
  estimatedReadMinutes: number;
  isRead: boolean;
  isBookmarked: boolean;
  createdAt: string;
}

interface Props {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  items: VaultRow[];
  practitionerId: string;
}

type ContentType = VaultRow['contentType'];

const TYPE_LABELS: Record<ContentType, string> = {
  article: 'Article',
  document: 'Document',
  protocol_resource: 'Protocol Resource',
};

const TYPE_ICONS: Record<ContentType, string> = {
  article: '⚘',
  document: '◈',
  protocol_resource: '✦',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Component ────────────────────────────────────────────────────

export default function VaultManager({
  clientId,
  clientName,
  clientEmail,
  items: initialItems,
  practitionerId: _,
}: Props) {
  const [items, setItems] = useState<VaultRow[]>(initialItems);
  const [activeTab, setActiveTab] = useState<'items' | 'add'>('items');

  // ── Add form state ───────────────────────────────────────────────
  const [contentType, setContentType] = useState<ContentType>('article');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [readTime, setReadTime] = useState('3');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Delete state ─────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Add item ─────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (contentType !== 'document' && !body.trim()) { setError('Body content is required for articles and protocol resources'); return; }
    if (contentType === 'document' && !fileUrl.trim()) { setError('File URL is required for documents'); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/vault/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          title: title.trim(),
          contentType,
          body: body.trim() || null,
          fileUrl: fileUrl.trim() || null,
          estimatedReadMinutes: parseInt(readTime, 10) || 3,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to add item');
      }

      const newItem = await res.json() as VaultRow;
      setItems((prev) => [newItem, ...prev]);
      setTitle('');
      setBody('');
      setFileUrl('');
      setReadTime('3');
      setSuccess(`"${newItem.title}" added${clientEmail ? ' — notification sent to client' : ''}`);
      setActiveTab('items');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete item ──────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('Remove this resource from the client\'s vault?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/vault/items?id=${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href={`/clients/${clientId}`} className={styles.breadLink}>
          ← {clientName}
        </Link>
        <span className={styles.breadSep}>/</span>
        <span className={styles.breadCurrent}>Vault</span>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{clientName}&rsquo;s Vault</h1>
          <p className={styles.subtitle}>
            {items.length} resource{items.length !== 1 ? 's' : ''} ·{' '}
            {items.filter((i) => i.isRead).length} read ·{' '}
            {items.filter((i) => !i.isRead).length} unread
          </p>
        </div>
        <button
          className={`${styles.btn} ${styles.btnPine}`}
          onClick={() => setActiveTab(activeTab === 'add' ? 'items' : 'add')}
        >
          {activeTab === 'add' ? '← Back to Library' : '+ Add Resource'}
        </button>
      </div>

      {/* Success / Error */}
      {success && <div className={styles.successBanner}>{success}</div>}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* ── Add form ─────────────────────────────────────────────── */}
      {activeTab === 'add' && (
        <form className={styles.addForm} onSubmit={handleAdd}>
          <div className={styles.formTitle}>Add a Resource to {clientName.split(' ')[0]}&rsquo;s Vault</div>

          {/* Content type selector */}
          <div className={styles.typeSelector}>
            {(['article', 'document', 'protocol_resource'] as ContentType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.typeBtn} ${contentType === t ? styles.typeBtnActive : ''}`}
                onClick={() => setContentType(t)}
              >
                <span className={styles.typeIcon}>{TYPE_ICONS[t]}</span>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Title */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Title</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Resource title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Body (for articles and protocol resources) */}
          {contentType !== 'document' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Content
                <span className={styles.labelHint}>Plain text — separate paragraphs with a blank line</span>
              </label>
              <textarea
                className={styles.textarea}
                rows={12}
                placeholder="Write the article content here…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
          )}

          {/* File URL (for documents) */}
          {contentType === 'document' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Document URL
                <span className={styles.labelHint}>Direct link to PDF (Supabase Storage, Google Drive, etc.)</span>
              </label>
              <input
                className={styles.input}
                type="url"
                placeholder="https://…"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
              />
            </div>
          )}

          {/* Read time */}
          <div className={styles.formGroup} style={{ maxWidth: '180px' }}>
            <label className={styles.label}>Estimated Read Time (minutes)</label>
            <input
              className={styles.input}
              type="number"
              min="1"
              max="60"
              value={readTime}
              onChange={(e) => setReadTime(e.target.value)}
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPine}`}
              disabled={saving}
            >
              {saving ? 'Adding…' : 'Add to Vault'}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => { setActiveTab('items'); setError(null); }}
            >
              Cancel
            </button>
            {clientEmail && (
              <span className={styles.emailNote}>
                Client will receive an email notification
              </span>
            )}
          </div>
        </form>
      )}

      {/* ── Items table ──────────────────────────────────────────── */}
      {activeTab === 'items' && (
        <>
          {items.length === 0 ? (
            <div className={styles.empty}>
              No resources in this client&rsquo;s vault yet. Add the first one to get started.
            </div>
          ) : (
            <div className={styles.itemList}>
              {items.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.itemIcon}>{TYPE_ICONS[item.contentType]}</div>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>{item.title}</div>
                    <div className={styles.itemMeta}>
                      <span className={styles.typePill}>{TYPE_LABELS[item.contentType]}</span>
                      <span className={styles.itemDate}>{formatDate(item.createdAt)}</span>
                      <span className={styles.itemReadTime}>{item.estimatedReadMinutes} min</span>
                    </div>
                  </div>
                  <div className={styles.itemStatus}>
                    {item.isRead ? (
                      <span className={styles.readBadge}>Read ✓</span>
                    ) : (
                      <span className={styles.unreadBadge}>Unread</span>
                    )}
                    {item.isBookmarked && (
                      <span className={styles.bookmarkedBadge}>✦ Saved</span>
                    )}
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    aria-label="Remove from vault"
                  >
                    {deletingId === item.id ? '…' : '✕'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
