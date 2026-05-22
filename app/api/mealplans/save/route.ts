import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client record not found' }, { status: 403 });
  }

  let body: { recipeId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { recipeId } = body;
  if (!recipeId) {
    return NextResponse.json({ error: 'recipeId required' }, { status: 400 });
  }

  // Check if already saved
  const { data: existing } = await supabase
    .from('recipe_saves')
    .select('id')
    .eq('client_id', client.id)
    .eq('recipe_id', recipeId)
    .maybeSingle();

  if (existing) {
    // Unsave
    await supabase.from('recipe_saves').delete().eq('id', existing.id);
    return NextResponse.json({ saved: false });
  } else {
    // Save
    await supabase.from('recipe_saves').insert({ client_id: client.id, recipe_id: recipeId });
    return NextResponse.json({ saved: true });
  }
}

export async function DELETE(req: NextRequest) {
  // Alias for unsave via DELETE method
  return POST(req);
}
