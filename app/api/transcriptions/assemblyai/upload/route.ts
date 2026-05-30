import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

// ─── AssemblyAI upload + transcript submission ─────────────────
// Returns the AssemblyAI transcript ID immediately.
// Client polls /api/transcriptions/assemblyai/status to get result.

const ASSEMBLYAI_BASE = 'https://api.assemblyai.com/v2';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    // No key configured — return a signal for the client to use Web Speech fallback
    return NextResponse.json({ fallback: true });
  }

  // Parse multipart form: { audio: File }
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const audioFile = formData.get('audio') as File | null;
  if (!audioFile) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  }

  // 1. Upload audio to AssemblyAI storage
  const audioBuffer = await audioFile.arrayBuffer();
  const uploadRes = await fetch(`${ASSEMBLYAI_BASE}/upload`, {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/octet-stream',
      'transfer-encoding': 'chunked',
    },
    body: audioBuffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error('AssemblyAI upload error:', err);
    return NextResponse.json({ error: 'AssemblyAI upload failed' }, { status: 502 });
  }

  const { upload_url } = await uploadRes.json() as { upload_url: string };

  // 2. Submit transcription job with diarization + sentiment + highlights
  const transcriptRes = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: upload_url,
      speaker_labels: true,
      speakers_expected: 2,
      sentiment_analysis: true,
      auto_highlights: true,
    }),
  });

  if (!transcriptRes.ok) {
    const err = await transcriptRes.text();
    console.error('AssemblyAI transcript create error:', err);
    return NextResponse.json({ error: 'AssemblyAI job creation failed' }, { status: 502 });
  }

  const transcript = await transcriptRes.json() as { id: string; status: string };

  return NextResponse.json({ transcriptId: transcript.id });
}
