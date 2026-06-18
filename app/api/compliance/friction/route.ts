import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

// ─── Types ─────────────────────────────────────────────────────

interface FrictionBody {
  clientId: string;
  reasons: string[];
  note?: string;
}

type PsychState = 'motivated' | 'steady' | 'struggling' | 'overwhelmed' | 'avoidant' | 'ashamed';

// ─── Helpers ───────────────────────────────────────────────────

function derivePsychState(reasons: string[]): PsychState {
  if (reasons.includes("Ashamed I haven't kept up")) return 'ashamed';
  if (reasons.includes('Felt overwhelmed') || reasons.length >= 3) return 'overwhelmed';
  if (reasons.includes("Wasn't sure it was helping")) return 'avoidant';
  if (reasons.includes('Felt discouraged')) return 'struggling';
  if (reasons.length === 1 && reasons[0] === 'Needed a break') return 'steady';
  if (reasons.length === 0) return 'motivated';
  return 'struggling';
}

function deriveFrictionLevel(count: number): number {
  if (count <= 1) return count === 0 ? 1 : 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  if (count <= 6) return 4;
  return 5;
}

// ─── Route ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: FrictionBody;
  try {
    body = await req.json() as FrictionBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { clientId, reasons, note } = body;
  if (!clientId || !Array.isArray(reasons)) {
    return NextResponse.json({ error: 'clientId and reasons are required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify this Clerk user owns the clientId
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('clerk_user_id', userId)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const psychState = derivePsychState(reasons);
  const frictionLevel = deriveFrictionLevel(reasons.length);
  const shameActive = psychState === 'ashamed' || psychState === 'overwhelmed';

  // Insert compliance log
  const { error: insertError } = await supabase.from('compliance_logs').insert({
    client_id: clientId,
    friction_level: frictionLevel,
    friction_reasons: reasons,
    psychological_state: psychState,
    client_note: note ?? null,
  });

  if (insertError) {
    console.error('compliance_logs insert error:', insertError);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  // Update client behavioral state
  await supabase
    .from('clients')
    .update({
      last_psychological_state: psychState,
      shame_signal_active: shameActive,
    })
    .eq('id', clientId);

  return NextResponse.json({ ok: true, psychState, shameActive });
}
