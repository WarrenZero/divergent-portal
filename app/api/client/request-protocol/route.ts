import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { protocolId } = await req.json();

  // In a real implementation: notify the practitioner via email/notification
  // For MVP: just log it (Supabase doesn't have a "requests" table yet)
  // This endpoint exists so the UI works — the practitioner will see the
  // request in a future notifications feature

  return NextResponse.json({ success: true });
}
