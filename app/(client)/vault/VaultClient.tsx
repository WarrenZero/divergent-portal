'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import styles from './Vault.module.css';

// ─── Types ────────────────────────────────────────────────────────

export interface VaultItem {
  id: string;
  title: string;
  contentType: 'article' | 'document' | 'protocol_resource' | 'clinical_science' | 'book_recommendation';
  body: string | null;
  fileUrl: string | null;
  estimatedReadMinutes: number;
  isRead: boolean;
  isBookmarked: boolean;
  createdAt: string;
}

export interface DomainScore {
  domainId: string;
  name: string;
  burden: number;
}

interface Props {
  items: VaultItem[];
  firstName: string;
  practitionerName: string;
  domainScores?: DomainScore[];
}

type FilterTab = 'for_you' | 'foundations' | 'all' | 'article' | 'document' | 'protocol_resource' | 'clinical_science' | 'book_recommendation';

// ─── Helpers ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<VaultItem['contentType'], string> = {
  article:            'Article',
  document:           'Document',
  protocol_resource:  'Protocol',
  clinical_science:   'Clinical Science',
  book_recommendation: 'Book',
};

const TYPE_ICONS: Record<VaultItem['contentType'], string> = {
  article:            '⚘',
  document:           '◈',
  protocol_resource:  '✦',
  clinical_science:   '⚗',
  book_recommendation: '📚',
};

const TYPE_GRADIENT: Record<VaultItem['contentType'], string> = {
  article:            'linear-gradient(135deg, var(--pine-100), var(--pine-200))',
  document:           'linear-gradient(135deg, var(--copper-100), var(--copper-200))',
  protocol_resource:  'linear-gradient(135deg, var(--pine-800), var(--pine-600))',
  clinical_science:   'linear-gradient(135deg, #1E3122, #3A5C42)',
  book_recommendation: 'linear-gradient(135deg, var(--copper-100), #F5E0CC)',
};

const TYPE_ICON_COLOR: Record<VaultItem['contentType'], string> = {
  article:            'var(--pine-600)',
  document:           'var(--copper-600)',
  protocol_resource:  'var(--pine-100)',
  clinical_science:   'var(--copper-300)',
  book_recommendation: 'var(--copper-700)',
};

// Domain → content keyword matching map
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  gi:           ['Digestion', 'Gut'],
  blood_sugar:  ['Blood Sugar', 'Why We Get Sick'],
  adrenal:      ['Adrenal', 'Zebras'],
  thyroid:      ['Hormone'],
  fatty_acids:  ['Omega', 'Essential Fats'],
  minerals:     ['Nourishing', 'K2'],
  vitamins:     ['Vitamin', 'K2'],
  immune:       ['Immune', 'Defense'],
  liver:        ['Liver', 'Clean'],
  neurological: ['Mind', 'Body Keeps'],
  protein:      ['Protein', 'Primal'],
};

function itemMatchesDomain(title: string, domainId: string): boolean {
  const keywords = DOMAIN_KEYWORDS[domainId] ?? [];
  return keywords.some((kw) => title.includes(kw));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────

export default function VaultClient({
  items,
  firstName,
  practitionerName,
  domainScores = [],
}: Props) {
  const [filter, setFilter] = useState<FilterTab>('for_you');
  const [search, setSearch] = useState('');
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.isRead).map((i) => i.id)),
  );
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.isBookmarked).map((i) => i.id)),
  );
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [copiedInsight, setCopiedInsight] = useState(false);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Top 3 domain IDs by burden for recommendations
  const topDomainIds = useMemo(
    () =>
      [...domainScores]
        .sort((a, b) => b.burden - a.burden)
        .slice(0, 3)
        .map((d) => d.domainId),
    [domainScores],
  );

  // ── Filtered list ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...items];

    if (filter === 'for_you') {
      list = list.filter((i) => i.contentType !== 'clinical_science');
      // Sort recommended items to top
      if (topDomainIds.length > 0) {
        list.sort((a, b) => {
          const aMatch = topDomainIds.some((d) => itemMatchesDomain(a.title, d));
          const bMatch = topDomainIds.some((d) => itemMatchesDomain(b.title, d));
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });
      }
    } else if (filter === 'foundations') {
      list = list.filter(
        (i) => i.contentType === 'article' || i.contentType === 'book_recommendation',
      );
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (filter !== 'all') {
      list = list.filter((i) => i.contentType === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q));
    }

    return list;
  }, [items, filter, search, topDomainIds]);

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
    setScrollProgress(0);
    setSelectedText('');
    markAsRead(item.id);
  }

  // ── Modal scroll progress ───────────────────────────────────────
  const handleModalScroll = useCallback(() => {
    const el = modalBodyRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const progress = scrollHeight <= clientHeight ? 100 : (scrollTop / (scrollHeight - clientHeight)) * 100;
    setScrollProgress(Math.min(100, progress));
  }, []);

  // ── Text selection copy ─────────────────────────────────────────
  function handleTextSelect() {
    const sel = window.getSelection()?.toString().trim() ?? '';
    setSelectedText(sel);
    setCopiedInsight(false);
  }

  async function copySelectedText() {
    if (!selectedText) return;
    try {
      await navigator.clipboard.writeText(selectedText);
      setCopiedInsight(true);
      setTimeout(() => setCopiedInsight(false), 2000);
    } catch {
      // non-fatal
    }
  }

  // ── Related book ────────────────────────────────────────────────
  function findRelatedBook(article: VaultItem): VaultItem | null {
    if (article.contentType !== 'article') return null;
    const titleWords = article.title.toLowerCase().split(/\s+/);
    const book = items.find(
      (i) =>
        i.contentType === 'book_recommendation' &&
        titleWords.some((w) => w.length > 4 && i.title.toLowerCase().includes(w)),
    );
    return book ?? null;
  }

  // ── Tab count helper ────────────────────────────────────────────
  function tabCount(tab: FilterTab): number {
    if (tab === 'all') return items.length;
    if (tab === 'for_you') return items.filter((i) => i.contentType !== 'clinical_science').length;
    if (tab === 'foundations') return items.filter((i) => i.contentType === 'article' || i.contentType === 'book_recommendation').length;
    return items.filter((i) => i.contentType === tab).length;
  }

  const isItemRecommended = (item: VaultItem) =>
    filter === 'for_you' && topDomainIds.some((d) => itemMatchesDomain(item.title, d));

  const tabs: FilterTab[] = ['for_you', 'foundations', 'all', 'article', 'book_recommendation', 'document', 'protocol_resource', 'clinical_science'];

  const tabLabel = (tab: FilterTab): string => {
    if (tab === 'all') return 'All';
    if (tab === 'for_you') return 'For You';
    if (tab === 'foundations') return 'Foundations';
    return TYPE_LABELS[tab as VaultItem['contentType']];
  };

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
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${filter === tab ? styles.tabActive : ''}`}
              onClick={() => setFilter(tab)}
            >
              {tabLabel(tab)}
              <span className={styles.tabCount}>{tabCount(tab)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Foundations section headers */}
      {filter === 'foundations' && filtered.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <p style={{
            fontFamily: 'Lora, Georgia, serif',
            fontStyle: 'italic',
            fontSize: 13,
            color: 'var(--bone-600)',
            marginBottom: 16,
          }}>
            Foundation articles and recommended books — the core knowledge behind your protocol.
          </p>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {search
            ? 'No resources match your search.'
            : filter === 'for_you'
            ? `Warren will add resources here as your protocol progresses — articles, guides, and tools chosen just for you.`
            : filter !== 'all'
            ? `No ${tabLabel(filter).toLowerCase()} resources in your vault yet.`
            : `Warren will add resources here as your protocol progresses — articles, guides, and tools chosen just for you.`}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((item) => {
            const isRead = readIds.has(item.id);
            const isBookmarked = bookmarkedIds.has(item.id);
            const recommended = isItemRecommended(item);
            return (
              <div
                key={item.id}
                className={`${styles.card} ${!isRead ? styles.cardUnread : ''}`}
                onClick={() => openItem(item)}
                style={{ position: 'relative' }}
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
                  {!isRead && (
                    <div className={styles.unreadDotWrap}>
                      <div className={styles.unreadDot} />
                      <span className={styles.unreadNewLabel}>NEW</span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className={styles.cardBody}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div className={styles.cardTag}>
                      {TYPE_LABELS[item.contentType]}
                    </div>
                    {recommended && (
                      <span style={{
                        background: 'var(--copper-500)',
                        color: '#FDFAF5',
                        fontSize: 9,
                        fontFamily: 'Syne, sans-serif',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: 20,
                        whiteSpace: 'nowrap',
                      }}>
                        For You
                      </span>
                    )}
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

            {/* Scroll progress bar */}
            <div style={{
              position: 'sticky',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'var(--pine-800)',
              zIndex: 10,
              borderRadius: '3px 3px 0 0',
            }}>
              <div style={{
                height: '100%',
                width: `${scrollProgress}%`,
                background: 'var(--copper-500)',
                borderRadius: 3,
                transition: 'width 100ms linear',
              }} />
            </div>

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
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div className={styles.modalTag}>{TYPE_LABELS[selectedItem.contentType]}</div>
                  <span style={{
                    fontFamily: 'Lora, Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: 12,
                    color: 'var(--bone-600)',
                  }}>
                    {selectedItem.estimatedReadMinutes} min read
                  </span>
                </div>
                <h2 className={styles.modalTitle}>{selectedItem.title}</h2>
                <div className={styles.modalMeta}>
                  Added {formatDate(selectedItem.createdAt)}
                </div>
              </div>
            </div>

            <div
              className={styles.modalBody}
              ref={modalBodyRef}
              onScroll={handleModalScroll}
              onMouseUp={handleTextSelect}
            >
              {selectedItem.body
                ? selectedItem.body.split('\n\n').map((para, i) => (
                    <p key={i} className={styles.modalPara}>{para}</p>
                  ))
                : <p className={styles.modalPara}>No content available.</p>}
            </div>

            {/* Copy selected text button */}
            {selectedText && (
              <div style={{
                position: 'sticky',
                bottom: 80,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <button
                  onClick={copySelectedText}
                  style={{
                    pointerEvents: 'all',
                    background: 'var(--pine-800)',
                    border: '1px solid var(--copper-500)',
                    color: 'var(--copper-300)',
                    fontFamily: 'Syne, sans-serif',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    padding: '6px 14px',
                    borderRadius: 20,
                    cursor: 'pointer',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                  }}
                >
                  {copiedInsight ? 'Copied ✓' : 'Copy this insight'}
                </button>
              </div>
            )}

            <div className={styles.modalFooter}>
              <button
                style={{
                  background: readIds.has(selectedItem.id) ? 'var(--pine-600)' : 'var(--copper-500)',
                  color: '#FDFAF5',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: 'Syne, sans-serif',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '8px 18px',
                  cursor: readIds.has(selectedItem.id) ? 'default' : 'pointer',
                  opacity: readIds.has(selectedItem.id) ? 0.7 : 1,
                }}
                disabled={readIds.has(selectedItem.id)}
                onClick={() => markAsRead(selectedItem.id)}
              >
                {readIds.has(selectedItem.id) ? 'Completed ✓' : 'Mark as complete'}
              </button>

              <button
                className={`${styles.bookmarkBtn} ${bookmarkedIds.has(selectedItem.id) ? styles.bookmarkActive : ''}`}
                onClick={(e) => toggleBookmark(selectedItem.id, e)}
              >
                {bookmarkedIds.has(selectedItem.id) ? '✦ Bookmarked' : '✧ Bookmark'}
              </button>
            </div>

            {/* Related book */}
            {(() => {
              const relatedBook = findRelatedBook(selectedItem);
              if (!relatedBook) return null;
              return (
                <div style={{ padding: '0 24px 24px' }}>
                  <div style={{
                    borderTop: '1px solid var(--bone-300)',
                    paddingTop: 16,
                    marginTop: 0,
                  }}>
                    <div style={{
                      fontFamily: 'Syne, sans-serif',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--copper-500)',
                      marginBottom: 10,
                    }}>
                      Related Reading
                    </div>
                    <button
                      onClick={() => openItem(relatedBook)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'var(--bone-100)',
                        border: '1px solid var(--bone-300)',
                        borderRadius: 8,
                        padding: '10px 14px',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>📚</span>
                      <div>
                        <div style={{
                          fontFamily: 'Syne, sans-serif',
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'var(--copper-700)',
                          marginBottom: 2,
                        }}>
                          Related Book
                        </div>
                        <div style={{
                          fontFamily: 'Lora, Georgia, serif',
                          fontSize: 13,
                          color: 'var(--bone-800)',
                        }}>
                          {relatedBook.title}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
