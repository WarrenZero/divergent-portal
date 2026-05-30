import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/vocabulary — create a new vocabulary term

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { term: string; definition: string; phonetic_variants: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { term, definition, phonetic_variants } = body;
  if (!term?.trim() || !definition?.trim()) {
    return NextResponse.json({ error: 'term and definition required' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) return NextResponse.json({ error: 'Practitioner not found' }, { status: 403 });

  const { data, error } = await supabase
    .from('practitioner_vocabulary')
    .insert({
      practitioner_id: practitioner.id,
      term: term.trim(),
      definition: definition.trim(),
      phonetic_variants: phonetic_variants ?? [],
    })
    .select('id, term, definition, phonetic_variants, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ term: data });
}
