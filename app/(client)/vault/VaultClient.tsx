'use client';

import { useState, useMemo } from 'react';
import styles from './Vault.module.css';

// ─── Types ────────────────────────────────────────────────────────

export interface VaultItem {
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
  items: VaultItem[];
  firstName: string;
  practitionerName: string;
}

type FilterTab = 'all' | 'article' | 'document' | 'protocol_resource';

// ─── Helpers ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<VaultItem['contentType'], string> = {
  article: 'Article',
  document: 'Document',
  protocol_resource: 'Protocol',
};

const TYPE_ICONS: Record<VaultItem['contentType'], string> = {
  article: '⚘',
  document: '◈',
  protocol_resource: '✦',
};

const TYPE_GRADIENT: Record<VaultItem['contentType'], string> = {
  article:            'linear-gradient(135deg, var(--pine-100), var(--pine-200))',
  document:           'linear-gradient(135deg, var(--copper-100), var(--copper-200))',
  protocol_resource:  'linear-gradient(135deg, var(--pine-800), var(--pine-600))',
};

const TYPE_ICON_COLOR: Record<VaultItem['contentType'], string> = {
  article:           'var(--pine-600)',
  document:          'var(--copper-600)',
  protocol_resource: 'var(--pine-100)',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────

export default function VaultClient({ items, firstName, practitionerName }: Props) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.isRead).map((i) => i.id)),
  );
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.isBookmarked).map((i) => i.id)),
  );
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);

  // ── Filtered list ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...items];
    if (filter !== 'all') list = list.filter((i) => i.contentType === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q));
    }
    return list;
  }, [items, filter, search]);

  const unreadCount = items.filter((i) => !readIds.has(i.id)).length;

  // ── Mark as read ────────────────────────────────────────────────
  async function markAsRead(id: string) {
    if (readIds.has(id)) return;
    setReadIds((prev) => new Set([...prev, id]));
    try {
      await fetch('/api/vault/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: id }),
      });
    } catch {
      // non-fatal — optimistic update already applied
    }
  }

  // ── Toggle bookmark ─────────────────────────────────────────────
  async function toggleBookmark(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const newVal = !bookmarkedIds.has(id);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      newVal ? next.add(id) : next.delete(id);
      return next;
    });
    try {
      await fetch('/api/vault/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: id }),
      });
    } catch {
      // non-fatal
    }
  }

  // ── Open item ───────────────────────────────────────────────────
  function openItem(item: VaultItem) {
    if (item.contentType === 'document' && item.fileUrl) {
      window.open(item.fileUrl, '_blank', 'noopener');
      markAsRead(item.id);
      return;
    }
    setSelectedItem(item);
    markAsRead(item.id);
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.sectionLabel}>My Library</div>
          <h1 className={styles.title}>My Library <span className={styles.glyph}>🗝</span></h1>
          <p className={styles.subtitle}>
            Resources Warren chose specifically for where you are in your journey
          </p>
        </div>
        {unreadCount > 0 && (
          <div className={styles.unreadPill}>
            {unreadCount} unread
          </div>
        )}
      </div>

      {/* Search + Filter */}
      <div className={styles.controls}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search resources…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={styles.tabs}>
          {(['all', 'article', 'document', 'protocol_resource'] as FilterTab[]).map((tab) => {
            const count = tab === 'all'
              ? items.length
              : items.filter((i) => i.contentType === tab).length;
            return (
              <button
                key={tab}
                className={`${styles.tab} ${filter === tab ? styles.tabActive : ''}`}
                onClick={() => setFilter(tab)}
              >
                {tab === 'all' ? 'All' : TYPE_LABELS[tab as VaultItem['contentType']]}
                <span className={styles.tabCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {search
            ? 'No resources match your search.'
            : filter !== 'all'
            ? `No ${TYPE_LABELS[filter as VaultItem['contentType']].toLowerCase()}s in your vault yet.`
            : `Warren will add resources here as your protocol progresses — articles, guides, and tools chosen just for you.`}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((item) => {
            const isRead = readIds.has(item.id);
            const isBookmarked = bookmarkedIds.has(item.id);
            return (
              <div
                key={item.id}
                className={`${styles.card} ${!isRead ? styles.cardUnread : ''}`}
                onClick={() => openItem(item)}
              >
                {/* Thumbnail */}
                <div
                  className={styles.thumb}
                  style={{ background: TYPE_GRADIENT[item.contentType] }}
                >
                  <span
                    className={styles.thumbIcon}
                    style={{ color: TYPE_ICON_COLOR[item.contentType] }}
                  >
                    {TYPE_ICONS[item.contentType]}
                  </span>
                  {!isRead && <div className={styles.unreadDot} />}
                </div>

                {/* Body */}
                <div className={styles.cardBody}>
                  <div className={styles.cardTag}>
                    {TYPE_LABELS[item.contentType]}
                  </div>
                  <div className={styles.cardTitle}>{item.title}</div>
                  {item.body && (
                    <div className={styles.cardPreview}>
                      {item.body.split('\n\n')[0]?.slice(0, 120)}
                      {(item.body.split('\n\n')[0]?.length ?? 0) > 120 ? '…' : ''}
                    </div>
                  )}
                  {item.contentType === 'document' && item.fileUrl && (
                    <div className={styles.cardPreview}>PDF document — tap to view</div>
                  )}

                  {/* Footer row */}
                  <div className={styles.cardFooter}>
                    <span className={styles.readTime}>
                      {item.estimatedReadMinutes} min read
                    </span>
                    <span className={styles.addedDate}>{formatDate(item.createdAt)}</span>
                    <button
                      className={`${styles.bookmarkBtn} ${isBookmarked ? styles.bookmarkActive : ''}`}
                      onClick={(e) => toggleBookmark(item.id, e)}
                      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                    >
                      {isBookmarked ? '✦' : '✧'}
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: isRead ? '100%' : '0%' }}
                    />
                  </div>
                  <div className={styles.progressLabel}>
                    {isRead ? 'Read ✓' : 'Not yet read'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Article reader modal */}
      {selectedItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setSelectedItem(null)}>
              ✕
            </button>

            <div className={styles.modalHeader}>
              <div
                className={styles.modalThumb}
                style={{ background: TYPE_GRADIENT[selectedItem.contentType] }}
              >
                <span style={{ color: TYPE_ICON_COLOR[selectedItem.contentType], fontSize: '28px' }}>
                  {TYPE_ICONS[selectedItem.contentType]}
                </span>
              </div>
              <div>
                <div className={styles.modalTag}>{TYPE_LABELS[selectedItem.contentType]}</div>
                <h2 className={styles.modalTitle}>{selectedItem.title}</h2>
                <div className={styles.modalMeta}>
                  {selectedItem.estimatedReadMinutes} min read
                  &nbsp;·&nbsp;
                  Added {formatDate(selectedItem.createdAt)}
                </div>
              </div>
            </div>

            <div className={styles.modalBody}>
              {selectedItem.body
                ? selectedItem.body.split('\n\n').map((para, i) => (
                    <p key={i} className={styles.modalPara}>{para}</p>
                  ))
                : <p className={styles.modalPara}>No content available.</p>}
            </div>

            <div className={styles.modalFooter}>
              <span className={styles.readBadge}>Read ✓</span>
              <button
                className={`${styles.bookmarkBtn} ${bookmarkedIds.has(selectedItem.id) ? styles.bookmarkActive : ''}`}
                onClick={(e) => toggleBookmark(selectedItem.id, e)}
              >
                {bookmarkedIds.has(selectedItem.id) ? '✦ Bookmarked' : '✧ Bookmark'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
