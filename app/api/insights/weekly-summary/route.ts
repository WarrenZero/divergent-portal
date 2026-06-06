import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // Verify cron secret
  const cronSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Find clients who have at least 1 daily_pulse entry in the last 7 days
  const { data: activeClientIds, error: pulseError } = await supabase
    .from('daily_pulse')
    .select('client_id')
    .gte('logged_at', sevenDaysAgo);

  if (pulseError) {
    return NextResponse.json({ error: 'Failed to query pulse entries' }, { status: 500 });
  }

  const uniqueClientIds = [...new Set((activeClientIds ?? []).map((p: { client_id: string }) => p.client_id))];

  if (uniqueClientIds.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No active clients this week' });
  }

  // Fetch client details
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, first_name, email, wellness_score, current_protocol_id')
    .in('id', uniqueClientIds);

  if (clientsError || !clients) {
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }

  let sentCount = 0;
  const errors: string[] = [];

  for (const client of clients) {
    if (!client.email) continue;

    try {
      // Count pulse entries this week
      const { count: pulseCount } = await supabase
        .from('daily_pulse')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .gte('logged_at', sevenDaysAgo);

      // Average energy proxy this week
      const { data: pulseEntries } = await supabase
        .from('daily_pulse')
        .select('digestion_score, sleep_score, stress_score')
        .eq('client_id', client.id)
        .gte('logged_at', sevenDaysAgo);

      type PulseRow = { digestion_score: number | null; sleep_score: number | null; stress_score: number | null };
      type JournalRow = { symptoms: string | null };

      let avgEnergy = 0;
      if (pulseEntries && pulseEntries.length > 0) {
        const total = (pulseEntries as PulseRow[]).reduce((sum: number, p: PulseRow) => {
          const d = p.digestion_score ?? 5;
          const s = p.sleep_score ?? 5;
          const stress = 11 - (p.stress_score ?? 5);
          return sum + (d + s + stress) / 3;
        }, 0);
        avgEnergy = total / pulseEntries.length;
      }

      // Most common symptoms from journal this week
      const { data: journalEntries } = await supabase
        .from('journal_entries')
        .select('symptoms')
        .eq('client_id', client.id)
        .gte('logged_at', sevenDaysAgo);

      const symptomsRaw = ((journalEntries ?? []) as JournalRow[])
        .map((e: JournalRow) => e.symptoms ?? '')
        .filter(Boolean)
        .join(', ');

      // Protocol weekly focus
      let weeklyFocus = 'Continue building your foundation';
      if (client.current_protocol_id) {
        const { data: clientProtocol } = await supabase
          .from('client_protocols')
          .select('start_date, protocol_id')
          .eq('client_id', client.id)
          .eq('is_active', true)
          .single();

        if (clientProtocol?.start_date && clientProtocol.protocol_id) {
          const start = new Date(clientProtocol.start_date);
          const currentWeek = Math.floor(
            (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)
          ) + 1;

          const { data: focusItems } = await supabase
            .from('protocol_week_focus')
            .select('focus_items')
            .eq('protocol_id', clientProtocol.protocol_id)
            .eq('week_number', currentWeek)
            .limit(1)
            .single();

          if (focusItems?.focus_items) {
            const items = Array.isArray(focusItems.focus_items)
              ? focusItems.focus_items
              : [focusItems.focus_items];
            if (items.length > 0) weeklyFocus = String(items[0]);
          }
        }
      }

      const consistency = pulseCount ?? 0;
      const feelingLabel = getEnergyLabel(avgEnergy);

      // Build consistency dots
      const dots = Array.from({ length: 7 }, (_, i) =>
        i < consistency
          ? `<span style="display:inline-block;width:10px;height:10px;background:#C07848;border-radius:50%;margin:0 2px;"></span>`
          : `<span style="display:inline-block;width:10px;height:10px;background:#2A4330;border-radius:50%;margin:0 2px;border:1px solid #3A5C42;"></span>`
      ).join('');

      const emailHtml = buildSummaryEmail({
        firstName: client.first_name,
        consistency,
        feelingLabel,
        weeklyFocus,
        wellnessScore: client.wellness_score ?? 0,
        dots,
        symptomsRaw,
      });

      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: 'Warren Hennon, NTP <warren@divergentnt.com>',
        to: client.email,
        subject: `Your week in review, ${client.first_name} ✦`,
        html: emailHtml,
      });

      sentCount++;
    } catch (err) {
      errors.push(`Failed for client ${client.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    sent: sentCount,
    total: clients.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

function getEnergyLabel(avg: number): string {
  if (avg < 2) return "Struggling — this is data, not failure";
  if (avg < 3) return "Challenging — your body is communicating";
  if (avg < 4) return "Steady — building momentum";
  if (avg < 5) return "Good — keep going";
  return "Excellent — notice what's working";
}

interface SummaryEmailParams {
  firstName: string;
  consistency: number;
  feelingLabel: string;
  weeklyFocus: string;
  wellnessScore: number;
  dots: string;
  symptomsRaw: string;
}

function buildSummaryEmail(params: SummaryEmailParams): string {
  const { firstName, consistency, feelingLabel, weeklyFocus, wellnessScore, dots } = params;
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F1F13;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F1F13;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:40px;background-color:#162A1A;border-radius:16px;border:1px solid #2A4330;">
              <!-- Header -->
              <p style="margin:0 0 8px;font-size:28px;color:#C07848;letter-spacing:0.1em;">✦</p>
              <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#FDFAF5;font-family:Georgia,serif;letter-spacing:-0.02em;">Your Week in Review</h1>
              <p style="margin:0 0 32px;font-size:14px;color:#80A088;font-family:Georgia,serif;">Hello, ${firstName}.</p>

              <!-- Consistency -->
              <div style="margin-bottom:28px;padding:20px;background:#0F1F13;border-radius:10px;border:1px solid #2A4330;">
                <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#C07848;letter-spacing:0.12em;font-family:Georgia,serif;text-transform:uppercase;">Consistency</p>
                <p style="margin:0 0 10px;font-size:15px;color:#FDFAF5;font-family:Georgia,serif;">You checked in <strong style="color:#C07848;">${consistency} of 7</strong> days this week.</p>
                <div style="line-height:1;">${dots}</div>
              </div>

              <!-- Feeling this week -->
              <div style="margin-bottom:28px;padding:20px;background:#0F1F13;border-radius:10px;border:1px solid #2A4330;">
                <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#C07848;letter-spacing:0.12em;font-family:Georgia,serif;text-transform:uppercase;">Your Feeling This Week</p>
                <p style="margin:0;font-size:15px;color:#FDFAF5;font-family:Georgia,serif;font-style:italic;">${feelingLabel}</p>
              </div>

              <!-- One focus -->
              <div style="margin-bottom:28px;padding:20px;background:#0F1F13;border-radius:10px;border:1px solid #2A4330;">
                <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#C07848;letter-spacing:0.12em;font-family:Georgia,serif;text-transform:uppercase;">One Focus For This Week</p>
                <p style="margin:0;font-size:15px;color:#FDFAF5;font-family:Georgia,serif;">${weeklyFocus}</p>
              </div>

              <!-- Wellness score -->
              <div style="margin-bottom:32px;padding:20px;background:#0F1F13;border-radius:10px;border:1px solid #2A4330;">
                <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#C07848;letter-spacing:0.12em;font-family:Georgia,serif;text-transform:uppercase;">Your Wellness Score</p>
                <p style="margin:0 0 6px;font-size:28px;font-weight:700;color:#C07848;font-family:Georgia,serif;">${wellnessScore}</p>
                <p style="margin:0;font-size:12px;color:#80A088;font-family:Georgia,serif;">Track your progress at divergentportal.com</p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:24px;">
                <a href="https://divergentportal.com" style="display:inline-block;padding:14px 32px;background:#C07848;color:#FDFAF5;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;font-family:Georgia,serif;letter-spacing:0.02em;">Open My Portal →</a>
              </div>

              <!-- Footer -->
              <p style="margin:0;font-size:11px;color:#3A5C42;font-family:Georgia,serif;text-align:center;line-height:1.6;">Statements regarding nutritional support have not been evaluated by the Food and Drug Administration. Foundational nutrition is not intended to diagnose, treat, cure, or prevent any disease.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
