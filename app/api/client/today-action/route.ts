import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/client/today-action
// Returns the single highest-priority action the client should take today.

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();

  // Resolve client ID
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!client) return NextResponse.json({ action: 'all_done' });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [pulseRes, naqRes, sessionRes] = await Promise.all([
    // Checked in today?
    supabase
      .from('daily_pulse')
      .select('id')
      .eq('client_id', client.id)
      .gte('logged_at', todayStart.toISOString())
      .limit(1)
      .maybeSingle(),

    // Started NAQ?
    supabase
      .from('naq_responses')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.id),

    // Session tomorrow?
    (() => {
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
      return supabase
        .from('sessions')
        .select('scheduled_at')
        .eq('client_id', client.id)
        .gte('scheduled_at', tomorrowStart.toISOString())
        .lt('scheduled_at', tomorrowEnd.toISOString())
        .neq('status', 'cancelled')
        .limit(1)
        .maybeSingle();
    })(),
  ]);

  // Priority order: checkin > naq > session_tomorrow > all_done
  if (!pulseRes.data) {
    return NextResponse.json({ action: 'checkin_needed' });
  }

  if (!naqRes.count || naqRes.count === 0) {
    return NextResponse.json({ action: 'naq_needed' });
  }

  if (sessionRes.data) {
    return NextResponse.json({
      action: 'session_tomorrow',
      sessionDate: sessionRes.data.scheduled_at,
    });
  }

  return NextResponse.json({ action: 'all_done' });
}
