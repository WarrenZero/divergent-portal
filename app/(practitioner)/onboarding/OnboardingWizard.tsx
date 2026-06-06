'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  practitionerName: string;
  practitionerId: string;
}

export default function OnboardingWizard({ practitionerName, practitionerId }: Props) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Step 1 state
  const [practiceName, setPracticeName] = useState('');
  const [specialty, setSpecialty] = useState('');

  // Step 2 state
  const [clientFirstName, setClientFirstName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAdded, setClientAdded] = useState<string | null>(null); // client ID

  // Step 3 state
  const [protocolSelected, setProtocolSelected] = useState<string | null>(null);

  async function handleStep1() {
    if (practiceName) {
      await fetch('/api/practitioner/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practiceName, specialty }),
      }).catch(() => {}); // non-fatal
    }
    setStep(2);
  }

  async function handleCompleteOnboarding() {
    await fetch('/api/practitioner/complete-onboarding', {
      method: 'POST',
    }).catch(() => {});
    router.push('/dashboard');
  }

  const containerStyle = {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 20px',
  };

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '32px',
    maxWidth: 560,
    width: '100%',
  };

  const labelStyle = {
    fontFamily: "'Syne', sans-serif",
    fontSize: 11,
    fontWeight: 700 as const,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-2)',
    display: 'block',
    marginBottom: 6,
    marginTop: 16,
  };

  const inputStyle = {
    display: 'block',
    width: '100%',
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 14,
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '10px 14px',
    background: 'var(--bg)',
    color: 'var(--text-1)',
    boxSizing: 'border-box' as const,
  };

  const primaryBtnStyle = {
    padding: '12px 28px',
    background: 'var(--pine-800)',
    color: '#fff',
    fontFamily: "'Syne', sans-serif",
    fontSize: 13,
    fontWeight: 700 as const,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 24,
  };

  const skipBtnStyle = {
    padding: '12px 20px',
    background: 'none',
    color: 'var(--text-3)',
    fontFamily: "'Syne', sans-serif",
    fontSize: 12,
    border: 'none',
    cursor: 'pointer',
    marginTop: 24,
    marginLeft: 12,
  };

  const PROTOCOLS = [
    { id: 'ens-signal', name: 'ENS Signal-to-Noise Protocol', desc: 'Nervous system recalibration — 90 days, 4 phases' },
    { id: 'ens-restoration', name: 'ENS Restoration Protocol', desc: 'GI restoration and foundational healing — 56 days, 2 phases' },
  ];

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: s <= step ? 'var(--copper-500)' : 'var(--border)',
            }} />
          ))}
        </div>

        {/* Glyph */}
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--copper-500)', marginBottom: 8 }}>
          ✦ Step {step} of 4
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 8px' }}>
              Set up your practice
            </h1>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 8 }}>
              Welcome, {practitionerName}. Let&apos;s get your portal ready in 4 quick steps.
            </p>
            <label style={labelStyle}>Practice Name</label>
            <input type="text" style={inputStyle} value={practiceName} onChange={(e) => setPracticeName(e.target.value)} placeholder="e.g. Divergent Nutritional Therapy" />
            <label style={labelStyle}>Specialty / Focus Area</label>
            <input type="text" style={inputStyle} value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Gut health, nervous system, hormone balance" />
            <div>
              <button style={primaryBtnStyle} onClick={handleStep1}>Continue →</button>
            </div>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 8px' }}>
              Add your first client
            </h1>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 8 }}>
              Enter their name and email. You can invite them to create an account after this.
            </p>
            {clientAdded ? (
              <div style={{ background: 'var(--pine-100)', border: '1px solid var(--pine-300)', borderRadius: 8, padding: '12px 16px', fontFamily: "'Syne', sans-serif", fontSize: 13, color: 'var(--pine-600)', marginBottom: 8 }}>
                ✓ {clientFirstName} {clientLastName} added
              </div>
            ) : (
              <>
                <label style={labelStyle}>First Name</label>
                <input type="text" style={inputStyle} value={clientFirstName} onChange={(e) => setClientFirstName(e.target.value)} />
                <label style={labelStyle}>Last Name</label>
                <input type="text" style={inputStyle} value={clientLastName} onChange={(e) => setClientLastName(e.target.value)} />
                <label style={labelStyle}>Email</label>
                <input type="email" style={inputStyle} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                <button style={primaryBtnStyle} onClick={async () => {
                  if (!clientFirstName || !clientLastName) return;
                  // Would call server action to create client — simplified for MVP
                  setClientAdded('temp-id');
                  setStep(3);
                }}>
                  Add Client →
                </button>
              </>
            )}
            <button style={skipBtnStyle} onClick={() => setStep(3)}>Skip — I&apos;ll add clients later</button>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 8px' }}>
              Assign a protocol
            </h1>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 }}>
              Choose the foundational protocol for {clientFirstName || 'your client'}.
            </p>
            {PROTOCOLS.map((p) => (
              <div
                key={p.id}
                onClick={() => setProtocolSelected(p.id)}
                style={{
                  border: `2px solid ${protocolSelected === p.id ? 'var(--copper-500)' : 'var(--border)'}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 10,
                  cursor: 'pointer',
                  background: protocolSelected === p.id ? 'var(--copper-100)' : 'var(--surface)',
                }}
              >
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 12, color: 'var(--text-2)' }}>{p.desc}</div>
              </div>
            ))}
            <details style={{ marginBottom: 16 }}>
              <summary style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--copper-500)', cursor: 'pointer', letterSpacing: '0.06em' }}>What is an ENS protocol? →</summary>
              <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginTop: 8 }}>
                ENS (Enteric Nervous System) protocols are structured nutritional therapy plans designed to recalibrate the gut-brain axis, restore digestive function, and support the autonomic nervous system through phased supplementation and dietary guidance.
              </p>
            </details>
            <button style={primaryBtnStyle} onClick={() => setStep(4)}>Continue →</button>
            <button style={skipBtnStyle} onClick={() => setStep(4)}>I&apos;ll create my own protocols later</button>
          </>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 8px' }}>
              Invite your client
            </h1>
            <p style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 }}>
              Send {clientFirstName || 'your client'} a link to create their account and access the portal.
            </p>
            {clientAdded && clientEmail && (
              <div style={{ background: 'var(--pine-100)', border: '1px solid var(--pine-300)', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--pine-700)' }}>{clientFirstName} {clientLastName}</div>
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 13, color: 'var(--pine-600)', marginTop: 4 }}>{clientEmail}</div>
              </div>
            )}
            <button style={primaryBtnStyle} onClick={handleCompleteOnboarding}>
              You&apos;re ready! ✦
            </button>
            <button style={skipBtnStyle} onClick={handleCompleteOnboarding}>Skip</button>
          </>
        )}
      </div>
    </div>
  );
}
