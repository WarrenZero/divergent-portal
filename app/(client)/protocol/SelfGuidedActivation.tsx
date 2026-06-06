'use client';

import { useState } from 'react';

interface ProtocolOption {
  id: string;
  name: string;
}

interface Props {
  protocols: ProtocolOption[];
  clientId: string;
}

export default function SelfGuidedActivation({ protocols, clientId }: Props) {
  const [activating, setActivating] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Find the two ENS protocols
  const ensRestoration = protocols.find((p) => p.name.toLowerCase().includes('restoration')) ?? protocols[0];
  const ensSignal = protocols.find((p) =>
    p.name.toLowerCase().includes('signal') || p.name.toLowerCase().includes('noise')
  ) ?? protocols[1];

  const protocolCards = [
    ensRestoration && {
      protocol: ensRestoration,
      badge: '30 DAYS',
      description:
        'For those experiencing chronic fatigue, digestive challenges, and systemic inflammation. This protocol focuses on rebuilding your enteric nervous system foundation over 30 days.',
      supplementNote:
        'Recommended supplements shown after activation — available through Fullscript',
    },
    ensSignal && {
      protocol: ensSignal,
      badge: '30 DAYS',
      description:
        'For those experiencing nervous system dysregulation, neurodivergent challenges, and mineral imbalance. Boron-focused protocol for nervous system clarity.',
      supplementNote: null,
    },
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));

  async function activate(protocolId: string) {
    setActivating(protocolId);
    setError(null);
    try {
      const res = await fetch('/api/client/request-protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolId, clientId, selfActivate: true }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to activate protocol');
      }
      setConfirmed(protocolId);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setActivating(null);
    }
  }

  if (confirmed) {
    return (
      <div style={{
        background: 'var(--pine-100)',
        border: '1px solid var(--pine-300)',
        borderRadius: 12,
        padding: '24px 20px',
        textAlign: 'center',
        marginBottom: 24,
      }}>
        <div style={{ color: 'var(--copper-500)', fontSize: 24, marginBottom: 12 }}>✦</div>
        <div style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 16,
          fontWeight: 800,
          color: 'var(--pine-800)',
          marginBottom: 8,
        }}>
          Protocol Activated
        </div>
        <p style={{
          fontFamily: 'Lora, Georgia, serif',
          fontStyle: 'italic',
          fontSize: 14,
          color: 'var(--pine-600)',
          margin: 0,
        }}>
          Your protocol is loading — refreshing your dashboard now.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontFamily: 'Syne, sans-serif',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--copper-500)',
        marginBottom: 8,
      }}>
        ✦ Self-Guided Member
      </div>
      <h2 style={{
        fontFamily: 'Syne, sans-serif',
        fontSize: 'clamp(18px, 4vw, 22px)',
        fontWeight: 800,
        color: 'var(--text-1)',
        margin: '0 0 8px',
      }}>
        Start Your Self-Guided Protocol
      </h2>
      <p style={{
        fontFamily: 'Lora, Georgia, serif',
        fontStyle: 'italic',
        fontSize: 14,
        color: 'var(--text-2)',
        marginBottom: 24,
        lineHeight: 1.65,
      }}>
        Warren has made two foundational protocols available for self-guided members. Choose the one
        that feels most aligned with where you are.
      </p>

      {error && (
        <div style={{
          background: 'var(--copper-100)',
          border: '1px solid var(--copper-300)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          fontFamily: 'Lora, Georgia, serif',
          fontSize: 13,
          color: 'var(--copper-700)',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {protocolCards.map(({ protocol, badge, description, supplementNote }) => (
          <div
            key={protocol.id}
            style={{
              background: 'var(--pine-900)',
              border: '1px solid var(--pine-700)',
              borderRadius: 12,
              padding: '20px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: 15,
                fontWeight: 800,
                color: '#FDFAF5',
                flex: 1,
                marginRight: 12,
                lineHeight: 1.3,
              }}>
                {protocol.name}
              </div>
              <span style={{
                background: 'var(--copper-700)',
                color: '#FDFAF5',
                fontSize: 9,
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                letterSpacing: '0.1em',
                padding: '3px 8px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {badge}
              </span>
            </div>

            {/* Description */}
            <p style={{
              fontFamily: 'Lora, Georgia, serif',
              fontSize: 13,
              color: 'var(--pine-200)',
              lineHeight: 1.6,
              margin: '0 0 12px',
            }}>
              {description}
            </p>

            {supplementNote && (
              <p style={{
                fontFamily: 'Lora, Georgia, serif',
                fontStyle: 'italic',
                fontSize: 12,
                color: 'var(--copper-300)',
                lineHeight: 1.5,
                margin: '0 0 16px',
              }}>
                {supplementNote}
              </p>
            )}

            {/* Activate button */}
            <button
              onClick={() => activate(protocol.id)}
              disabled={activating === protocol.id}
              style={{
                background: activating === protocol.id ? 'var(--pine-600)' : 'var(--copper-500)',
                color: '#FDFAF5',
                border: 'none',
                borderRadius: 8,
                fontFamily: 'Syne, sans-serif',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.03em',
                padding: '10px 20px',
                cursor: activating === protocol.id ? 'default' : 'pointer',
                opacity: activating === protocol.id ? 0.7 : 1,
                transition: 'opacity 150ms ease',
              }}
            >
              {activating === protocol.id ? 'Activating…' : 'Activate This Protocol →'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
