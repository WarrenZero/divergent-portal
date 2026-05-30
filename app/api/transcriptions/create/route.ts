import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ─── Create a new transcription record in 'recording' status ──
// Called at the start of processing before Claude runs.

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { sessionId: string; clientId: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionId, clientId } = body;
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const supabase = await createClient();

  // Resolve practitioner
  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) return NextResponse.json({ error: 'Practitioner not found' }, { status: 403 });

  // Verify session belongs to this practitioner
  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('practitioner_id', practitioner.id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Upsert transcription record (one per session)
  const { data: existing } = await supabase
    .from('session_transcriptions')
    .select('id')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existing) {
    // Reset to processing if it was previously errored
    await supabase
      .from('session_transcriptions')
      .update({ status: 'processing' })
      .eq('id', existing.id);
    return NextResponse.json({ id: existing.id });
  }

  const { data: created, error } = await supabase
    .from('session_transcriptions')
    .insert({
      session_id: sessionId,
      client_id: clientId,
      practitioner_id: practitioner.id,
      status: 'processing',
    })
    .select('id')
    .single();

  if (error || !created) {
    console.error('Create transcription error:', error);
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }

  return NextResponse.json({ id: created.id });
}
