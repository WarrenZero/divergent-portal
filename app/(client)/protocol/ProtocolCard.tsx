'use client';

import { useState } from 'react';

interface Props {
  protocol: {
    id: string;
    name: string;
    category: string | null;
    phase_count: number;
    content_html: string | null;
  };
  clientId: string;
}

export default function ProtocolCard({ protocol, clientId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  async function handleRequest() {
    setRequesting(true);
    try {
      await fetch('/api/client/request-protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolId: protocol.id, clientId }),
      });
      setRequested(true);
    } catch {
      // fail silently for MVP
    }
    setRequesting(false);
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
            {protocol.name}
          </div>
          {protocol.category && (
            <div style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 12, color: 'var(--text-3)' }}>
              {protocol.category}
            </div>
          )}
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, color: 'var(--pine-500)', marginTop: 4 }}>
            {protocol.phase_count} {protocol.phase_count === 1 ? 'phase' : 'phases'}
          </div>
        </div>
        {requested ? (
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--pine-500)', padding: '6px 12px' }}>
            ✓ Requested
          </div>
        ) : (
          <button
            onClick={handleRequest}
            disabled={requesting}
            style={{
              padding: '8px 16px',
              background: 'var(--pine-800)',
              color: '#fff',
              fontFamily: "'Syne', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {requesting ? '…' : 'Request this →'}
          </button>
        )}
      </div>

      {protocol.content_html && (
        <>
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--copper-500)', marginTop: 12, padding: 0, letterSpacing: '0.06em' }}
          >
            {expanded ? 'Hide details ↑' : 'Learn more →'}
          </button>
          {expanded && (
            <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, marginTop: 10 }}>
              {protocol.content_html.split('\n\n')[0]?.slice(0, 300)}
              {(protocol.content_html.split('\n\n')[0]?.length ?? 0) > 300 ? '…' : ''}
            </div>
          )}
        </>
      )}
    </div>
  );
}
