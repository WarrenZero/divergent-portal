import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────

interface ClientRow {
  id: string;
  first_name: string;
  email: string | null;
  wellness_score: number;
  subscription_tier: string | null;
}

interface PulseRow {
  digestion_score: number | null;
  sleep_score: number | null;
  stress_score: number | null;
  logged_at: string;
}

interface JournalRow {
  foods_eaten: string | null;
  symptoms: string | null;
  logged_at: string;
}

interface FocusRow {
  focus_items: string[] | null;
}

// ─── Helpers ──────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildDotRow(loggedDays: Set<string>, now: Date): string {
  const dots: string[] = [];
  const labels: string[] = [];
  // Build Mon–Sun of the current week
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay()); // go to Sunday
  for (let i = 1; i <= 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + (i % 7)); // Mon=1 … Sun=0→7
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    dots.push(loggedDays.has(key) ? '●' : '○');
    labels.push(DAYS[d.getDay()]);
  }
  const dotRow = dots.join('  ');
  const labelRow = labels.map((l) => l.padEnd(3)).join(' ');
  return `<p style="font-family:monospace;font-size:18px;color:#C07848;letter-spacing:0.1em;margin:0 0 4px;">${dotRow}</p>
          <p style="font-family:monospace;font-size:10px;color:#9A8A72;letter-spacing:0.12em;margin:0 0 16px;">${labelRow}</p>`;
}

function feelingLabel(avg: number): string {
  if (avg >= 5.0) return "😄 Excellent — notice what's working";
  if (avg >= 4.0) return '😊 A good week — keep going';
  if (avg >= 3.0) return '🙂 Steady and building';
  if (avg >= 2.0) return '😐 Working through it — your body is communicating';
  return '😔 Challenging week — this is data, not failure';
}

function consistencyNote(count: number): string {
  if (count === 7) return 'Perfect week. Every day matters.';
  if (count >= 5) return 'Strong week. Consistency wins.';
  if (count >= 3) return `${count} days of data is meaningful. Keep going.`;
  return "This week was hard. Tomorrow is a fresh start.";
}

function buildWeeklyEmailHtml(
  firstName: string,
  pulseCount: number,
  avgEnergy: number,
  topFoods: string[],
  topSymptom: string | null,
  focusItem: string,
  wellnessScore: number,
  portalUrl: string,
  loggedDaySet: Set<string>,
  now: Date,
): string {
  const dotHtml = buildDotRow(loggedDaySet, now);
  const feelingText = feelingLabel(avgEnergy);
  const consistencyText = consistencyNote(pulseCount);

  const foodHtml = topFoods.length > 0
    ? `<p style="font-family:Georgia,serif;font-size:14px;color:#5A4C38;line-height:1.7;margin:0 0 8px;">
        Most frequent foods this week: <strong>${topFoods.slice(0, 3).join(', ')}</strong>
       </p>`
    : `<p style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#9A8A72;line-height:1.7;margin:0 0 8px;">
        You didn't log any meals this week. That's your biggest opportunity for next week — even one entry per day builds patterns the AI can learn from.
       </p>`;

  const symptomHtml = topSymptom
    ? `<p style="font-family:Georgia,serif;font-size:14px;color:#5A4C38;line-height:1.7;margin:0;">Most common symptom noted: <strong>${topSymptom}</strong></p>`
    : `<p style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#9A8A72;line-height:1.7;margin:0;">No significant symptoms noted — keep logging to build your picture.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8F2E8;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F2E8;">
<tr><td align="center" style="padding:32px 20px 48px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:#0F1F13;border-radius:10px 10px 0 0;padding:18px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="color:#C07848;font-size:18px;">✦</td>
      <td style="font-family:'Syne',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#B0C8B4;text-align:right;">DIVERGENT · WEEKLY REVIEW</td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#C07848;height:2px;font-size:0;">&nbsp;</td></tr>

  <!-- Body -->
  <tr><td style="background:#FDFAF5;padding:32px 28px;border-radius:0 0 10px 10px;border:1px solid #E8DECE;border-top:none;">

    <p style="font-family:Georgia,serif;font-size:17px;font-weight:bold;color:#0F1F13;margin:0 0 20px;">Hi ${firstName},</p>
    <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;margin:0 0 24px;line-height:1.7;">Here's how your week looked:</p>

    <!-- Consistency -->
    <p style="font-family:'Syne',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#C07848;margin:0 0 10px;padding-top:4px;border-top:1px solid #E8DECE;">
      Consistency
    </p>
    ${dotHtml}
    <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;margin:0 0 6px;">You checked in <strong>${pulseCount} of 7 days</strong>.</p>
    <p style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#3A5C42;margin:0 0 24px;">${consistencyText}</p>

    <!-- Feeling -->
    <p style="font-family:'Syne',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#C07848;margin:0 0 10px;padding-top:4px;border-top:1px solid #E8DECE;">
      Your Feeling This Week
    </p>
    <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;margin:0 0 24px;line-height:1.7;">${feelingText}</p>

    <!-- Journal -->
    <p style="font-family:'Syne',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#C07848;margin:0 0 10px;padding-top:4px;border-top:1px solid #E8DECE;">
      What Your Journal Showed
    </p>
    ${foodHtml}
    ${symptomHtml}
    <p style="margin:0 0 24px;"></p>

    <!-- Focus -->
    <p style="font-family:'Syne',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#C07848;margin:0 0 10px;padding-top:4px;border-top:1px solid #E8DECE;">
      Your Focus This Week
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="padding:12px 16px;background:#DDE8DE;border-radius:8px;border-left:3px solid #3A5C42;">
        <p style="font-family:Georgia,serif;font-size:14px;color:#2A4330;line-height:1.65;margin:0;">${focusItem}</p>
      </td></tr>
    </table>

    <!-- Wellness Score -->
    <p style="font-family:'Syne',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#C07848;margin:0 0 10px;padding-top:4px;border-top:1px solid #E8DECE;">
      Wellness Score
    </p>
    <p style="font-family:'Syne',Arial,sans-serif;font-size:28px;font-weight:800;color:#C07848;margin:0 0 4px;">${wellnessScore}<span style="font-size:16px;color:#9A8A72;">/100</span></p>
    <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#9A8A72;margin:0 0 28px;">Track your full picture at divergentportal.com</p>

    <!-- Closing -->
    <p style="font-family:Georgia,serif;font-style:italic;font-size:15px;color:#5A4C38;line-height:1.75;margin:0 0 8px;">
      One week closer to understanding what your body has been trying to tell you.
    </p>
    <p style="font-family:Georgia,serif;font-size:14px;color:#5A4C38;margin:0 0 24px;">Keep going.<br><br>— Warren</p>

    <!-- CTA -->
    <p style="text-align:center;margin:0 0 28px;">
      <a href="${portalUrl}/checkin" style="display:inline-block;padding:14px 32px;background:#C07848;color:#fff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;">
        Open My Portal →
      </a>
    </p>

    <!-- Footer -->
    <p style="font-family:Georgia,serif;font-size:11px;color:#9A8A72;margin:0;padding-top:16px;border-top:1px solid #E8DECE;line-height:1.6;">
      Divergent Nutritional Therapy · <a href="mailto:warren@divergentnt.com" style="color:#C07848;">warren@divergentnt.com</a>
    </p>

  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Route ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Allow either a cron secret header or practitioner-triggered call
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const incomingSecret = req.headers.get('x-cron-secret');
    // Also allow calls without a secret header (practitioner dashboard trigger)
    // Only enforce the secret when the header is actually present
    if (incomingSecret && incomingSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let targetClientId: string | null = null;
  try {
    const body = (await req.json()) as { clientId?: string };
    targetClientId = body.clientId ?? null;
  } catch {
    // No body — send to all eligible clients
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const supabase = await createServiceClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://divergentportal.com';

  // Fetch clients — either a specific one or all who have logged in the past 7 days
  let clientQuery = supabase
    .from('clients')
    .select('id, first_name, email, wellness_score, subscription_tier')
    .not('email', 'is', null);

  if (targetClientId) {
    clientQuery = clientQuery.eq('id', targetClientId);
  }

  const { data: allClients } = await clientQuery;
  const clients = (allClients ?? []) as ClientRow[];

  const { Resend } = await import('resend');
  const resend = new Resend(resendKey);

  let sent = 0;
  let skipped = 0;

  for (const client of clients) {
    if (!client.email) { skipped++; continue; }

    // Check for pulse activity in last 7 days
    const { data: pulseRows } = await supabase
      .from('daily_pulse')
      .select('digestion_score, sleep_score, stress_score, logged_at')
      .eq('client_id', client.id)
      .gte('logged_at', sevenDaysAgo)
      .order('logged_at', { ascending: true });

    const pulses = (pulseRows ?? []) as PulseRow[];

    // If sending to all (not targeted), skip clients with no activity
    if (!targetClientId && pulses.length === 0) { skipped++; continue; }

    // Build logged day set for dot visualization
    const loggedDaySet = new Set(
      pulses.map((p) => {
        const d = new Date(p.logged_at);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }),
    );

    // Average energy proxy
    const avgEnergy = pulses.length > 0
      ? pulses.reduce((sum, p) => {
          const proxy = ((p.digestion_score ?? 5) + (p.sleep_score ?? 5) + (11 - (p.stress_score ?? 5))) / 3;
          return sum + proxy;
        }, 0) / pulses.length
      : 0;

    // Journal data
    const { data: journalRows } = await supabase
      .from('journal_entries')
      .select('foods_eaten, symptoms, logged_at')
      .eq('client_id', client.id)
      .gte('logged_at', sevenDaysAgo);

    const journals = (journalRows ?? []) as JournalRow[];

    const allFoods = journals
      .flatMap((j) => (j.foods_eaten ?? '').split(/[,\n]+/))
      .map((f) => f.trim().toLowerCase())
      .filter(Boolean);
    const foodFreq: Record<string, number> = {};
    for (const f of allFoods) foodFreq[f] = (foodFreq[f] ?? 0) + 1;
    const topFoods = Object.entries(foodFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([f]) => f);

    const symptomWords = journals
      .flatMap((j) => (j.symptoms ?? '').split(/[,\n;]+/))
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const symFreq: Record<string, number> = {};
    for (const s of symptomWords) symFreq[s] = (symFreq[s] ?? 0) + 1;
    const topSymptom = Object.entries(symFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Protocol weekly focus
    let focusItem = 'Continue building your foundation — one check-in, one meal entry, one article this week.';
    const { data: protocolData } = await supabase
      .from('client_protocols')
      .select('start_date, protocol_id')
      .eq('client_id', client.id)
      .eq('is_active', true)
      .maybeSingle();

    if (protocolData?.protocol_id && protocolData.start_date) {
      const startDate = new Date(protocolData.start_date);
      const weekNum = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
      const { data: focusData } = await supabase
        .from('protocol_week_focus')
        .select('focus_items')
        .eq('protocol_id', protocolData.protocol_id)
        .eq('week_number', weekNum)
        .maybeSingle();
      const focus = focusData as FocusRow | null;
      if (focus?.focus_items?.[0]) focusItem = focus.focus_items[0];
    }

    try {
      await resend.emails.send({
        from: 'Warren Hennon, NTP <warren@divergentnt.com>',
        to: client.email,
        subject: `Your week in review, ${client.first_name} ✦`,
        html: buildWeeklyEmailHtml(
          client.first_name,
          pulses.length,
          avgEnergy,
          topFoods,
          topSymptom,
          focusItem,
          client.wellness_score,
          portalUrl,
          loggedDaySet,
          now,
        ),
      });
      sent++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ sent, skipped, sentAt: new Date().toISOString() });
}
