import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const FROM = 'Warren Hennon, NTP <warren@divergentnt.com>';

function buildAnniversaryHtml(opts: {
  firstName: string;
  day1Score: number;
  currentScore: number;
  totalCheckins: number;
}): string {
  const { firstName, day1Score, currentScore, totalCheckins } = opts;
  const change = currentScore - day1Score;
  const changeStr = change > 0 ? `+${change}` : String(change);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>One year of your Divergent journey</title>
</head>
<body style="margin:0;padding:0;background:#0F1F13;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1F13;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:40px;color:#D08C5C;">✦</span>
        </td></tr>
        <tr><td style="font-family:'Georgia',serif;font-size:22px;color:#FDFAF5;padding-bottom:8px;font-weight:bold;">
          Hi ${firstName},
        </td></tr>
        <tr><td style="font-family:'Georgia',serif;font-style:italic;font-size:15px;color:#B0C8B4;line-height:1.65;padding-bottom:24px;">
          One year ago today you started your Divergent journey.
        </td></tr>
        <tr><td style="font-family:'Georgia',serif;font-size:14px;color:#B0C8B4;padding-bottom:12px;">
          Here&apos;s what&apos;s changed:
        </td></tr>
        <tr><td style="background:#162A1A;border-radius:12px;padding:20px 24px;margin-bottom:24px;display:block;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:12px;border-bottom:1px solid #2A4330;">
                <div style="font-size:10px;color:#3A5C42;font-family:monospace;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Wellness Score</div>
                <div style="font-size:15px;color:#DDE8DE;">Day 1: ${day1Score} &rarr; Today: ${currentScore}</div>
                <div style="font-size:13px;color:#D08C5C;font-weight:bold;margin-top:4px;">Change: ${changeStr} points</div>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                <div style="font-size:10px;color:#3A5C42;font-family:monospace;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Total Check-Ins</div>
                <div style="font-size:15px;color:#DDE8DE;">${totalCheckins} days logged</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="font-family:'Georgia',serif;font-style:italic;font-size:15px;color:#B0C8B4;line-height:1.65;padding-bottom:24px;padding-top:16px;">
          You&apos;ve shown up for yourself ${totalCheckins} days. That matters.
        </td></tr>
        <tr><td style="font-family:'Georgia',serif;font-style:italic;font-size:14px;color:#D08C5C;padding-bottom:24px;">
          &mdash; Warren
        </td></tr>
        <tr><td align="center" style="font-family:monospace;font-size:10px;color:#3A5C42;letter-spacing:0.06em;text-transform:uppercase;">
          Warren Hennon, NTP &middot; Divergent Nutritional Therapy
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();

  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) {
    return NextResponse.json({ error: 'Practitioner not found' }, { status: 403 });
  }

  // Find clients whose account anniversary is today
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  const dateStr = oneYearAgo.toISOString().split('T')[0];

  const { data: anniversaryClients } = await supabase
    .from('clients')
    .select('id, first_name, email, wellness_score')
    .eq('practitioner_id', practitioner.id)
    .gte('created_at', `${dateStr}T00:00:00Z`)
    .lte('created_at', `${dateStr}T23:59:59Z`);

  if (!anniversaryClients || anniversaryClients.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No anniversaries today' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const resend = new Resend(resendKey);
  let sent = 0;
  const errors: string[] = [];

  for (const client of anniversaryClients) {
    if (!client.email) continue;

    const { count: checkinCount } = await supabase
      .from('daily_pulse')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.id);

    try {
      await resend.emails.send({
        from: FROM,
        to: client.email,
        subject: `One year of your Divergent journey, ${client.first_name} ✦`,
        html: buildAnniversaryHtml({
          firstName: client.first_name,
          day1Score: 0,
          currentScore: client.wellness_score ?? 0,
          totalCheckins: checkinCount ?? 0,
        }),
      });
      sent++;
    } catch (err) {
      errors.push(`${client.email}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
