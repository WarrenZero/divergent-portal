import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

// ─── GET — list notes ─────────────────────────────────────────────────────────

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
    return NextResponse.json({ notes: [] });
  }

  // Pinned notes first, then by entry_date desc
  const { data, error } = await supabase
    .from('reasoning_notes')
    .select('*')
    .eq('practitioner_id', practitioner.id)
    .order('is_pinned', { ascending: false })
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Notes fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }

  return NextResponse.json({ notes: data ?? [] });
}

// ─── POST — create note ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    title?: string;
    content?: string;
    client_reference?: string;
    entry_date?: string;
    entry_time?: string;
    note_type?: string;
    is_pinned?: boolean;
    tags?: string[];
    conversation_id?: string;
  };

  try {
    body = await req.json() as typeof body;
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
    .from('reasoning_notes')
    .insert({
      practitioner_id: practitioner.id,
      title: body.title ?? 'Untitled note',
      content: body.content ?? '',
      client_reference: body.client_reference ?? null,
      entry_date: body.entry_date ?? new Date().toISOString().split('T')[0],
      entry_time: body.entry_time ?? null,
      note_type: body.note_type ?? 'general',
      is_pinned: body.is_pinned ?? false,
      tags: body.tags ?? [],
      conversation_id: body.conversation_id ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Note create error:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }

  return NextResponse.json({ note: data }, { status: 201 });
}
