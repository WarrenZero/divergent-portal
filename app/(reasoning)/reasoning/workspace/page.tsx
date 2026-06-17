'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './workspace.module.css';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  title: string;
  client_reference: string | null;
  conversation_type: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  attached_files: AttachedFileRef[];
  created_at: string;
}

interface AttachedFileRef {
  id: string;
  name: string;
}

interface AttachedFile {
  id: string;
  name: string;
  content?: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  client_reference: string | null;
  entry_date: string;
  entry_time: string | null;
  note_type: string;
  is_pinned: boolean;
  tags: string[] | null;
  created_at: string;
}

interface ReasoningFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_category: string;
  client_reference: string | null;
  entry_date: string;
  content_extracted: string | null;
  created_at: string;
}

interface Subscription {
  status: string;
  trial_ends_at: string;
  tier: string;
}

interface Profile {
  full_name: string | null;
  intelligence_level: string;
  information_style: string | null;
  labs_ordered: string[] | null;
  primary_conditions: string[] | null;
  onboarding_complete: boolean;
}

interface NoteFormData {
  title: string;
  content: string;
  client_reference: string;
  entry_date: string;
  entry_time: string;
  note_type: string;
  is_pinned: boolean;
  tags: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileIcon(type: string, category: string): string {
  if (category === 'htma_report') return '🧪';
  if (category === 'recording') return '🎙';
  if (type.startsWith('image/')) return '🖼';
  if (type === 'application/pdf') return '📄';
  if (type.startsWith('audio/')) return '🎙';
  return '📝';
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    htma_review: 'HTMA',
    lab_interpretation: 'Labs',
    protocol_building: 'Protocol',
    case_review: 'Case',
    research: 'Research',
    general: 'General',
  };
  return labels[type] ?? type;
}

function trialDaysRemaining(endsAt: string): number {
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function buildSuggestedPrompts(profile: Profile | null): string[] {
  const prompts: string[] = [];
  const labs = profile?.labs_ordered ?? [];
  const conditions = profile?.primary_conditions ?? [];

  if (labs.includes('HTMA')) {
    prompts.push('Walk me through a slow oxidizer pattern with elevated calcium');
  }
  if (labs.includes('DUTCH Hormone Panel')) {
    prompts.push('Help me interpret cortisol awakening response patterns');
  }
  if (conditions.includes('Thyroid')) {
    prompts.push('Review a thyroid case — low T3, normal TSH, high reverse T3');
  }
  if (conditions.includes('GI dysfunction')) {
    prompts.push('Build a phase 1 GI repair protocol for leaky gut');
  }

  const defaults = [
    'Review an HTMA report with me',
    'Help me build a protocol for a new client',
    'What does a high Na/K ratio indicate clinically?',
    'Walk me through a complex case with multiple mineral imbalances',
  ];

  while (prompts.length < 4) {
    const next = defaults[prompts.length];
    if (next && !prompts.includes(next)) prompts.push(next);
    else break;
  }

  return prompts.slice(0, 4);
}

// ─── Main component ────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [activeRightTab, setActiveRightTab] = useState<'notes' | 'files'>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<ReasoningFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState<NoteFormData>({
    title: '',
    content: '',
    client_reference: '',
    entry_date: new Date().toISOString().split('T')[0],
    entry_time: new Date().toTimeString().slice(0, 5),
    note_type: 'general',
    is_pinned: false,
    tags: '',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Initial data load ───────────────────────────────────────────────────

  useEffect(() => {
    void Promise.all([
      loadConversations(),
      loadNotes(),
      loadFiles(),
      loadSubscriptionAndProfile(),
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedContent]);

  async function loadConversations() {
    try {
      const res = await fetch('/api/reasoning/conversations');
      if (res.ok) {
        const data = await res.json() as { conversations: Conversation[] };
        setConversations(data.conversations ?? []);
      }
    } catch { /* non-fatal */ }
  }

  async function loadNotes() {
    try {
      const res = await fetch('/api/reasoning/notes');
      if (res.ok) {
        const data = await res.json() as { notes: Note[] };
        setNotes(data.notes ?? []);
      }
    } catch { /* non-fatal */ }
  }

  async function loadFiles() {
    try {
      const res = await fetch('/api/reasoning/files');
      if (res.ok) {
        const data = await res.json() as { files: ReasoningFile[] };
        setFiles(data.files ?? []);
      }
    } catch { /* non-fatal */ }
  }

  async function loadSubscriptionAndProfile() {
    try {
      const [profRes] = await Promise.all([
        fetch('/api/reasoning/profile'),
      ]);
      if (profRes.ok) {
        const data = await profRes.json() as { profile: Profile; subscription: Subscription };
        setProfile(data.profile ?? null);
        setSubscription(data.subscription ?? null);
      }
    } catch { /* non-fatal */ }
  }

  async function loadConversationMessages(conv: Conversation) {
    setActiveConversation(conv);
    setMessages([]);
    setInput('');
    setAttachments([]);
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/reasoning/conversations/${conv.id}`);
      if (res.ok) {
        const data = await res.json() as { conversation: Conversation; messages: Message[] };
        setMessages(data.messages ?? []);
        // Scroll to bottom after messages populate
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    } catch { /* non-fatal */ } finally {
      setIsLoadingMessages(false);
    }
  }

  // ── Conversation management ─────────────────────────────────────────────

  async function createNewConversation() {
    try {
      const res = await fetch('/api/reasoning/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New conversation', conversation_type: 'general' }),
      });
      if (res.ok) {
        const data = await res.json() as { conversation: Conversation };
        const conv = data.conversation;
        setConversations((prev) => [conv, ...prev]);
        setActiveConversation(conv);
        setMessages([]);
      }
    } catch { /* non-fatal */ }
  }

  async function updateConversationTitle(title: string) {
    if (!activeConversation) return;
    setActiveConversation((prev) => prev ? { ...prev, title } : prev);
    try {
      await fetch(`/api/reasoning/conversations/${activeConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      setConversations((prev) =>
        prev.map((c) => c.id === activeConversation.id ? { ...c, title } : c),
      );
    } catch { /* non-fatal */ }
  }

  async function updateConversationType(conversation_type: string) {
    if (!activeConversation) return;
    setActiveConversation((prev) => prev ? { ...prev, conversation_type } : prev);
    try {
      await fetch(`/api/reasoning/conversations/${activeConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_type }),
      });
    } catch { /* non-fatal */ }
  }

  async function updateClientReference(client_reference: string) {
    if (!activeConversation) return;
    setActiveConversation((prev) => prev ? { ...prev, client_reference } : prev);
    try {
      await fetch(`/api/reasoning/conversations/${activeConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_reference }),
      });
    } catch { /* non-fatal */ }
  }

  // ── Chat send ───────────────────────────────────────────────────────────

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming) return;

    // Ensure we have an active conversation
    let conv = activeConversation;
    if (!conv) {
      try {
        const res = await fetch('/api/reasoning/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: text.slice(0, 60), conversation_type: 'general' }),
        });
        if (res.ok) {
          const data = await res.json() as { conversation: Conversation };
          conv = data.conversation;
          setConversations((prev) => [conv!, ...prev]);
          setActiveConversation(conv);
        }
      } catch { return; }
    }

    if (!conv) return;

    const userMessage: Message = {
      id: `tmp-${Date.now()}`,
      conversation_id: conv.id,
      role: 'user',
      content: text,
      attached_files: attachments.map((a) => ({ id: a.id, name: a.name })),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsStreaming(true);
    setStreamedContent('');

    const historyMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text },
    ];

    // Build file context if attachments present
    const attachedFileContent = attachments
      .filter((a) => a.content)
      .map((a) => `[File: ${a.name}]\n${a.content}`)
      .join('\n\n');

    try {
      const res = await fetch('/api/reasoning/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyMessages,
          conversationId: conv.id,
          attachedFileContent: attachedFileContent || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as { type: string; content?: string };
            if (parsed.type === 'delta' && parsed.content) {
              assistantText += parsed.content;
              setStreamedContent(assistantText);
            } else if (parsed.type === 'done') {
              const assistantMsg: Message = {
                id: `tmp-asst-${Date.now()}`,
                conversation_id: conv!.id,
                role: 'assistant',
                content: assistantText,
                attached_files: [],
                created_at: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setStreamedContent('');
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === conv!.id
                    ? { ...c, message_count: c.message_count + 2, updated_at: new Date().toISOString() }
                    : c,
                ),
              );
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch { /* non-fatal */ } finally {
      setIsStreaming(false);
      setStreamedContent('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  // ── Save conversation to notes ──────────────────────────────────────────

  async function saveConversationToNotes() {
    if (!activeConversation || messages.length === 0) return;
    const content = messages
      .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
      .join('\n\n---\n\n');
    try {
      const res = await fetch('/api/reasoning/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeConversation.title,
          content,
          client_reference: activeConversation.client_reference,
          note_type: 'session_summary',
          entry_date: new Date().toISOString().split('T')[0],
          entry_time: new Date().toTimeString().slice(0, 5),
          is_pinned: false,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { note: Note };
        setNotes((prev) => [data.note, ...prev]);
        setActiveRightTab('notes');
      }
    } catch { /* non-fatal */ }
  }

  // ── Notes ───────────────────────────────────────────────────────────────

  async function saveNote() {
    try {
      const payload = {
        ...noteForm,
        tags: noteForm.tags ? noteForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      const res = await fetch('/api/reasoning/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json() as { note: Note };
        setNotes((prev) => {
          const updated = [data.note, ...prev];
          return [...updated.filter((n) => n.is_pinned), ...updated.filter((n) => !n.is_pinned)];
        });
        setShowNoteForm(false);
        setNoteForm({
          title: '',
          content: '',
          client_reference: '',
          entry_date: new Date().toISOString().split('T')[0],
          entry_time: new Date().toTimeString().slice(0, 5),
          note_type: 'general',
          is_pinned: false,
          tags: '',
        });
      }
    } catch { /* non-fatal */ }
  }

  async function deleteNote(id: string) {
    try {
      await fetch(`/api/reasoning/notes/${id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch { /* non-fatal */ }
  }

  async function togglePinNote(note: Note) {
    const updated = { ...note, is_pinned: !note.is_pinned };
    setNotes((prev) => {
      const next = prev.map((n) => n.id === note.id ? updated : n);
      return [...next.filter((n) => n.is_pinned), ...next.filter((n) => !n.is_pinned)];
    });
    try {
      await fetch(`/api/reasoning/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !note.is_pinned }),
      });
    } catch { /* non-fatal */ }
  }

  // ── Files ───────────────────────────────────────────────────────────────

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/reasoning/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_category: file.name.toLowerCase().includes('htma') ? 'htma_report' : 'general',
            entry_date: new Date().toISOString().split('T')[0],
          }),
        });
        if (res.ok) {
          const data = await res.json() as { file: ReasoningFile };
          setFiles((prev) => [data.file, ...prev]);
        }
      } catch { /* non-fatal */ }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function deleteFile(id: string) {
    try {
      await fetch(`/api/reasoning/files/${id}`, { method: 'DELETE' });
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch { /* non-fatal */ }
  }

  function useFileInChat(file: ReasoningFile) {
    setAttachments((prev) => {
      if (prev.some((a) => a.id === file.id)) return prev;
      return [...prev, {
        id: file.id,
        name: file.file_name ?? 'Unknown file',
        content: file.content_extracted ?? undefined,
      }];
    });
  }

  // ── Drag and drop ───────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    // Add as attachment for chat
    const reader = new FileReader();
    reader.onload = () => {
      setAttachments((prev) => [
        ...prev,
        { id: `drop-${Date.now()}`, name: file.name },
      ]);
    };
    reader.readAsText(file);
  }, []);

  // ── Copy message ────────────────────────────────────────────────────────

  function copyMessage(content: string) {
    void navigator.clipboard.writeText(content);
  }

  async function saveMessageAsNote(content: string) {
    try {
      const res = await fetch('/api/reasoning/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Note from conversation — ${formatDate(new Date().toISOString())}`,
          content,
          note_type: 'clinical_observation',
          client_reference: activeConversation?.client_reference ?? '',
          entry_date: new Date().toISOString().split('T')[0],
          entry_time: new Date().toTimeString().slice(0, 5),
          is_pinned: false,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { note: Note };
        setNotes((prev) => [data.note, ...prev]);
        setActiveRightTab('notes');
      }
    } catch { /* non-fatal */ }
  }

  // ── Suggested prompt click ──────────────────────────────────────────────

  function handlePromptClick(prompt: string) {
    setInput(prompt);
    textareaRef.current?.focus();
  }

  // ─── Compute derived values ─────────────────────────────────────────────

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Practitioner';
  const suggestedPrompts = buildSuggestedPrompts(profile);
  const showTrialBanner =
    subscription?.status === 'trial' &&
    trialDaysRemaining(subscription.trial_ends_at ?? '') <= 7;
  const trialDays = subscription?.trial_ends_at
    ? trialDaysRemaining(subscription.trial_ends_at)
    : 0;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className={styles.workspace}>
      {/* ── LEFT PANEL ── */}
      <div className={styles.leftPanel}>
        <div className={styles.leftPanelScroll}>
          <div className={styles.leftHeader}>
            <div className={styles.leftBrand}>✦ Divergent AI</div>
            <div className={styles.practitionerName}>{firstName}</div>
            {profile?.intelligence_level && (
              <span className={styles.intelligenceBadge}>
                {profile.intelligence_level}
              </span>
            )}
          </div>

          {showTrialBanner && (
            <div className={styles.trialBanner}>
              <span>{trialDays} day{trialDays !== 1 ? 's' : ''} left in trial</span>
              <span
                className={styles.trialBannerLink}
                onClick={() => router.push('/billing')}
              >
                Add card →
              </span>
            </div>
          )}

          <button className={styles.newConvoButton} onClick={() => void createNewConversation()}>
            <span style={{ fontSize: '16px' }}>+</span> New Conversation
          </button>

          {conversations.length > 0 && (
            <div className={styles.convListSection}>
              <div className={styles.convListLabel}>Conversations</div>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`${styles.convItem} ${activeConversation?.id === conv.id ? styles.convItemActive : ''}`}
                  onClick={() => void loadConversationMessages(conv)}
                >
                  <div className={styles.convTitle}>{conv.title}</div>
                  <div className={styles.convMeta}>
                    <span className={styles.convTypeBadge}>{getTypeLabel(conv.conversation_type)}</span>
                    <span className={styles.convDate}>{formatDate(conv.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.leftDivider} />

          <button
            className={styles.leftNavLink}
            onClick={() => { setActiveRightTab('files'); }}
          >
            📁 File Library
          </button>
          <button
            className={styles.leftNavLink}
            onClick={() => { setActiveRightTab('notes'); }}
          >
            📝 Notes
          </button>

          <div className={styles.leftDivider} />

          <div
            className={styles.upgradeSection}
            onClick={() => router.push('/billing')}
          >
            <div className={styles.upgradeTitle}>
              ⬆ Upgrade to Full Portal
            </div>
            <div className={styles.upgradeBody}>
              $129/month · Client management, protocols, lab parser & more
            </div>
          </div>

          <button className={styles.settingsLink} onClick={() => router.push('/reasoning/onboarding')}>
            ⚙ Settings / Update profile
          </button>
        </div>
      </div>

      {/* ── CENTER PANEL ── */}
      <div
        className={styles.centerPanel}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Top bar — only when conversation is active */}
        {activeConversation && (
          <div className={styles.centerTopBar}>
            <input
              className={styles.convoTitleInput}
              value={activeConversation.title}
              onChange={(e) => updateConversationTitle(e.target.value)}
              placeholder="Conversation title"
            />
            <select
              className={styles.typeSelect}
              value={activeConversation.conversation_type}
              onChange={(e) => void updateConversationType(e.target.value)}
            >
              <option value="general">General</option>
              <option value="htma_review">HTMA Review</option>
              <option value="lab_interpretation">Lab Interpretation</option>
              <option value="protocol_building">Protocol Building</option>
              <option value="case_review">Case Review</option>
              <option value="research">Research</option>
            </select>
            <input
              className={styles.clientRefInput}
              placeholder="Client reference"
              value={activeConversation.client_reference ?? ''}
              onChange={(e) => void updateClientReference(e.target.value)}
            />
            <button className={styles.saveNotesButton} onClick={() => void saveConversationToNotes()}>
              Save to Notes
            </button>
          </div>
        )}

        {/* Messages area */}
        <div className={styles.messagesArea}>
          {!activeConversation ? (
            // No conversation selected — landing empty state
            <div className={styles.emptyState}>
              <div className={styles.emptyGlyph}>✦</div>
              <h2 className={styles.emptyTitle}>
                What are you working through, {firstName}?
              </h2>
              <p className={styles.emptySubtitle}>
                <em>Start a conversation or pick a prompt below.</em>
              </p>
              <div className={styles.suggestedPrompts}>
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    className={styles.promptChip}
                    onClick={() => handlePromptClick(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : isLoadingMessages ? (
            // Conversation selected, messages loading
            <div className={styles.loadingState}>
              <span className={styles.glyphPulse}>✦</span>
              <p>Loading conversation…</p>
            </div>
          ) : messages.length === 0 ? (
            // Conversation selected, no messages yet
            <div className={styles.emptyState}>
              <div className={styles.emptyGlyph}>✦</div>
              <h2 className={styles.emptyTitle}>New conversation</h2>
              <p className={styles.emptySubtitle}>
                <em>Type your first message below to begin.</em>
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={styles.messageGroup}>
                  {msg.role === 'user' ? (
                    <div className={styles.userMessage}>
                      <div className={styles.userBubble}>{msg.content}</div>
                    </div>
                  ) : (
                    <div className={styles.assistantMessage}>
                      <div>
                        <div className={styles.assistantBubble}>
                          <span className={styles.assistantPrefix}>✦</span>
                          <span
                            dangerouslySetInnerHTML={{
                              __html: msg.content
                                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                                .replace(/\n/g, '<br />'),
                            }}
                          />
                        </div>
                        <div className={styles.assistantActions}>
                          <button
                            className={styles.assistantActionButton}
                            onClick={() => copyMessage(msg.content)}
                          >
                            Copy
                          </button>
                          <button
                            className={styles.assistantActionButton}
                            onClick={() => void saveMessageAsNote(msg.content)}
                          >
                            Save to notes →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isStreaming && (
                <div className={styles.streamingMessage}>
                  <div className={styles.streamingBubble}>
                    {streamedContent ? (
                      <>
                        <span className={styles.assistantPrefix}>✦</span>
                        <span
                          dangerouslySetInnerHTML={{
                            __html: streamedContent
                              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.+?)\*/g, '<em>$1</em>')
                              .replace(/\n/g, '<br />'),
                          }}
                        />
                      </>
                    ) : (
                      <div className={styles.streamingIndicator}>
                        <span className={styles.glyphPulse}>✦</span>
                        Reasoning through your case…
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className={styles.inputArea}>
          {attachments.length > 0 && (
            <div className={styles.attachmentChips}>
              {attachments.map((att) => (
                <div key={att.id} className={styles.attachChip}>
                  📎 {att.name}
                  <button
                    className={styles.attachChipRemove}
                    onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            className={styles.inputTextarea}
            placeholder="Ask anything — HTMA patterns, protocol questions, lab interpretation…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />

          <div className={styles.inputActions}>
            <div className={styles.inputTools}>
              <button
                className={styles.toolButton}
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
              >
                📎 Attach
              </button>
              <button className={styles.toolButton} title="Image">
                🖼 Image
              </button>
              <button className={styles.toolButton} title="Voice note">
                🎙 Voice
              </button>
              <button
                className={styles.toolButton}
                onClick={() => setActiveRightTab('notes')}
                title="From notes"
              >
                📝 Notes
              </button>
            </div>
            <button
              className={styles.sendButton}
              onClick={() => void sendMessage()}
              disabled={isStreaming || !input.trim()}
            >
              Send ✦
            </button>
          </div>
        </div>

        {/* Drag overlay */}
        {isDragOver && (
          <div className={styles.dragOverlay}>
            <div className={styles.dragOverlayInner}>
              <div className={styles.dragGlyph}>✦</div>
              <div className={styles.dragLabel}>Drop your file here ✦</div>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className={styles.rightPanel}>
        <div className={styles.rightTabs}>
          <button
            className={`${styles.rightTab} ${activeRightTab === 'notes' ? styles.rightTabActive : ''}`}
            onClick={() => setActiveRightTab('notes')}
          >
            Notes
          </button>
          <button
            className={`${styles.rightTab} ${activeRightTab === 'files' ? styles.rightTabActive : ''}`}
            onClick={() => setActiveRightTab('files')}
          >
            Files
          </button>
        </div>

        <div className={styles.rightPanelScroll}>
          {activeRightTab === 'notes' ? (
            <>
              <button
                className={styles.addButton}
                onClick={() => setShowNoteForm((v) => !v)}
              >
                + New Note
              </button>

              {showNoteForm && (
                <div className={styles.noteForm}>
                  <div className={styles.noteFormField}>
                    <label className={styles.noteFormLabel}>Title</label>
                    <input
                      className={styles.noteFormInput}
                      placeholder="Note title"
                      value={noteForm.title}
                      onChange={(e) => setNoteForm((p) => ({ ...p, title: e.target.value }))}
                    />
                  </div>

                  <div className={styles.noteFormField}>
                    <label className={styles.noteFormLabel}>Type</label>
                    <select
                      className={styles.noteFormSelect}
                      value={noteForm.note_type}
                      onChange={(e) => setNoteForm((p) => ({ ...p, note_type: e.target.value }))}
                    >
                      <option value="general">General</option>
                      <option value="session_summary">Session Summary</option>
                      <option value="clinical_observation">Clinical Observation</option>
                      <option value="protocol_note">Protocol Note</option>
                      <option value="research_note">Research Note</option>
                      <option value="client_update">Client Update</option>
                    </select>
                  </div>

                  <div className={styles.noteFormField}>
                    <label className={styles.noteFormLabel}>Client reference</label>
                    <input
                      className={styles.noteFormInput}
                      placeholder="Client name or initials"
                      value={noteForm.client_reference}
                      onChange={(e) => setNoteForm((p) => ({ ...p, client_reference: e.target.value }))}
                    />
                  </div>

                  <div className={styles.noteFormRow}>
                    <div className={styles.noteFormField}>
                      <label className={styles.noteFormLabel}>Date</label>
                      <input
                        type="date"
                        className={styles.noteFormInput}
                        value={noteForm.entry_date}
                        onChange={(e) => setNoteForm((p) => ({ ...p, entry_date: e.target.value }))}
                      />
                    </div>
                    <div className={styles.noteFormField}>
                      <label className={styles.noteFormLabel}>Time</label>
                      <input
                        type="time"
                        className={styles.noteFormInput}
                        value={noteForm.entry_time}
                        onChange={(e) => setNoteForm((p) => ({ ...p, entry_time: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className={styles.noteFormField}>
                    <label className={styles.noteFormLabel}>Content</label>
                    <textarea
                      className={styles.noteFormTextarea}
                      placeholder="Your clinical note…"
                      value={noteForm.content}
                      onChange={(e) => setNoteForm((p) => ({ ...p, content: e.target.value }))}
                    />
                  </div>

                  <div className={styles.noteFormField}>
                    <label className={styles.noteFormLabel}>Tags (comma-separated)</label>
                    <input
                      className={styles.noteFormInput}
                      placeholder="htma, thyroid, adrenal"
                      value={noteForm.tags}
                      onChange={(e) => setNoteForm((p) => ({ ...p, tags: e.target.value }))}
                    />
                  </div>

                  <div className={styles.noteFormPinRow}>
                    <span className={styles.noteFormPinLabel}>Pin this note</span>
                    <button
                      type="button"
                      className={styles.pinToggle}
                      onClick={() => setNoteForm((p) => ({ ...p, is_pinned: !p.is_pinned }))}
                    >
                      {noteForm.is_pinned ? '⭐' : '☆'}
                    </button>
                  </div>

                  <button className={styles.noteFormSave} onClick={() => void saveNote()}>
                    Save Note
                  </button>
                </div>
              )}

              {notes.map((note) => (
                <div key={note.id} className={styles.noteCard}>
                  <div className={styles.noteCardHeader}>
                    <div className={styles.noteCardTitle}>
                      {note.is_pinned && '⭐ '}{note.title || 'Untitled note'}
                    </div>
                    <div className={styles.noteCardActions}>
                      <button
                        className={styles.noteActionBtn}
                        onClick={() => void togglePinNote(note)}
                        title={note.is_pinned ? 'Unpin' : 'Pin'}
                      >
                        {note.is_pinned ? '★' : '☆'}
                      </button>
                      <button
                        className={styles.noteActionBtn}
                        onClick={() => void deleteNote(note.id)}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  <div className={styles.noteCardMeta}>
                    <span className={`${styles.noteTypeBadge} ${styles[note.note_type as keyof typeof styles] ?? ''}`}>
                      {note.note_type.replace(/_/g, ' ')}
                    </span>
                    {note.client_reference && (
                      <span className={styles.noteCardClient}>{note.client_reference}</span>
                    )}
                    <span className={styles.noteCardDate}>{formatDate(note.entry_date)}</span>
                  </div>
                  {note.content && (
                    <div className={styles.noteCardPreview}>{note.content}</div>
                  )}
                </div>
              ))}

              {notes.length === 0 && !showNoteForm && (
                <p style={{ fontSize: '13px', color: '#9A8A72', textAlign: 'center', marginTop: '24px', fontStyle: 'italic' }}>
                  No notes yet. Save a conversation or create one manually.
                </p>
              )}
            </>
          ) : (
            <>
              <button
                className={styles.addButton}
                onClick={() => fileInputRef.current?.click()}
              >
                + Upload File
              </button>

              {files.map((file) => (
                <div key={file.id} className={styles.fileCard}>
                  <div className={styles.fileCardHeader}>
                    <span className={styles.fileIcon}>{getFileIcon(file.file_type ?? '', file.file_category)}</span>
                    <span className={styles.fileCardName}>{file.file_name}</span>
                  </div>
                  <div className={styles.fileCardMeta}>
                    <span className={styles.fileCategoryBadge}>{file.file_category.replace(/_/g, ' ')}</span>
                    {file.client_reference && (
                      <span style={{ fontSize: '10px', color: '#C07848', fontFamily: 'var(--font-syne)' }}>
                        {file.client_reference}
                      </span>
                    )}
                    <span className={styles.fileCardDate}>{formatDate(file.entry_date)}</span>
                    <span className={styles.fileCardSize}>{formatFileSize(file.file_size ?? 0)}</span>
                  </div>
                  <div className={styles.fileCardActions}>
                    <button
                      className={`${styles.fileActionBtn} ${styles.primary}`}
                      onClick={() => useFileInChat(file)}
                    >
                      Use in chat →
                    </button>
                    <button
                      className={styles.fileActionBtn}
                      onClick={() => void deleteFile(file.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {files.length === 0 && (
                <p style={{ fontSize: '13px', color: '#9A8A72', textAlign: 'center', marginTop: '24px', fontStyle: 'italic' }}>
                  No files yet. Upload an HTMA report, lab result, or research document.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className={styles.hiddenInput}
        onChange={handleFileUpload}
        accept=".pdf,.txt,.csv,.png,.jpg,.jpeg,.mp3,.wav,.m4a"
      />
    </div>
  );
}
