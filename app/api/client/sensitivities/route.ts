import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 403 });

  let body: { name: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('client_sensitivities')
    .insert({ client_id: client.id, sensitivity_name: body.name.trim() })
    .select('id, sensitivity_name')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id, name: data.sensitivity_name });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('client_sensitivities')
    .delete()
    .eq('id', id)
    .eq('client_id', client.id); // RLS reinforcement — ensure ownership

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
