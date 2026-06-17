import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileUpdateBody {
  full_name?: string;
  credentials?: string[];
  certifying_body?: string;
  training_hours?: number;
  years_in_practice?: number;
  year_certified?: number;
  active_client_count?: string;
  primary_client_types?: string[];
  primary_conditions?: string[];
  age_ranges_served?: string[];
  average_protocol_length?: string;
  labs_ordered?: string[];
  lab_interpretation_approach?: string;
  preferred_lab_companies?: string[];
  primary_frameworks?: string[];
  dietary_approaches?: string[];
  supplement_philosophy?: string;
  protocol_building_approach?: string;
  htma_first_look?: string;
  challenging_patterns?: string;
  information_style?: 'brief' | 'balanced' | 'detailed';
  additional_context?: string;
  intelligence_level?: string;
  onboarding_complete?: boolean;
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) {
    return NextResponse.json({ profile: null, subscription: null });
  }

  const [profileResult, subscriptionResult] = await Promise.all([
    supabase
      .from('practitioner_profiles')
      .select('*')
      .eq('practitioner_id', practitioner.id)
      .single(),
    supabase
      .from('reasoning_subscriptions')
      .select('status, trial_ends_at, tier')
      .eq('practitioner_id', practitioner.id)
      .single(),
  ]);

  return NextResponse.json({
    profile: profileResult.data ?? null,
    subscription: subscriptionResult.data ?? null,
  });
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: ProfileUpdateBody;
  try {
    body = await req.json() as ProfileUpdateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) {
    return NextResponse.json({ error: 'Practitioner not found' }, { status: 404 });
  }

  const updatePayload: ProfileUpdateBody & { updated_at: string; completed_at?: string } = {
    ...body,
    updated_at: new Date().toISOString(),
  };

  if (body.onboarding_complete) {
    updatePayload.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('practitioner_profiles')
    .upsert(
      { practitioner_id: practitioner.id, ...updatePayload },
      { onConflict: 'practitioner_id' },
    )
    .select()
    .single();

  if (error) {
    console.error('Profile upsert error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
