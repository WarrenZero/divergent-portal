import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

// ─── AssemblyAI transcript status poll ────────────────────────
// GET /api/transcriptions/assemblyai/status?id=<assemblyai_transcript_id>
// Returns status + parsed result when complete.

const ASSEMBLYAI_BASE = 'https://api.assemblyai.com/v2';

interface AssemblyWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string | null;
}

interface AssemblySentiment {
  text: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  start: number;
  end: number;
}

interface AssemblyHighlight {
  text: string;
  count: number;
  rank: number;
}

interface AssemblyTranscript {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text: string | null;
  words: AssemblyWord[] | null;
  utterances: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
    confidence: number;
    words: AssemblyWord[];
  }> | null;
  sentiment_analysis_results: AssemblySentiment[] | null;
  auto_highlights_result: {
    results: AssemblyHighlight[];
  } | null;
  error: string | null;
  audio_duration: number | null;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AssemblyAI not configured' }, { status: 503 });

  const transcriptId = req.nextUrl.searchParams.get('id');
  if (!transcriptId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const res = await fetch(`${ASSEMBLYAI_BASE}/transcript/${transcriptId}`, {
    headers: { authorization: apiKey },
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'AssemblyAI request failed' }, { status: 502 });
  }

  const data = await res.json() as AssemblyTranscript;

  if (data.status === 'error') {
    return NextResponse.json({ status: 'error', error: data.error });
  }

  if (data.status !== 'completed') {
    return NextResponse.json({ status: data.status });
  }

  // Build structured speaker_segments from utterances
  const speakerSegments = (data.utterances ?? []).map((u) => ({
    speaker: u.speaker === 'A' ? 'WARREN' : 'CLIENT',
    text: u.text,
    start_ms: u.start,
    end_ms: u.end,
    confidence: u.confidence,
  }));

  // Build raw transcript from utterances for readability
  const rawTranscript = speakerSegments
    .map((s) => `${s.speaker}: ${s.text}`)
    .join('\n\n');

  // Acoustic metatags from sentiment (Phase 2 placeholder — seed basic data)
  const acousticMetatags = (data.sentiment_analysis_results ?? [])
    .filter((s) => s.sentiment !== 'NEUTRAL')
    .slice(0, 20)
    .map((s) => ({
      text: s.text.slice(0, 60),
      tone: s.sentiment === 'POSITIVE' ? 'Softening' : 'Tension',
    }));

  return NextResponse.json({
    status: 'completed',
    rawTranscript,
    speakerSegments,
    acousticMetatags,
    audioDurationSeconds: data.audio_duration
      ? Math.round(data.audio_duration / 1000)
      : null,
  });
}
