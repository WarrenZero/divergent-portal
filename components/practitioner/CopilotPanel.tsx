'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';
import styles from './CopilotPanel.module.css';

// ─── Types ────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface Props {
  clientId?: string;
}

// ─── Markdown renderer ────────────────────────────────────────
// Converts the subset of markdown Claude produces into safe HTML.
// HTML entities are escaped first so no user-supplied content can
// inject tags — the only HTML present is what we explicitly add.

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_([^_\s][^_]*)_/g, '<em>$1</em>');
}

function renderMarkdown(raw: string): string {
  // 1. Escape HTML to prevent injection
  const safe = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = safe.split('\n');
  const out: string[] = [];
  const listBuf: string[] = [];

  function flushList() {
    if (listBuf.length) {
      out.push(`<ul>${listBuf.splice(0).join('')}</ul>`);
    }
  }

  for (const line of lines) {
    // Bullet line
    const bullet = line.match(/^[-*•]\s+(.+)/);
    if (bullet) { listBuf.push(`<li>${applyInline(bullet[1])}</li>`); continue; }
    flushList();

    // Header (## or #)
    const heading = line.match(/^#{1,3}\s+(.+)/);
    if (heading) {
      out.push(`<strong style="display:block;margin-bottom:4px">${applyInline(heading[1])}</strong>`);
      continue;
    }

    // Empty line — skip (CSS margin handles visual spacing between blocks)
    if (!line.trim()) continue;

    // Regular paragraph line
    out.push(`<p>${applyInline(line)}</p>`);
  }
  flushList();
  return out.join('');
}

// ─── Name helpers ─────────────────────────────────────────────

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function welcomeGreeting(firstName: string | null | undefined): string {
  const base = timeGreeting();
  return firstName ? `${base}, ${firstName}.` : `${base}.`;
}

function userInitials(firstName: string | null | undefined, lastName: string | null | undefined): string {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

// ─── Suggested prompts (mirror v11 welcome message) ───────────

const SUGGESTED_PROMPTS = [
  "Walk me through a client's HTMA — I see slow oxidation but want a second pair of eyes on the mineral ratios.",
  "I want to put a slow oxidizer on a high-dose cruciferous protocol for liver detox. Thoughts?",
  "Help me think through SDA macro ratios for fast vs slow metabolic types.",
];

// ─── Component ────────────────────────────────────────────────

export default function CopilotPanel({ clientId }: Props) {
  const { user, isLoaded } = useUser();
  const firstName = user?.firstName ?? null;
  const lastName = user?.lastName ?? null;
  const initials = userInitials(firstName, lastName);
  const router = useRouter();

  // Derive clientId from the current URL when not passed as a prop
  // e.g. /clients/abc-123-... → 'abc-123-...'
  const pathname = usePathname();
  const urlClientId = pathname.match(/\/clients\/([^/]+)/)?.[1] ?? null;
  const effectiveClientId = clientId ?? urlClientId;

  // Dev-only: surface what Clerk actually resolved so missing names are obvious
  useEffect(() => {
    if (isLoaded && process.env.NODE_ENV === 'development') {
      console.log('[CopilotPanel] Clerk user resolved:', {
        firstName,
        lastName,
        email: user?.primaryEmailAddress?.emailAddress,
      });
    }
  }, [isLoaded, firstName, lastName, user]);

  const [isOpen, setIsOpen] = useState(false);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; base64: string } | null>(null);
  const [expandedDepthIds, setExpandedDepthIds] = useState<Set<string>>(new Set());
  const [depthContent, setDepthContent] = useState<Map<string, string>>(new Map());
  const [depthLoading, setDepthLoading] = useState<Set<string>>(new Set());

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);
  // Track up to which message count we've already generated a summary
  const summarizedUpToRef = useRef(0);

  // ─── Clinical notes auto-summary ─────────────────────────────

  function fireSummary(msgs: Message[]): Promise<Response> | null {
    const history = msgs
      .filter((m) => !m.streaming)
      .map((m) => ({ role: m.role, content: m.content }));
    if (history.length < 2) return null;
    return fetch('/api/clinical-notes/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, clientId: effectiveClientId }),
    });
  }

  // ─── Go Deeper ───────────────────────────────────────────────

  async function handleGoDeeper(msgId: string, msgContent: string) {
    setDepthLoading((prev) => new Set(prev).add(msgId));
    setExpandedDepthIds((prev) => new Set(prev).add(msgId));

    const depthPrompt = 'Expand on the clinical and biochemical mechanisms behind your previous response. Include relevant mineral ratios, pathway interactions, and research context. Write for a knowledgeable practitioner or health-literate client.';

    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: msgContent }, // anchor context
      { role: 'user' as const, content: depthPrompt },
    ];

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, clientId: effectiveClientId }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event: { type: string; content?: string };
          try { event = JSON.parse(line.slice(6)); } catch { continue; }
          if (event.type === 'delta' && event.content) accumulated += event.content;
        }
      }
      setDepthContent((prev) => new Map(prev).set(msgId, accumulated));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load clinical depth.';
      setDepthContent((prev) => new Map(prev).set(msgId, msg));
    } finally {
      setDepthLoading((prev) => { const next = new Set(prev); next.delete(msgId); return next; });
    }
  }

  // ─── Copy individual message ──────────────────────────────────

  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  async function handleCopyMsg(id: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const el = document.createElement('textarea');
      el.value = content;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId((prev) => (prev === id ? null : prev)), 2000);
  }

  // Trigger on panel close (if new messages since last summary)
  useEffect(() => {
    if (!isOpen && messages.length >= 2 && messages.length > summarizedUpToRef.current) {
      fireSummary(messages);
      summarizedUpToRef.current = messages.length;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Trigger every 10 completed messages (≈ 5 exchanges)
  const completedCount = messages.filter((m) => !m.streaming).length;
  useEffect(() => {
    if (completedCount > 0 && completedCount % 10 === 0 && completedCount > summarizedUpToRef.current) {
      fireSummary(messages);
      summarizedUpToRef.current = completedCount;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedCount]);

  // ─── Auto-scroll body on new content ─────────────────────────
  const scrollToBottom = useCallback(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);

  function nextId() {
    return String(++idCounter.current);
  }

  function requestClose() {
    if (messages.length >= 2) {
      setSavePromptOpen(true);
    } else {
      setIsOpen(false);
    }
  }

  function toggle() {
    if (isOpen) {
      requestClose();
    } else {
      setIsOpen(true);
    }
  }

  async function handleSaveAndClose() {
    const promise = fireSummary(messages);
    summarizedUpToRef.current = messages.length;
    setSavePromptOpen(false);
    setIsOpen(false);
    if (promise) {
      await promise;
      router.refresh();
    }
  }

  function handleDismissAndClose() {
    setSavePromptOpen(false);
    setIsOpen(false);
  }

  function handleSuggest(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  // Auto-resize textarea
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setAttachment({ name: file.name, base64 });
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be reattached later
    e.target.value = '';
  }

  async function handleSend() {
    const text = input.trim();
    if ((!text && !attachment) || isStreaming) return;

    // Reset input height
    if (inputRef.current) {
      inputRef.current.style.height = '38px';
    }
    setInput('');

    // Capture and clear attachment before async work
    const pendingAttachment = attachment;
    setAttachment(null);

    // Append user message
    const displayText = text || `[PDF: ${pendingAttachment?.name}]`;
    const userMsg: Message = { id: nextId(), role: 'user', content: displayText };
    const aiMsgId = nextId();

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: aiMsgId, role: 'assistant', content: '', streaming: true },
    ]);
    setIsStreaming(true);

    // Build conversation history for API
    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: displayText },
    ];

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, clientId, attachment: pendingAttachment }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);

          let event: { type: string; content?: string; message?: string };
          try { event = JSON.parse(jsonStr); } catch { continue; }

          if (event.type === 'delta' && event.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? { ...m, content: m.content + event.content }
                  : m,
              ),
            );
          } else if (event.type === 'error') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? { ...m, content: event.message ?? 'An error occurred.', streaming: false }
                  : m,
              ),
            );
          } else if (event.type === 'done') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, streaming: false } : m,
              ),
            );
          }
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Connection error.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: errMsg, streaming: false }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() || attachment) handleSend();
    }
  }

  const showWelcome = messages.length === 0;

  return (
    <>
      {/* ─── Floating Action Button ─── */}
      <button
        className={`${styles.fab} ${isOpen ? styles.fabOpen : ''}`}
        onClick={toggle}
        aria-label={isOpen ? 'Close Clinical Co-Pilot' : 'Open Clinical Co-Pilot'}
        aria-expanded={isOpen}
      >
        <span className={styles.fabIcon}>✦</span>
        <span className={styles.fabDot} aria-hidden="true" />
      </button>

      {/* ─── Chat Panel ─── */}
      <div
        className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}
        role="dialog"
        aria-label="Clinical Co-Pilot"
        aria-modal="false"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.avatar}>DC</div>
          <div className={styles.titleBlock}>
            <div className={styles.title}>Divergent Clinical Co-Pilot</div>
            <div className={styles.status}>
              {isStreaming
                ? 'Reasoning…'
                : `${firstName ? `${firstName} · ` : ''}HTMA + metabolic typing engine online`}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={toggle} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Message body */}
        <div className={styles.body} ref={bodyRef}>
          {/* Welcome / empty state — defer until Clerk has resolved */}
          {showWelcome && isLoaded && (
            <div className={styles.msg}>
              <div className={`${styles.msgAvatar} ${styles.msgAvatarAi}`}>DC</div>
              <div>
                <div
                  className={styles.bubble}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(
                      `${welcomeGreeting(firstName)} I'm your clinical reasoning partner — here to help you connect HTMA patterns to protocols, and to flag friction before it becomes inflammation.\n\nWhat are we looking at today?`
                    ),
                  }}
                />
                <div className={styles.suggest}>
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      className={styles.suggestBtn}
                      onClick={() => handleSuggest(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conversation messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.msg} ${msg.role === 'user' ? styles.msgUser : ''}`}
            >
              <div
                className={`${styles.msgAvatar} ${
                  msg.role === 'assistant' ? styles.msgAvatarAi : styles.msgAvatarUser
                }`}
              >
                {msg.role === 'assistant' ? 'DC' : initials}
              </div>

              {/* Show typing indicator for empty streaming bubble */}
              {msg.role === 'assistant' && msg.streaming && msg.content === '' ? (
                <div className={styles.typing}>
                  <div className={styles.typingDot} />
                  <div className={styles.typingDot} />
                  <div className={styles.typingDot} />
                </div>
              ) : msg.role === 'assistant' ? (
                // AI messages: render markdown as HTML, with hover copy button
                <div className={styles.bubbleWrap}>
                  <div
                    className={styles.bubble}
                    dangerouslySetInnerHTML={{
                      __html:
                        renderMarkdown(msg.content) +
                        (msg.streaming && msg.content
                          ? '<span aria-hidden="true" style="opacity:0.5">▋</span>'
                          : ''),
                    }}
                  />
                  {!msg.streaming && (
                    <button
                      className={styles.copyMsgBtn}
                      onClick={() => handleCopyMsg(msg.id, msg.content)}
                      aria-label="Copy message"
                      title={copiedMsgId === msg.id ? 'Copied!' : 'Copy'}
                    >
                      {copiedMsgId === msg.id ? '✓' : (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                  )}
                  {!msg.streaming && !expandedDepthIds.has(msg.id) && (
                    <button
                      onClick={() => handleGoDeeper(msg.id, msg.content)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '11px', color: 'var(--pine-400)',
                        fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic',
                        padding: '4px 0', display: 'block', textAlign: 'left',
                      }}
                    >
                      ↓ Clinical science behind this →
                    </button>
                  )}
                  {expandedDepthIds.has(msg.id) && (
                    <div style={{
                      background: 'var(--pine-100)', borderLeft: '2px solid var(--pine-400)',
                      padding: '10px 12px', marginTop: '6px',
                    }}>
                      <div style={{
                        fontFamily: "'Syne', sans-serif", fontWeight: 700,
                        fontSize: '10px', color: 'var(--pine-500)', marginBottom: '6px',
                      }}>
                        ✦ Clinical depth
                      </div>
                      {depthLoading.has(msg.id) ? (
                        <span style={{ fontSize: '11px', color: 'var(--pine-400)', fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic' }}>
                          Reasoning…
                        </span>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(depthContent.get(msg.id) ?? '') }} />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // User messages: plain text, no markdown processing
                <div className={`${styles.bubble} ${styles.bubbleUser}`}>
                  {msg.content}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Hidden PDF file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Attachment pill — shown when a PDF is staged */}
        {attachment && (
          <div className={styles.attachBar}>
            <div className={styles.attachPill}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className={styles.attachPillName}>{attachment.name}</span>
              <button
                className={styles.attachPillRemove}
                onClick={() => setAttachment(null)}
                aria-label="Remove attachment"
                type="button"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className={styles.inputBar}>
          <button
            className={styles.attachBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            aria-label="Attach PDF"
            type="button"
            title="Attach PDF"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            className={styles.input}
            placeholder="Ask the Co-Pilot…"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck
            disabled={isStreaming}
            aria-label="Message input"
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={isStreaming || (!input.trim() && !attachment)}
            aria-label="Send message"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

        <div className={styles.foot}>
          Divergent Clinical Co-Pilot · claude-sonnet-4-6 · 20% guardrail active
        </div>

        {/* ── Save conversation prompt ── */}
        {savePromptOpen && (
          <div className={styles.saveSheet}>
            <div className={styles.saveSheetTitle}>
              Save this conversation to My Notes?
            </div>
            <div className={styles.saveSheetActions}>
              <button className={styles.saveSheetYes} onClick={handleSaveAndClose}>
                Yes
              </button>
              <button className={styles.saveSheetNo} onClick={handleDismissAndClose}>
                No
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
