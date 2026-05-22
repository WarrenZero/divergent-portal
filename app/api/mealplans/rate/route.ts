import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // Must be a client
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client record not found' }, { status: 403 });
  }

  let body: { recipeId: string; stars: number; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { recipeId, stars, comment } = body;

  if (!recipeId || typeof stars !== 'number' || stars < 1 || stars > 5) {
    return NextResponse.json({ error: 'recipeId and stars (1–5) required' }, { status: 400 });
  }

  // Upsert rating
  const { error } = await supabase.from('recipe_ratings').upsert(
    {
      client_id: client.id,
      recipe_id: recipeId,
      stars,
      comment: comment ?? null,
    },
    { onConflict: 'client_id,recipe_id' },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return updated average for this recipe
  const { data: ratings } = await supabase
    .from('recipe_ratings')
    .select('stars')
    .eq('recipe_id', recipeId);

  const allStars = ratings ?? [];
  const average =
    allStars.length > 0
      ? Math.round((allStars.reduce((s, r) => s + r.stars, 0) / allStars.length) * 10) / 10
      : null;

  return NextResponse.json({ success: true, averageRating: average, count: allStars.length });
}
