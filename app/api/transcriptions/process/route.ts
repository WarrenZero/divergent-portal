import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { anthropic, COPILOT_MODEL } from '@/lib/anthropic/client';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────

interface ProcessRequest {
  transcriptionId: string;
  rawTranscript: string;
  clientHistory: string;
  sessionContext: string;
  practitionerName: string;
  clientName: string;
  speakerSegments: SpeakerSegment[];
  acousticMetatags: AcousticMetatag[];
  audioDurationSeconds: number | null;
}

interface SpeakerSegment {
  speaker: 'WARREN' | 'CLIENT';
  text: string;
  start_ms?: number;
  end_ms?: number;
  confidence?: number;
}

interface AcousticMetatag {
  text: string;
  tone: string;
}

interface ChecklistItem {
  id: string;
  item: string;
  type: 'supplement' | 'lab' | 'protocol' | 'followup';
  value: string;
  priority: 'high' | 'medium';
}

interface Trendline {
  direction: 'up' | 'down' | 'stable';
  symptom: string;
  quote: string;
  confidence: number;
}

interface ClaudeOutput {
  lens_clean_transcript: string;
  lens_clinical_matrix: {
    presenting_concerns: string;
    root_cause_observations: string;
    htma_patterns: string;
    protocol_updates: string;
    objective_metrics: string;
    timeline_markers: string;
    trajectory_summary: string;
  };
  lens_client_roadmap: string;
  verification_checklist: ChecklistItem[];
  qualitative_trendlines: Trendline[];
}

// ─── System prompt ────────────────────────────────────────────

const TRANSCRIPTION_SYSTEM = `You are a clinical documentation AI for a Nutritional Therapy Practitioner (NTP) specializing in HTMA mineral analysis, ENS restoration protocols, and root-cause nutrition.

Your job is to process a session transcript and generate structured clinical documentation. You must be precise, liability-aware, and clinically rigorous.

CRITICAL RULES:
1. Never fabricate clinical details — document only what appears in the transcript.
2. If a clinical statement is ambiguous, flag it with [VERIFY] in the text.
3. Use observational language: "client reported," "practitioner noted," "discussed."
4. Never state outcomes as guaranteed — use "may support," "restoration approach."
5. Flag any supplement dosages, lab values, or protocol changes for the verification checklist.
6. The clean transcript must preserve exact speaker language — do not paraphrase.

CLINICAL LEXICON (never misidentify these terms):
ENS = Enteric Nervous System
HTMA = Hair Tissue Mineral Analysis
MABC = Mineral and Adrenal Balance Calibration
Ca/Mg = Calcium to Magnesium ratio (thyroid/parathyroid indicator)
Na/K = Sodium to Potassium ratio (adrenal function indicator)
SDA = Specific Dynamic Action (thermogenic effect of food)
NTP = Nutritional Therapy Practitioner
Fast Oxidizer = Sympathetic-dominant metabolic type
Slow Oxidizer = Parasympathetic-dominant metabolic type

Return a single valid JSON object matching this exact schema — no markdown, no explanation, only JSON:
{
  "lens_clean_transcript": "string — full dialogue with WARREN: / CLIENT: speaker labels, filler words removed, each sentence on its own line",
  "lens_clinical_matrix": {
    "presenting_concerns": "string — what client reported at session start",
    "root_cause_observations": "string — clinical patterns noted, linked to NAQ domains if mentioned",
    "htma_patterns": "string — mineral ratios or HTMA findings discussed, or 'Not discussed this session'",
    "protocol_updates": "string — changes to supplements or protocol phase, exact dosages in [DOSAGE] markers",
    "objective_metrics": "string — lab values, scores, or measurements discussed",
    "timeline_markers": "string — key dates mentioned (started protocol Day X, symptoms began, next labs)",
    "trajectory_summary": "string — 2-3 sentence directional summary of client progress"
  },
  "lens_client_roadmap": "string — warm plain-language action plan with these sections separated by \\n\\n: 'What we talked about today:', 'Your focus for this week:', 'Watch for these changes:', 'Your next appointment:', 'A note from Warren:'",
  "verification_checklist": [
    {
      "id": "string — uuid-like e.g. vc_1",
      "item": "string — human-readable label",
      "type": "supplement | lab | protocol | followup",
      "value": "string — specific value to verify",
      "priority": "high | medium"
    }
  ],
  "qualitative_trendlines": [
    {
      "direction": "up | down | stable",
      "symptom": "string — symptom or domain name",
      "quote": "string — exact quote from transcript showing this direction",
      "confidence": 0.0-1.0
    }
  ]
}`;

// ─── Route ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: ProcessRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    transcriptionId,
    rawTranscript,
    clientHistory,
    sessionContext,
    practitionerName,
    clientName,
    speakerSegments,
    acousticMetatags,
    audioDurationSeconds,
  } = body;

  if (!transcriptionId || !rawTranscript) {
    return NextResponse.json({ error: 'transcriptionId and rawTranscript required' }, { status: 400 });
  }

  // Mark as processing
  const supabase = await createClient();
  await supabase
    .from('session_transcriptions')
    .update({ status: 'processing' })
    .eq('id', transcriptionId);

  // Build the user prompt for Claude
  const userPrompt = `SESSION CONTEXT:
${sessionContext}

CLIENT HISTORY CONTEXT:
${clientHistory}

TRANSCRIPT (${practitionerName} / ${clientName}):
${rawTranscript}

Generate the complete clinical documentation package for this session.`;

  let claudeOutput: ClaudeOutput;
  try {
    const message = await anthropic.messages.create({
      model: COPILOT_MODEL,
      max_tokens: 4096,
      system: TRANSCRIPTION_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawContent = message.content[0];
    if (rawContent.type !== 'text') throw new Error('Unexpected response type');

    // Strip any markdown fences Claude might wrap around JSON
    const jsonText = rawContent.text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    claudeOutput = JSON.parse(jsonText) as ClaudeOutput;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude processing failed';
    console.error('Transcription Claude error:', msg);

    await supabase
      .from('session_transcriptions')
      .update({ status: 'error', error_message: msg })
      .eq('id', transcriptionId);

    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Stamp acoustic metatags (from AssemblyAI sentiment) into the output
  const finalMetatags = acousticMetatags.length > 0
    ? acousticMetatags
    : claudeOutput.qualitative_trendlines.map((t) => ({
        text: t.quote.slice(0, 60),
        tone: t.direction === 'up' ? 'Rising' : t.direction === 'down' ? 'Dropping' : 'Steady',
      }));

  // Persist everything to DB
  const serviceClient = await createServiceClient();
  const { error: saveError } = await serviceClient
    .from('session_transcriptions')
    .update({
      raw_transcript: rawTranscript,
      audio_duration_seconds: audioDurationSeconds,
      speaker_segments: speakerSegments,
      lens_clean_transcript: claudeOutput.lens_clean_transcript,
      lens_clinical_matrix: claudeOutput.lens_clinical_matrix,
      lens_client_roadmap: claudeOutput.lens_client_roadmap,
      verification_checklist: claudeOutput.verification_checklist.map((item) => ({
        ...item,
        confirmed: false,
      })),
      qualitative_trendlines: claudeOutput.qualitative_trendlines,
      acoustic_metatags: finalMetatags,
      status: 'complete',
    })
    .eq('id', transcriptionId);

  if (saveError) {
    console.error('Transcription save error:', saveError);
    return NextResponse.json({ error: 'Failed to save transcription' }, { status: 500 });
  }

  // Auto-create a clinical note of type 'copilot_summary'
  const matrix = claudeOutput.lens_clinical_matrix;
  const noteContent = [
    `## Session Transcript Summary`,
    ``,
    `**Presenting Concerns:** ${matrix.presenting_concerns}`,
    ``,
    `**Root Cause Observations:** ${matrix.root_cause_observations}`,
    ``,
    `**HTMA Patterns:** ${matrix.htma_patterns}`,
    ``,
    `**Protocol Updates:** ${matrix.protocol_updates}`,
    ``,
    `**Trajectory:** ${matrix.trajectory_summary}`,
  ].join('\n');

  // Get practitioner and client IDs from the transcription record
  const { data: txRecord } = await supabase
    .from('session_transcriptions')
    .select('practitioner_id, client_id')
    .eq('id', transcriptionId)
    .single();

  if (txRecord) {
    const sc = await createServiceClient();
    await sc.from('clinical_notes').insert({
      practitioner_id: txRecord.practitioner_id,
      client_id: txRecord.client_id,
      note_type: 'copilot_summary',
      content: noteContent,
    });
  }

  // Return the completed transcription
  const { data: finalRecord } = await supabase
    .from('session_transcriptions')
    .select('*')
    .eq('id', transcriptionId)
    .single();

  return NextResponse.json({ transcription: finalRecord });
}
