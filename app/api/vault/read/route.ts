import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST — mark vault item as read
// Body: { itemId: string }

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();

  // Resolve client record from Clerk user
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

  const { error } = await supabase
    .from('vault_items')
    .update({ is_read: true })
    .eq('id', itemId)
    .eq('client_id', client.id);

  if (error) {
    console.error('vault read update error:', error);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
