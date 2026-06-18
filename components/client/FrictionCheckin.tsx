'use client';

import { useState, useEffect } from 'react';

// ─── Types ─────────────────────────────────────────────────────

interface Props {
  clientId: string;
  missedDays: number;
}

// ─── Friction reason chips ──────────────────────────────────────

const FRICTION_CHIPS = [
  'Life got hectic',
  'Felt overwhelmed',
  'Forgot',
  'Felt discouraged',
  'Supplements ran out',
  "Ashamed I haven't kept up",
  "Wasn't sure it was helping",
  'Needed a break',
] as const;

const DISMISS_KEY = (id: string) => `frictionDismissed_${id}`;
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Component ─────────────────────────────────────────────────

export default function FrictionCheckin({ clientId, missedDays }: Props) {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Only show if missed 2+ days and not dismissed in last 7 days
    if (missedDays < 2) return;
    const raw = localStorage.getItem(DISMISS_KEY(clientId));
    if (raw) {
      const ts = parseInt(raw, 10);
      if (!isNaN(ts) && Date.now() - ts < DISMISS_DURATION_MS) return;
    }
    setVisible(true);
  }, [clientId, missedDays]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY(clientId), String(Date.now()));
    setVisible(false);
  }

  function toggleChip(chip: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await fetch('/api/compliance/friction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          reasons: [...selected],
          note: note.trim() || undefined,
        }),
      });
      setSubmitted(true);
      // Auto-dismiss after showing the thank-you state
      setTimeout(() => {
        localStorage.setItem(DISMISS_KEY(clientId), String(Date.now()));
        setVisible(false);
      }, 2800);
    } catch {
      setLoading(false);
    }
  }

  if (!visible) return null;

  // Thank-you state
  if (submitted) {
    return (
      <div style={{
        background: '#162A1A',
        border: '1px solid #3A5C42',
        borderRadius: 14,
        padding: '24px 20px',
        marginBottom: 20,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 22, marginBottom: 10 }}>✦</div>
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          color: '#DDE8DE',
          marginBottom: 6,
        }}>
          Thank you for sharing that.
        </div>
        <div style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: 13,
          color: '#80A088',
          fontStyle: 'italic',
          lineHeight: 1.6,
        }}>
          Warren will see this before your next session. You showed up today — that matters.
        </div>
      </div>
    );
  }

  const missedLabel = missedDays >= 999
    ? "You haven't checked in yet"
    : missedDays === 1
    ? 'You missed yesterday\'s check-in'
    : `You haven't checked in for ${missedDays} days`;

  return (
    <div style={{
      background: '#0F1F13',
      border: '1px solid #2A4330',
      borderRadius: 14,
      padding: '22px 20px',
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 15,
          color: '#DDE8DE',
          marginBottom: 4,
        }}>
          {missedLabel}.
        </div>
        <div style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: 13,
          color: '#80A088',
          fontStyle: 'italic',
          lineHeight: 1.6,
        }}>
          No judgment — this is just a signal. What got in the way?
        </div>
      </div>

      {/* Chips */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
      }}>
        {FRICTION_CHIPS.map((chip) => {
          const active = selected.has(chip);
          const isShame = chip === "Ashamed I haven't kept up";
          return (
            <button
              key={chip}
              onClick={() => toggleChip(chip)}
              style={{
                padding: '7px 13px',
                borderRadius: 20,
                border: active
                  ? `1px solid ${isShame ? '#D97706' : '#C07848'}`
                  : '1px solid #2A4330',
                background: active
                  ? isShame ? 'rgba(217,119,6,0.15)' : 'rgba(192,120,72,0.15)'
                  : 'transparent',
                color: active
                  ? isShame ? '#FCD34D' : '#DFA878'
                  : '#80A088',
                fontFamily: "'Syne', sans-serif",
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* Optional note */}
      {selected.size > 0 && (
        <textarea
          placeholder="Anything else you want Warren to know? (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          style={{
            width: '100%',
            background: '#162A1A',
            border: '1px solid #2A4330',
            borderRadius: 8,
            padding: '10px 12px',
            fontFamily: "'Lora', Georgia, serif",
            fontSize: 13,
            color: '#DDE8DE',
            resize: 'none',
            outline: 'none',
            marginBottom: 14,
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={handleSubmit}
          disabled={loading || selected.size === 0}
          style={{
            background: selected.size > 0 ? '#C07848' : '#2A4330',
            color: selected.size > 0 ? '#fff' : '#5A7C62',
            border: 'none',
            borderRadius: 8,
            padding: '9px 20px',
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.04em',
            cursor: selected.size > 0 ? 'pointer' : 'default',
            transition: 'background 150ms',
          }}
        >
          {loading ? 'Sending…' : 'Send to Warren →'}
        </button>
        <button
          onClick={dismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#5A7C62',
            fontFamily: "'Syne', sans-serif",
            fontSize: 12,
            cursor: 'pointer',
            padding: '9px 4px',
          }}
        >
          I'm ok, continue
        </button>
      </div>
    </div>
  );
}
