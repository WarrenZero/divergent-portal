import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST — toggle bookmark on a vault item
// Body: { itemId: string }
// Reads current value and flips it

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 403 });
  }

  let body: { itemId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { itemId } = body;
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });

  // Fetch current value
  const { data: item } = await supabase
    .from('vault_items')
    .select('is_bookmarked')
    .eq('id', itemId)
    .eq('client_id', client.id)
    .single();

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('vault_items')
    .update({ is_bookmarked: !item.is_bookmarked })
    .eq('id', itemId)
    .eq('client_id', client.id);

  if (error) {
    console.error('vault bookmark update error:', error);
    return NextResponse.json({ error: 'Failed to update bookmark' }, { status: 500 });
  }

  return NextResponse.json({ success: true, isBookmarked: !item.is_bookmarked });
}
