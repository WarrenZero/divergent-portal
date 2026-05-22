import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'warren@divergentportal.com';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://divergentportal.com';

// ─── Digest email template ─────────────────────────────────────────

function digestEmailHtml(opts: {
  firstName: string;
  pulseCount: number;
  journalCount: number;
  avgDigestion: number | null;
  avgSleep: number | null;
  avgStress: number | null;
  protocolDay: number | null;
  protocolName: string | null;
  wellnessScore: number;
}): string {
  const { firstName, pulseCount, journalCount, avgDigestion, avgSleep, avgStress, protocolDay, protocolName, wellnessScore } = opts;

  const scoreRow = (label: string, val: number | null) =>
    val !== null
      ? `<tr>
           <td style="font-family:Arial,sans-serif;font-size:12px;color:#9A8A72;padding:6px 0;">${label}</td>
           <td style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#0F1F13;padding:6px 0;text-align:right;">${val.toFixed(1)} / 10</td>
         </tr>`
      : '';

  const protocolLine = protocolDay
    ? `<p style="font-family:Georgia,serif;font-size:14px;color:#5A4C38;margin:0 0 8px;line-height:1.6;">
         Protocol progress: <strong>Day ${protocolDay}</strong>${protocolName ? ` of ${protocolName}` : ''}
       </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Weekly Digest</title>
</head>
<body style="margin:0;padding:0;background:#FDFAF5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFAF5;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
             style="background:#FFFFFF;border:1px solid #E8DECE;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#1E3122;padding:22px 32px;text-align:center;">
            <span style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;
                         letter-spacing:0.12em;text-transform:uppercase;color:#80A088;">
              ✦ DIVERGENT NUTRITIONAL THERAPY
            </span>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:36px 40px 0;">
            <p style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;
                       letter-spacing:0.1em;text-transform:uppercase;color:#9A8A72;margin:0 0 10px;">
              YOUR WEEKLY DIGEST
            </p>
            <p style="font-family:Georgia,serif;font-size:16px;color:#0F1F13;margin:0 0 16px;line-height:1.6;">
              Hello, ${firstName}
            </p>
            <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;margin:0 0 24px;line-height:1.7;">
              Here is a summary of your week. Warren reviews this before every session to track your progress and prepare the most relevant support for you.
            </p>
          </td>
        </tr>

        <!-- Stats block -->
        <tr>
          <td style="padding:0 40px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#F8F2E8;border:1px solid #E8DECE;border-radius:10px;padding:20px;">
              <tr>
                <td style="padding:20px;">
                  <table width="100%">
                    <tr>
                      <td style="font-family:Arial,sans-serif;font-size:12px;color:#9A8A72;padding:6px 0;">Check-ins logged this week</td>
                      <td style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#0F1F13;padding:6px 0;text-align:right;">${pulseCount} / 7 days</td>
                    </tr>
                    <tr>
                      <td style="font-family:Arial,sans-serif;font-size:12px;color:#9A8A72;padding:6px 0;">Journal entries this week</td>
                      <td style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#0F1F13;padding:6px 0;text-align:right;">${journalCount} entries</td>
                    </tr>
                    <tr>
                      <td style="font-family:Arial,sans-serif;font-size:12px;color:#9A8A72;padding:6px 0;">Wellness score</td>
                      <td style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#0F1F13;padding:6px 0;text-align:right;">${wellnessScore} / 100</td>
                    </tr>
                    ${scoreRow('Avg digestion score', avgDigestion)}
                    ${scoreRow('Avg sleep score', avgSleep)}
                    ${scoreRow('Avg stress score', avgStress)}
                  </table>
                </td>
              </tr>
            </table>

            ${protocolLine ? `<div style="margin-top:16px;">${protocolLine}</div>` : ''}
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 28px;text-align:center;">
            <a href="${SITE_URL}/checkin"
               style="display:inline-block;background:#2A4330;color:#FFFFFF;
                       font-family:Arial,sans-serif;font-size:12px;font-weight:700;
                       letter-spacing:0.05em;text-transform:uppercase;text-decoration:none;
                       padding:14px 32px;border-radius:8px;">
              Log Today's Check-In →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:0 40px 28px;border-top:1px solid #F0E8DA;text-align:center;">
            <p style="font-family:Georgia,serif;font-size:12px;color:#9A8A72;
                       font-style:italic;margin:16px 0 0;line-height:1.6;">
              You are receiving this as a client of Divergent Nutritional Therapy.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Route ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
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

  let body: { clientIds?: string[] };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Fetch target clients
  let clientQuery = supabase
    .from('clients')
    .select('id, first_name, email, wellness_score')
    .eq('practitioner_id', practitioner.id);

  if (body.clientIds && body.clientIds.length > 0) {
    clientQuery = clientQuery.in('id', body.clientIds);
  }

  const { data: clients } = await clientQuery;
  if (!clients || clients.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const clientIds = clients.map((c) => c.id);

  // Fetch last 7 days of pulse and journal data in bulk
  const [pulseRes, journalRes, protocolRes] = await Promise.all([
    supabase
      .from('daily_pulse')
      .select('client_id, digestion_score, sleep_score, stress_score, logged_at')
      .in('client_id', clientIds)
      .gte('logged_at', sevenDaysAgo),

    supabase
      .from('journal_entries')
      .select('client_id, logged_at')
      .in('client_id', clientIds)
      .gte('logged_at', sevenDaysAgo),

    supabase
      .from('client_protocols')
      .select('client_id, start_date, protocols (name)')
      .in('client_id', clientIds)
      .eq('is_active', true),
  ]);

  // Group by client
  const pulsesByClient: Record<string, typeof pulseRes.data> = {};
  const journalsByClient: Record<string, number> = {};
  const protocolByClient: Record<string, { start_date: string | null; protocols: { name: string } | { name: string }[] | null }> = {};

  for (const p of pulseRes.data ?? []) {
    if (!pulsesByClient[p.client_id]) pulsesByClient[p.client_id] = [];
    pulsesByClient[p.client_id]!.push(p);
  }
  for (const j of journalRes.data ?? []) {
    journalsByClient[j.client_id] = (journalsByClient[j.client_id] ?? 0) + 1;
  }
  for (const pr of protocolRes.data ?? []) {
    protocolByClient[pr.client_id] = pr as { start_date: string | null; protocols: { name: string } | { name: string }[] | null };
  }

  function avg(vals: (number | null)[]): number | null {
    const filtered = vals.filter((v): v is number => v !== null);
    if (!filtered.length) return null;
    return filtered.reduce((a, b) => a + b, 0) / filtered.length;
  }

  let sent = 0;

  for (const client of clients) {
    if (!client.email) continue;

    const pulses = pulsesByClient[client.id] ?? [];
    const protocol = protocolByClient[client.id] ?? null;

    const protocolName = protocol
      ? Array.isArray(protocol.protocols)
        ? protocol.protocols[0]?.name ?? null
        : protocol.protocols?.name ?? null
      : null;

    const protocolDay = protocol?.start_date
      ? Math.max(
          1,
          Math.floor((now.getTime() - new Date(protocol.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
        )
      : null;

    const html = digestEmailHtml({
      firstName: client.first_name,
      pulseCount: pulses.length,
      journalCount: journalsByClient[client.id] ?? 0,
      avgDigestion: avg(pulses.map((p) => p.digestion_score)),
      avgSleep: avg(pulses.map((p) => p.sleep_score)),
      avgStress: avg(pulses.map((p) => p.stress_score)),
      protocolDay,
      protocolName,
      wellnessScore: client.wellness_score ?? 0,
    });

    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: FROM,
          to: client.email,
          subject: `Your weekly summary — Divergent`,
          html,
        });
        sent++;
      } catch (err) {
        console.error(`digest email error for ${client.id}:`, err);
      }
    } else {
      // No email key — still count as sent for dev
      sent++;
    }

    // Log to nudge_log
    try {
      await supabase.from('nudge_log').insert({
        practitioner_id: practitioner.id,
        client_id: client.id,
        nudge_type: 'digest',
        message: 'Weekly digest sent',
      });
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json({ sent });
}
