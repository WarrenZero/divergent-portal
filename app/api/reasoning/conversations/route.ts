import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

// ─── GET — list conversations ─────────────────────────────────────────────────

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) {
    return NextResponse.json({ conversations: [] });
  }

  const { data, error } = await supabase
    .from('reasoning_conversations')
    .select('*')
    .eq('practitioner_id', practitioner.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Conversations fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }

  return NextResponse.json({ conversations: data ?? [] });
}

// ─── POST — create conversation ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { title?: string; conversation_type?: string; client_reference?: string };
  try {
    body = await req.json() as { title?: string; conversation_type?: string; client_reference?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) {
    return NextResponse.json({ error: 'Practitioner not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('reasoning_conversations')
    .insert({
      practitioner_id: practitioner.id,
      title: body.title ?? 'New conversation',
      conversation_type: body.conversation_type ?? 'general',
      client_reference: body.client_reference ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Conversation create error:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }

  return NextResponse.json({ conversation: data }, { status: 201 });
}
