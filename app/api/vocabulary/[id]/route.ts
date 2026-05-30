import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/vocabulary/[id] — update a vocabulary term
// DELETE /api/vocabulary/[id] — delete a vocabulary term

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: { term?: string; definition?: string; phonetic_variants?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('practitioner_vocabulary')
    .update({
      ...(body.term && { term: body.term.trim() }),
      ...(body.definition && { definition: body.definition.trim() }),
      ...(body.phonetic_variants !== undefined && { phonetic_variants: body.phonetic_variants }),
    })
    .eq('id', id)
    .select('id, term, definition, phonetic_variants, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ term: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from('practitioner_vocabulary')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
