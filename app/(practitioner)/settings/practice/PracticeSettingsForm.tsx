'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { savePracticeSettings } from './actions';

const COLOR_PALETTES = [
  { id: 'pine',     label: 'Forest Pine',  swatch: '#3A5C42' },
  { id: 'ocean',    label: 'Ocean',        swatch: '#2A5C6E' },
  { id: 'earth',    label: 'Earth',        swatch: '#7A5C3A' },
  { id: 'lavender', label: 'Lavender',     swatch: '#5A4C7A' },
  { id: 'slate',    label: 'Slate',        swatch: '#4A5C6E' },
];

interface Props {
  practitioner: {
    id: string;
    name?: string | null;
    practice_name?: string | null;
    practice_tagline?: string | null;
    brand_color?: string | null;
    practitioner_bio?: string | null;
  };
}

export default function PracticeSettingsForm({ practitioner }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [practiceName, setPracticeName] = useState(practitioner.practice_name ?? '');
  const [displayName, setDisplayName] = useState(practitioner.name ?? '');
  const [tagline, setTagline] = useState(practitioner.practice_tagline ?? '');
  const [brandColor, setBrandColor] = useState(practitioner.brand_color ?? 'pine');
  const [bio, setBio] = useState(practitioner.practitioner_bio ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await savePracticeSettings({
        practiceName, displayName, tagline, brandColor, bio,
      });
      if (result.error) { setError(result.error); return; }
      setSaved(true);
      router.refresh();
    });
  }

  const fieldStyle = {
    display: 'block',
    width: '100%',
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 14,
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '10px 14px',
    background: 'var(--surface)',
    color: 'var(--text-1)',
    marginTop: 6,
    boxSizing: 'border-box' as const,
  };
  const labelStyle = {
    fontFamily: "'Syne', sans-serif",
    fontSize: 11,
    fontWeight: 700 as const,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-2)',
    display: 'block',
    marginBottom: 4,
  };
  const sectionStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '24px',
    marginBottom: 16,
  };

  return (
    <form onSubmit={handleSubmit}>

      <div style={sectionStyle}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Practice Identity</div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Practice Name</label>
          <input type="text" style={fieldStyle} value={practiceName} onChange={(e) => setPracticeName(e.target.value)} placeholder="e.g. Divergent Nutritional Therapy" />
          <div style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            Replaces &quot;Divergent Nutritional Therapy&quot; in your clients&apos; portal
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Your Display Name</label>
          <input type="text" style={fieldStyle} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Warren Hennon, NTP" />
        </div>

        <div style={{ marginBottom: 0 }}>
          <label style={labelStyle}>Practice Tagline</label>
          <input type="text" style={fieldStyle} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Nutritional Therapy" />
          <div style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            Shows in the portal header for your clients
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Color Palette</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {COLOR_PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setBrandColor(p.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                border: `2px solid ${brandColor === p.id ? p.swatch : 'var(--border)'}`,
                borderRadius: 8,
                background: brandColor === p.id ? 'var(--surface)' : 'transparent',
                cursor: 'pointer',
                fontFamily: "'Syne', sans-serif",
                fontSize: 12,
                fontWeight: brandColor === p.id ? 700 : 500,
                color: 'var(--text-1)',
              }}
            >
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: p.swatch, flexShrink: 0, display: 'block' }} />
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
          Forest Pine is the default. Other palettes change the accent color in your clients&apos; view.
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>Your Bio</div>
        <label style={labelStyle}>Shown on client welcome screen and in emails</label>
        <textarea
          style={{ ...fieldStyle, resize: 'vertical' }}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={5}
          placeholder="A brief introduction about your practice, your approach, and your background…"
        />
      </div>

      {error && <div style={{ color: '#C45C40', fontFamily: "'Syne', sans-serif", fontSize: 12, marginBottom: 12 }}>{error}</div>}
      {saved && <div style={{ color: 'var(--pine-500)', fontFamily: "'Syne', sans-serif", fontSize: 12, marginBottom: 12 }}>✓ Settings saved</div>}

      <button
        type="submit"
        disabled={isPending}
        style={{ padding: '12px 28px', background: 'var(--pine-800)', color: '#fff', fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer' }}
      >
        {isPending ? 'Saving…' : 'Save Settings ✦'}
      </button>
    </form>
  );
}
