import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

// ─── GET — list files ─────────────────────────────────────────────────────────

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
    return NextResponse.json({ files: [] });
  }

  const { data, error } = await supabase
    .from('reasoning_files')
    .select('*')
    .eq('practitioner_id', practitioner.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Files fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }

  return NextResponse.json({ files: data ?? [] });
}

// ─── POST — save file metadata after upload ───────────────────────────────────
// The actual file upload goes directly to Supabase Storage from the client.
// This endpoint saves the metadata record.

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    file_name?: string;
    file_type?: string;
    file_size?: number;
    storage_path?: string;
    content_extracted?: string;
    file_category?: string;
    client_reference?: string;
    entry_date?: string;
    notes?: string;
    tags?: string[];
    conversation_id?: string;
  };

  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.file_name) {
    return NextResponse.json({ error: 'file_name is required' }, { status: 400 });
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
    .from('reasoning_files')
    .insert({
      practitioner_id: practitioner.id,
      file_name: body.file_name,
      file_type: body.file_type ?? 'application/octet-stream',
      file_size: body.file_size ?? 0,
      storage_path: body.storage_path ?? null,
      content_extracted: body.content_extracted ?? null,
      file_category: body.file_category ?? 'general',
      client_reference: body.client_reference ?? null,
      entry_date: body.entry_date ?? new Date().toISOString().split('T')[0],
      notes: body.notes ?? null,
      tags: body.tags ?? [],
      conversation_id: body.conversation_id ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('File record create error:', error);
    return NextResponse.json({ error: 'Failed to save file record' }, { status: 500 });
  }

  return NextResponse.json({ file: data }, { status: 201 });
}
