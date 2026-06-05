import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { calculateScores } from '@/app/(client)/naq/data';

// ─── Types ────────────────────────────────────────────────────

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  date_of_birth: string | null;
  primary_concern: string | null;
  wellness_score: number;
  created_at: string;
}

interface PulseRow {
  digestion_score: number;
  sleep_score: number;
  stress_score: number;
  logged_at: string;
}

interface SupplementRow {
  name: string;
  dose: string | null;
  timing: string | null;
}

interface NAQResponseRow {
  question_id: string;
  response_value: number;
  responded_at: string;
}

interface ProtocolRow {
  current_phase: number;
  start_date: string | null;
  protocols: { name: string } | null;
}

// ─── Data ─────────────────────────────────────────────────────

async function getReportData(clientId: string, practitionerId: string) {
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, date_of_birth, primary_concern, wellness_score, created_at')
    .eq('id', clientId)
    .eq('practitioner_id', practitionerId)
    .single();

  if (error || !client) return null;

  const [pulseRes, suppRes, naqRes, protocolRes] = await Promise.all([
    supabase
      .from('daily_pulse')
      .select('digestion_score, sleep_score, stress_score, logged_at')
      .eq('client_id', clientId)
      .order('logged_at', { ascending: false })
      .limit(30),
    supabase
      .from('supplements')
      .select('name, dose, timing')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('timing'),
    supabase
      .from('naq_responses')
      .select('question_id, response_value, responded_at')
      .eq('client_id', clientId)
      .order('responded_at', { ascending: true }),
    supabase
      .from('client_protocols')
      .select('current_phase, start_date, protocols(name)')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let protocol: ProtocolRow | null = null;
  if (protocolRes.data) {
    const raw = protocolRes.data;
    const proto = Array.isArray(raw.protocols) ? raw.protocols[0] : raw.protocols;
    if (proto?.name) {
      protocol = {
        current_phase: raw.current_phase ?? 1,
        start_date: raw.start_date ?? null,
        protocols: { name: proto.name },
      };
    }
  }

  return {
    client: client as ClientRow,
    pulseEntries: (pulseRes.data ?? []) as PulseRow[],
    supplements: (suppRes.data ?? []) as SupplementRow[],
    naqResponses: (naqRes.data ?? []) as NAQResponseRow[],
    protocol,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function clientAge(dob: string | null): string {
  if (!dob) return 'Unknown';
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  return `${years}`;
}

function avgPulse(entries: PulseRow[]): { dig: number; slp: number; str: number } {
  if (entries.length === 0) return { dig: 0, slp: 0, str: 0 };
  const n = entries.length;
  return {
    dig: Math.round(entries.reduce((s, e) => s + e.digestion_score, 0) / n * 10) / 10,
    slp: Math.round(entries.reduce((s, e) => s + e.sleep_score, 0) / n * 10) / 10,
    str: Math.round(entries.reduce((s, e) => s + e.stress_score, 0) / n * 10) / 10,
  };
}

function burdenLabel(burden: number): string {
  if (burden <= 25) return 'Low';
  if (burden <= 55) return 'Moderate';
  if (burden <= 75) return 'Elevated';
  return 'High';
}

function burdenColor(burden: number): string {
  if (burden <= 25) return '#3A5C42';
  if (burden <= 55) return '#C07848';
  if (burden <= 75) return '#D97706';
  return '#C45C40';
}

// ─── Page ─────────────────────────────────────────────────────

export default async function ClientReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const data = await getReportData(id, practitioner.id);
  if (!data) notFound();

  const { client, pulseEntries, supplements, naqResponses, protocol } = data;

  const naqComplete = naqResponses.length > 0;
  const responsesMap: Record<string, number> = {};
  for (const r of naqResponses) responsesMap[r.question_id] = r.response_value;
  const { wellnessScore, domainScores } = naqComplete
    ? calculateScores(responsesMap)
    : { wellnessScore: client.wellness_score, domainScores: [] };

  const naqDate = naqComplete
    ? new Date(naqResponses[naqResponses.length - 1].responded_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  const pulse30 = avgPulse(pulseEntries);
  const reportDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const protocolDays = protocol?.start_date
    ? Math.max(1, Math.floor((Date.now() - new Date(protocol.start_date).getTime()) / 86400000))
    : 0;

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Clinical Summary — {client.first_name} {client.last_name}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Lora:ital,wght@0,400;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @media print {
            @page { margin: 0.75in; size: letter; }
            .no-print { display: none !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            background: #FDFAF5;
            color: #0F1F13;
            font-family: 'Lora', Georgia, serif;
            font-size: 13px;
            line-height: 1.6;
          }
          .page { max-width: 720px; margin: 0 auto; padding: 48px 40px; }
          .header { border-bottom: 2px solid #0F1F13; padding-bottom: 20px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-start; }
          .brand { font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #9A8A72; }
          .report-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #0F1F13; margin-bottom: 4px; }
          .report-date { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #9A8A72; }
          .section { margin-bottom: 32px; }
          .section-label { font-family: 'Syne', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #C07848; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #E8DECE; }
          .row { display: flex; gap: 12px; margin-bottom: 6px; }
          .row-key { font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; color: #5A4C38; min-width: 140px; }
          .row-val { font-size: 13px; color: #0F1F13; }
          .score-large { font-family: 'Syne', sans-serif; font-size: 36px; font-weight: 800; color: #0F1F13; line-height: 1; }
          .score-sub { font-family: 'Syne', sans-serif; font-size: 11px; color: #9A8A72; margin-top: 2px; }
          .domain-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .domain-card { background: #F8F2E8; border-radius: 6px; padding: 8px 10px; }
          .domain-name { font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; color: #0F1F13; margin-bottom: 4px; }
          .domain-bar-track { height: 4px; background: #E8DECE; border-radius: 2px; margin-bottom: 4px; }
          .domain-bar-fill { height: 4px; border-radius: 2px; }
          .domain-meta { display: flex; justify-content: space-between; font-family: 'Syne', sans-serif; font-size: 10px; }
          .supp-item { padding: 6px 0; border-bottom: 1px solid #F0E8DA; display: flex; gap: 12px; }
          .supp-name { font-weight: 400; font-size: 13px; flex: 1; }
          .supp-dose { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #9A8A72; }
          .pulse-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .pulse-card { background: #F8F2E8; border-radius: 6px; padding: 10px; text-align: center; }
          .pulse-val { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; }
          .pulse-label { font-family: 'Syne', sans-serif; font-size: 10px; color: #9A8A72; font-weight: 700; letter-spacing: 0.08em; margin-top: 2px; }
          .disclaimer { font-size: 10px; color: #9A8A72; font-style: italic; line-height: 1.5; margin-top: 32px; padding-top: 16px; border-top: 1px solid #E8DECE; }
          .print-btn { position: fixed; bottom: 24px; right: 24px; background: #0F1F13; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 12px; cursor: pointer; letter-spacing: 0.04em; }
        `}</style>
      </head>
      <body>
        <div className="page">
          {/* Header */}
          <div className="header">
            <div>
              <div className="brand">Divergent Nutritional Therapy · Clinical Summary</div>
              <div className="report-title">{client.first_name} {client.last_name}</div>
              <div className="report-date">{reportDate}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, color: '#C07848' }}>✦</div>
            </div>
          </div>

          {/* Client Information */}
          <div className="section">
            <div className="section-label">Client Information</div>
            <div className="row">
              <span className="row-key">Name</span>
              <span className="row-val">{client.first_name} {client.last_name}</span>
            </div>
            {client.date_of_birth && (
              <div className="row">
                <span className="row-key">Age</span>
                <span className="row-val">{clientAge(client.date_of_birth)}</span>
              </div>
            )}
            {client.email && (
              <div className="row">
                <span className="row-key">Email</span>
                <span className="row-val">{client.email}</span>
              </div>
            )}
            {client.primary_concern && (
              <div className="row">
                <span className="row-key">Chief Concern</span>
                <span className="row-val" style={{ fontStyle: 'italic' }}>&ldquo;{client.primary_concern}&rdquo;</span>
              </div>
            )}
            <div className="row">
              <span className="row-key">Client Since</span>
              <span className="row-val">{new Date(client.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            {protocol && (
              <>
                <div className="row">
                  <span className="row-key">Current Protocol</span>
                  <span className="row-val">{protocol.protocols?.name} · Phase {protocol.current_phase}</span>
                </div>
                {protocolDays > 0 && (
                  <div className="row">
                    <span className="row-key">Days on Protocol</span>
                    <span className="row-val">{protocolDays}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Wellness Score */}
          <div className="section">
            <div className="section-label">Wellness Assessment</div>
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
              <div>
                <div className="score-large">{wellnessScore}</div>
                <div className="score-sub">Wellness Score / 100</div>
                {naqDate && <div className="score-sub" style={{ marginTop: 4 }}>NAQ completed {naqDate}</div>}
              </div>
              {!naqComplete && (
                <div style={{ fontStyle: 'italic', color: '#9A8A72', fontSize: 12, paddingTop: 8 }}>
                  NAQ assessment not yet completed. Score reflects baseline intake.
                </div>
              )}
            </div>
          </div>

          {/* Domain Breakdown */}
          {naqComplete && domainScores.length > 0 && (
            <div className="section">
              <div className="section-label">Symptom Burden by Domain</div>
              <div className="domain-grid">
                {domainScores.map((d) => (
                  <div key={d.domainId} className="domain-card">
                    <div className="domain-name">{d.glyph} {d.name}</div>
                    <div className="domain-bar-track">
                      <div
                        className="domain-bar-fill"
                        style={{ width: `${d.burden}%`, background: burdenColor(d.burden) }}
                      />
                    </div>
                    <div className="domain-meta">
                      <span style={{ color: burdenColor(d.burden), fontWeight: 700 }}>{Math.round(d.burden)}%</span>
                      <span style={{ color: '#9A8A72' }}>{burdenLabel(d.burden)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Pulse */}
          {pulseEntries.length > 0 && (
            <div className="section">
              <div className="section-label">30-Day Pulse Averages ({pulseEntries.length} check-ins)</div>
              <div className="pulse-grid">
                <div className="pulse-card">
                  <div className="pulse-val" style={{ color: pulse30.dig >= 7 ? '#3A5C42' : pulse30.dig >= 4 ? '#D97706' : '#DC2626' }}>
                    {pulse30.dig}
                  </div>
                  <div className="pulse-label">Digestion</div>
                </div>
                <div className="pulse-card">
                  <div className="pulse-val" style={{ color: pulse30.slp >= 7 ? '#3A5C42' : pulse30.slp >= 4 ? '#D97706' : '#DC2626' }}>
                    {pulse30.slp}
                  </div>
                  <div className="pulse-label">Sleep</div>
                </div>
                <div className="pulse-card">
                  <div className="pulse-val" style={{ color: (11 - pulse30.str) >= 7 ? '#3A5C42' : (11 - pulse30.str) >= 4 ? '#D97706' : '#DC2626' }}>
                    {pulse30.str}
                  </div>
                  <div className="pulse-label">Stress (raw)</div>
                </div>
              </div>
            </div>
          )}

          {/* Active Supplements */}
          {supplements.length > 0 && (
            <div className="section">
              <div className="section-label">Active Supplement Protocol</div>
              {supplements.map((s, i) => (
                <div key={i} className="supp-item">
                  <span className="supp-name">{s.name}</span>
                  {s.dose && <span className="supp-dose">{s.dose}</span>}
                  {s.timing && <span className="supp-dose" style={{ color: '#C07848' }}>{s.timing}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Practitioner */}
          <div className="section">
            <div className="section-label">Prepared By</div>
            <div className="row">
              <span className="row-key">Practitioner</span>
              <span className="row-val">Warren Hennon, NTP</span>
            </div>
            <div className="row">
              <span className="row-key">Practice</span>
              <span className="row-val">Divergent Nutritional Therapy</span>
            </div>
            <div className="row">
              <span className="row-key">Credential</span>
              <span className="row-val">1,226-hour NTP Program, NTA — Graduated with Honors</span>
            </div>
          </div>

          <div className="disclaimer">
            Statements regarding nutritional support have not been evaluated by the Food and Drug Administration.
            Foundational nutrition is intended to support the body&apos;s natural systems and is not intended to diagnose, treat, cure, or prevent any disease.
            This summary is prepared for clinical reference and is not a medical record.
          </div>
        </div>

        <button
          className="print-btn no-print"
          onClick={() => window.print()}
        >
          ↓ Print / Save PDF
        </button>

        <script dangerouslySetInnerHTML={{ __html: `
          document.querySelector('.print-btn')?.addEventListener('click', () => window.print());
        `}} />
      </body>
    </html>
  );
}
