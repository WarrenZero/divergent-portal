import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import TranscriptionWorkspace from './TranscriptionWorkspace';

export const metadata: Metadata = {
  title: 'Session Transcription — Divergent',
};

// ─── Types exported for child component ──────────────────────

export interface SessionData {
  id: string;
  client_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  session_type: string;
  status: string;
}

export interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  primary_concern: string | null;
  wellness_score: number;
}

export interface TranscriptionRow {
  id: string;
  session_id: string;
  client_id: string | null;
  practitioner_id: string;
  raw_transcript: string | null;
  audio_duration_seconds: number | null;
  speaker_segments: SpeakerSegment[];
  lens_clean_transcript: string | null;
  lens_clinical_matrix: ClinicalMatrix | null;
  lens_client_roadmap: string | null;
  verification_checklist: ChecklistItem[];
  qualitative_trendlines: Trendline[];
  acoustic_metatags: AcousticMetatag[];
  status: 'recording' | 'processing' | 'complete' | 'error';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpeakerSegment {
  speaker: 'WARREN' | 'CLIENT';
  text: string;
  start_ms?: number;
  end_ms?: number;
  confidence?: number;
}

export interface ClinicalMatrix {
  presenting_concerns: string;
  root_cause_observations: string;
  htma_patterns: string;
  protocol_updates: string;
  objective_metrics: string;
  timeline_markers: string;
  trajectory_summary: string;
}

export interface ChecklistItem {
  id: string;
  item: string;
  type: 'supplement' | 'lab' | 'protocol' | 'followup';
  value: string;
  priority: 'high' | 'medium';
  confirmed: boolean;
}

export interface Trendline {
  direction: 'up' | 'down' | 'stable';
  symptom: string;
  quote: string;
  confidence: number;
}

export interface AcousticMetatag {
  text: string;
  tone: string;
}

// ─── Client history compiler ──────────────────────────────────
// Builds the context string sent to Claude for every processing call.

async function compileClientHistory(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  clientId: string,
): Promise<string> {
  const sections: string[] = [];

  // NAQ domain scores
  const { data: naqResponses } = await supabase
    .from('naq_responses')
    .select('domain, response_value')
    .eq('client_id', clientId);

  if (naqResponses && naqResponses.length > 0) {
    // Aggregate scores per domain
    const domainMap = new Map<string, number[]>();
    for (const r of naqResponses) {
      if (!domainMap.has(r.domain)) domainMap.set(r.domain, []);
      if (typeof r.response_value === 'number') {
        domainMap.get(r.domain)!.push(r.response_value);
      }
    }
    const domainLines = Array.from(domainMap.entries())
      .map(([domain, vals]) => {
        const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        return `  - ${domain}: ${avg}/100`;
      })
      .join('\n');
    sections.push(`NAQ Domain Burden Scores:\n${domainLines}`);
  }

  // Active protocol
  const { data: clientProtocol } = await supabase
    .from('client_protocols')
    .select('current_phase, start_date, protocols(name)')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single();

  if (clientProtocol) {
    const protocolData = clientProtocol.protocols;
    const name = Array.isArray(protocolData)
      ? ((protocolData[0] as { name: string } | undefined)?.name ?? 'Unknown')
      : ((protocolData as { name: string } | null)?.name ?? 'Unknown');
    sections.push(
      `Active Protocol: ${name}, Phase ${clientProtocol.current_phase}` +
        (clientProtocol.start_date ? `, started ${clientProtocol.start_date}` : ''),
    );
  }

  // Active supplements
  const { data: supplements } = await supabase
    .from('supplements')
    .select('name, dose, timing')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .limit(20);

  if (supplements && supplements.length > 0) {
    const suppLines = supplements
      .map((s) => `  - ${s.name}${s.dose ? ` ${s.dose}` : ''}${s.timing ? ` (${s.timing})` : ''}`)
      .join('\n');
    sections.push(`Active Supplements:\n${suppLines}`);
  }

  // Last 3 clinical notes (summaries)
  const { data: notes } = await supabase
    .from('clinical_notes')
    .select('content, created_at, note_type')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(3);

  if (notes && notes.length > 0) {
    const noteLines = notes
      .map((n) => {
        const date = new Date(n.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const preview = n.content.slice(0, 200).replace(/\n/g, ' ');
        return `  [${date}] ${preview}${n.content.length > 200 ? '…' : ''}`;
      })
      .join('\n');
    sections.push(`Recent Clinical Notes (last 3):\n${noteLines}`);
  }

  // Client sensitivities
  const { data: sensitivities } = await supabase
    .from('client_sensitivities')
    .select('name, severity')
    .eq('client_id', clientId);

  if (sensitivities && sensitivities.length > 0) {
    const sensitivityList = sensitivities.map((s) => `${s.name} (${s.severity})`).join(', ');
    sections.push(`Dietary Sensitivities: ${sensitivityList}`);
  }

  if (sections.length === 0) return 'No prior history on file for this client.';
  return sections.join('\n\n');
}

// ─── Vocabulary compiler ──────────────────────────────────────

async function compilePractitionerVocabulary(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  practitionerId: string,
): Promise<string> {
  const { data: vocab } = await supabase
    .from('practitioner_vocabulary')
    .select('term, definition')
    .eq('practitioner_id', practitionerId);

  if (!vocab || vocab.length === 0) {
    // Default ENS/HTMA vocabulary (always included even without custom terms)
    return [
      'ENS = Enteric Nervous System',
      'HTMA = Hair Tissue Mineral Analysis',
      'MABC = Mineral and Adrenal Balance Calibration',
      'Ca/Mg ratio = Calcium to Magnesium ratio',
      'Na/K ratio = Sodium to Potassium ratio',
      'SDA = Specific Dynamic Action',
      'NTP = Nutritional Therapy Practitioner',
    ].join('\n');
  }

  return vocab.map((v) => `${v.term} = ${v.definition}`).join('\n');
}

// ─── Page ────────────────────────────────────────────────────

export default async function TranscriptionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const supabase = await createSupabaseClient();

  // Fetch session (must belong to this practitioner)
  const { data: session } = await supabase
    .from('sessions')
    .select('id, client_id, scheduled_at, duration_minutes, session_type, status')
    .eq('id', sessionId)
    .eq('practitioner_id', practitioner.id)
    .single();

  if (!session) notFound();

  // Fetch client if attached
  let client: ClientData | null = null;
  if (session.client_id) {
    const { data: clientData } = await supabase
      .from('clients')
      .select('id, first_name, last_name, primary_concern, wellness_score')
      .eq('id', session.client_id)
      .single();
    client = clientData;
  }

  // Fetch existing transcription (if any)
  const { data: existingTranscription } = await supabase
    .from('session_transcriptions')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  // Compile client history for Claude
  let clientHistory = 'No client attached to this session.';
  let vocabulary = '';
  if (client) {
    const [history, vocab] = await Promise.all([
      compileClientHistory(supabase, client.id),
      compilePractitionerVocabulary(supabase, practitioner.id),
    ]);
    clientHistory = [
      `Client Name: ${client.first_name} ${client.last_name}`,
      `Primary Concern: ${client.primary_concern ?? 'Not specified'}`,
      `Current Wellness Score: ${client.wellness_score}/100`,
      ``,
      history,
      ``,
      `PRACTITIONER VOCABULARY:`,
      vocab,
    ].join('\n');
  }

  const sessionContext = [
    `Session ID: ${sessionId}`,
    `Session Type: ${session.session_type}`,
    `Scheduled: ${new Date(session.scheduled_at).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}`,
    `Duration: ${session.duration_minutes} minutes`,
  ].join('\n');

  return (
    <TranscriptionWorkspace
      session={session as SessionData}
      client={client}
      practitionerName={practitioner.name}
      existingTranscription={existingTranscription as TranscriptionRow | null}
      clientHistory={clientHistory}
      sessionContext={sessionContext}
    />
  );
}
