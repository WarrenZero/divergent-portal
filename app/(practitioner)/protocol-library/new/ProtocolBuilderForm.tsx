'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveCustomProtocol } from './actions';

interface PhaseConfig {
  name: string;
  durationDays: number;
  description: string;
}

export default function ProtocolBuilderForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [protocolName, setProtocolName] = useState('');
  const [phaseCount, setPhaseCount] = useState(1);
  const [phases, setPhases] = useState<PhaseConfig[]>([{ name: 'Phase 1', durationDays: 30, description: '' }]);

  function updatePhaseCount(n: number) {
    setPhaseCount(n);
    setPhases((prev) => {
      const next = [...prev];
      while (next.length < n) next.push({ name: `Phase ${next.length + 1}`, durationDays: 30, description: '' });
      return next.slice(0, n);
    });
  }

  function updatePhase(i: number, field: keyof PhaseConfig, value: string | number) {
    setPhases((prev) => prev.map((p, j) => j === i ? { ...p, [field]: value } : p));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!protocolName.trim()) { setError('Protocol name is required'); return; }
    setError(null);
    startTransition(async () => {
      const result = await saveCustomProtocol({ name: protocolName, phases });
      if (result.error) { setError(result.error); return; }
      router.push('/protocol-library');
    });
  }

  const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px', marginBottom: 12 };
  const labelStyle = { fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700 as const, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--text-2)', display: 'block', marginBottom: 6, marginTop: 12 };
  const inputStyle = { display: 'block', width: '100%', fontFamily: "'Lora', Georgia, serif", fontSize: 14, border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', background: 'var(--bg)', color: 'var(--text-1)', boxSizing: 'border-box' as const };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--copper-500)', marginBottom: 8 }}>
          ✦ Protocol Library
        </div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>
          New Protocol
        </h1>
      </div>

      <div style={cardStyle}>
        <label style={labelStyle}>Protocol Name</label>
        <input type="text" style={inputStyle} value={protocolName} onChange={(e) => setProtocolName(e.target.value)} placeholder="e.g. Adrenal Support Protocol" />

        <label style={labelStyle}>Number of Phases</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button key={n} type="button"
              onClick={() => updatePhaseCount(n)}
              style={{ padding: '6px 16px', border: `2px solid ${phaseCount === n ? 'var(--copper-500)' : 'var(--border)'}`, borderRadius: 6, background: phaseCount === n ? 'var(--copper-100)' : 'none', color: phaseCount === n ? 'var(--copper-700)' : 'var(--text-2)', fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {phases.map((phase, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--copper-400)', marginBottom: 12 }}>
            Phase {i + 1}
          </div>
          <label style={labelStyle}>Phase Name</label>
          <input type="text" style={inputStyle} value={phase.name} onChange={(e) => updatePhase(i, 'name', e.target.value)} placeholder={`Phase ${i + 1}`} />
          <label style={labelStyle}>Duration (days)</label>
          <input type="number" style={{ ...inputStyle, width: 120 }} value={phase.durationDays} min={1} max={365} onChange={(e) => updatePhase(i, 'durationDays', Number(e.target.value))} />
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, resize: 'vertical' }} value={phase.description} onChange={(e) => updatePhase(i, 'description', e.target.value)} rows={3} placeholder="What happens in this phase…" />
        </div>
      ))}

      {error && <div style={{ color: '#C45C40', fontFamily: "'Syne', sans-serif", fontSize: 12, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12 }}>
        <button type="submit" disabled={isPending} style={{ padding: '12px 28px', background: 'var(--pine-800)', color: '#fff', fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          {isPending ? 'Saving…' : 'Save Protocol ✦'}
        </button>
        <button type="button" onClick={() => router.back()} style={{ padding: '12px 20px', background: 'none', color: 'var(--text-2)', fontFamily: "'Syne', sans-serif", fontSize: 12, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
