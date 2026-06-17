import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// ─── GET — messages for a conversation ────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Ownership check: RLS policy ensures only the owning practitioner can access
  const { data: conversation } = await supabase
    .from('reasoning_conversations')
    .select('id')
    .eq('id', id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('reasoning_messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

// ─── POST — save a new user message ──────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: { role: 'user' | 'assistant'; content: string; attached_files?: unknown[] };
  try {
    body = await req.json() as { role: 'user' | 'assistant'; content: string; attached_files?: unknown[] };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.role || !body.content) {
    return NextResponse.json({ error: 'role and content are required' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reasoning_messages')
    .insert({
      conversation_id: id,
      role: body.role,
      content: body.content,
      attached_files: body.attached_files ?? [],
    })
    .select()
    .single();

  if (error) {
    console.error('Message insert error:', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }

  // Update conversation message_count and updated_at
  await supabase
    .from('reasoning_conversations')
    .update({
      message_count: supabase.rpc('increment_message_count', { conv_id: id }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  return NextResponse.json({ message: data }, { status: 201 });
}
