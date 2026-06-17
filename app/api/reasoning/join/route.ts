import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // This endpoint is called after Clerk auth is complete — either from the
  // onboarding page on load, or directly after the join form.
  // It creates the practitioner record + reasoning_subscription if they don't exist.

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { email?: string; firstName?: string; lastName?: string };
  try {
    body = await req.json() as { email?: string; firstName?: string; lastName?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, firstName, lastName } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Use service client so we can write even before RLS session is set
  const supabase = await createServiceClient();

  // 1. Upsert practitioner record
  const { data: existing } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  let practitionerId: string;

  if (existing?.id) {
    practitionerId = existing.id;
  } else {
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Practitioner';

    const { data: newPractitioner, error: insertError } = await supabase
      .from('practitioners')
      .insert({
        clerk_user_id: userId,
        name: fullName,
        email,
      })
      .select('id')
      .single();

    if (insertError || !newPractitioner) {
      console.error('Failed to create practitioner:', insertError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    practitionerId = newPractitioner.id;
  }

  // 2. Upsert reasoning_subscription
  const { data: existingSub } = await supabase
    .from('reasoning_subscriptions')
    .select('id')
    .eq('practitioner_id', practitionerId)
    .single();

  let subscriptionId: string;

  if (existingSub?.id) {
    subscriptionId = existingSub.id;
  } else {
    const { data: newSub, error: subError } = await supabase
      .from('reasoning_subscriptions')
      .insert({
        practitioner_id: practitionerId,
        email,
        status: 'trial',
        tier: 'reasoning',
      })
      .select('id')
      .single();

    if (subError || !newSub) {
      console.error('Failed to create subscription:', subError);
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }

    subscriptionId = newSub.id;
  }

  return NextResponse.json({ practitionerId, subscriptionId });
}
