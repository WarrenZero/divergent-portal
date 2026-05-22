import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'warren@divergentportal.com';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://divergentportal.com';

// ─── Types ────────────────────────────────────────────────────────

type NudgeType = 'pulse' | 'journal' | 'milestone' | 'auto';

interface NudgeContext {
  firstName: string;
  daysSincePulse: number | null;
  daysSinceJournal: number | null;
  protocolName: string | null;
  protocolDay: number | null;
}

// ─── Nudge type detection ──────────────────────────────────────────

function resolveNudgeType(ctx: NudgeContext): 'pulse' | 'journal' | 'milestone' {
  // Milestone wins if they're on a significant protocol day
  if (ctx.protocolDay !== null) {
    const milestones = [7, 14, 30];
    if (milestones.some((d) => Math.abs(d - ctx.protocolDay!) <= 1)) return 'milestone';
  }
  if (ctx.daysSincePulse === null || ctx.daysSincePulse >= 3) return 'pulse';
  if (ctx.daysSinceJournal === null || ctx.daysSinceJournal >= 7) return 'journal';
  return 'pulse';
}

// ─── Email templates ───────────────────────────────────────────────

function pulseEmailHtml(firstName: string, daysSince: number | null): string {
  const daysText =
    daysSince === null
      ? 'a while'
      : daysSince === 1
      ? 'a day'
      : `${daysSince} days`;

  return emailWrapper({
    subject: 'Your Daily Check-In is Waiting',
    preheader: `It's been ${daysText} since your last check-in, ${firstName}.`,
    body: `
      <p style="font-family:Georgia,serif;font-size:16px;color:#0F1F13;margin:0 0 16px;line-height:1.6;">
        Hello, ${firstName}
      </p>
      <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;margin:0 0 16px;line-height:1.7;">
        It's been ${daysText} since your last daily check-in. Taking 20 seconds to log your digestion, sleep, and stress gives Warren the clearest picture of how your body is responding — and helps identify patterns before your next session.
      </p>
      <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;margin:0 0 24px;line-height:1.7;">
        Even on days when things feel the same, logging consistently is what makes the data meaningful.
      </p>
    `,
    ctaLabel: 'Log My Daily Check-In →',
    ctaHref: `${SITE_URL}/checkin`,
  });
}

function journalEmailHtml(firstName: string, daysSince: number | null): string {
  const daysText =
    daysSince === null ? 'a while' : daysSince === 1 ? 'a day' : `${daysSince} days`;

  return emailWrapper({
    subject: `How are you feeling, ${firstName}? Log today in your journal`,
    preheader: `It's been ${daysText} since your last journal entry.`,
    body: `
      <p style="font-family:Georgia,serif;font-size:16px;color:#0F1F13;margin:0 0 16px;line-height:1.6;">
        Hello, ${firstName}
      </p>
      <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;margin:0 0 16px;line-height:1.7;">
        It's been ${daysText} since your last food and mood journal entry. Warren reviews journal entries before every session to understand how your meals, symptoms, and energy are connecting day-to-day.
      </p>
      <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;margin:0 0 24px;line-height:1.7;">
        Even a brief log — what you ate, how you felt after — makes a real difference in the quality of care you receive.
      </p>
    `,
    ctaLabel: 'Open My Journal →',
    ctaHref: `${SITE_URL}/journal`,
  });
}

function milestoneEmailHtml(
  firstName: string,
  protocolDay: number,
  protocolName: string | null,
): string {
  const protocol = protocolName ?? 'your protocol';
  const encouragement =
    protocolDay <= 8
      ? `Your body has had a full week to begin adapting to the foundational changes in ${protocol}. This is when the work starts to take root.`
      : protocolDay <= 15
      ? `Two weeks in — this is when many clients begin noticing subtle but meaningful shifts in their daily energy and digestion. Pay attention to how you feel in the first hour of your morning.`
      : `One month. This is the inflection point where consistent protocol adherence begins creating lasting physiological change. The foundation you have built over these 30 days matters.`;

  return emailWrapper({
    subject: `You've reached Day ${protocolDay} ✦`,
    preheader: `A meaningful milestone on ${protocol}.`,
    body: `
      <p style="font-family:Georgia,serif;font-size:16px;color:#0F1F13;margin:0 0 16px;line-height:1.6;">
        Hello, ${firstName}
      </p>
      <p style="font-family:Georgia,serif;font-size:15px;color:#5A4C38;margin:0 0 16px;line-height:1.7;">
        You have reached <strong>Day ${protocolDay}</strong> on ${protocol} — this is a meaningful milestone worth acknowledging.
      </p>
      <div style="border-left:3px solid #C07848;padding:12px 18px;margin:0 0 24px;background:#FDF8F3;border-radius:0 8px 8px 0;">
        <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:#8A4810;margin:0;line-height:1.6;">
          ${encouragement}
        </p>
        <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:600;color:#C07848;margin:10px 0 0;letter-spacing:0.03em;">
          — Warren Hennon, NTP
        </p>
      </div>
    `,
    ctaLabel: 'View My Protocol →',
    ctaHref: `${SITE_URL}/checkin`,
  });
}

// ─── Shared email wrapper ──────────────────────────────────────────

function emailWrapper(opts: {
  subject: string;
  preheader: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.subject}</title>
</head>
<body style="margin:0;padding:0;background:#FDFAF5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFAF5;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
             style="background:#FFFFFF;border:1px solid #E8DECE;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#1E3122;padding:22px 32px;text-align:center;">
            <span style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;
                         letter-spacing:0.12em;text-transform:uppercase;color:#80A088;">
              ✦ DIVERGENT NUTRITIONAL THERAPY
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 0;">
            ${opts.body}
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <a href="${opts.ctaHref}"
               style="display:inline-block;background:#2A4330;color:#FFFFFF;
                       font-family:Arial,sans-serif;font-size:12px;font-weight:700;
                       letter-spacing:0.05em;text-transform:uppercase;text-decoration:none;
                       padding:14px 32px;border-radius:8px;">
              ${opts.ctaLabel}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 28px;text-align:center;border-top:1px solid #F0E8DA;">
            <p style="font-family:Georgia,serif;font-size:12px;color:#9A8A72;
                       font-style:italic;margin:16px 0 0;line-height:1.6;">
              You are receiving this message as a client of Divergent Nutritional Therapy.
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

  let body: { clientId: string; nudgeType?: NudgeType };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { clientId, nudgeType = 'auto' } = body;
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 });
  }

  // Verify ownership
  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email')
    .eq('id', clientId)
    .eq('practitioner_id', practitioner.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Fetch recent activity to determine nudge type
  const now = new Date();
  const [pulseRes, journalRes, protocolRes] = await Promise.all([
    supabase
      .from('daily_pulse')
      .select('logged_at')
      .eq('client_id', clientId)
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('journal_entries')
      .select('logged_at')
      .eq('client_id', clientId)
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('client_protocols')
      .select('start_date, protocols (name)')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  const daysSincePulse = pulseRes.data
    ? Math.floor(
        (now.getTime() - new Date(pulseRes.data.logged_at).getTime()) / (1000 * 60 * 60 * 24),
      )
    : null;

  const daysSinceJournal = journalRes.data
    ? Math.floor(
        (now.getTime() - new Date(journalRes.data.logged_at).getTime()) / (1000 * 60 * 60 * 24),
      )
    : null;

  const protocolRow = protocolRes.data as {
    start_date: string | null;
    protocols: { name: string } | { name: string }[] | null;
  } | null;

  const protocolName = protocolRow
    ? Array.isArray(protocolRow.protocols)
      ? protocolRow.protocols[0]?.name ?? null
      : protocolRow.protocols?.name ?? null
    : null;

  const protocolDay = protocolRow?.start_date
    ? Math.max(
        1,
        Math.floor(
          (now.getTime() - new Date(protocolRow.start_date).getTime()) / (1000 * 60 * 60 * 24),
        ) + 1,
      )
    : null;

  const ctx: NudgeContext = { firstName: client.first_name, daysSincePulse, daysSinceJournal, protocolName, protocolDay };
  const resolvedType: 'pulse' | 'journal' | 'milestone' =
    nudgeType === 'auto' ? resolveNudgeType(ctx) : (nudgeType as 'pulse' | 'journal' | 'milestone');

  // Build email
  let subject: string;
  let html: string;
  let message: string;

  if (resolvedType === 'journal') {
    subject = `How are you feeling, ${client.first_name}? Log today in your journal`;
    html = journalEmailHtml(client.first_name, daysSinceJournal);
    message = 'Journal reminder sent';
  } else if (resolvedType === 'milestone' && protocolDay !== null) {
    subject = `You've reached Day ${protocolDay} ✦`;
    html = milestoneEmailHtml(client.first_name, protocolDay, protocolName);
    message = `Day ${protocolDay} milestone celebration sent`;
  } else {
    subject = `Your daily check-in is waiting, ${client.first_name}`;
    html = pulseEmailHtml(client.first_name, daysSincePulse);
    message = 'Daily pulse reminder sent';
  }

  const sentAt = new Date().toISOString();

  // Send email (non-fatal)
  if (client.email && process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({ from: FROM, to: client.email, subject, html });
    } catch (err) {
      console.error('nudge email error:', err);
    }
  }

  // Log nudge
  try {
    await supabase.from('nudge_log').insert({
      practitioner_id: practitioner.id,
      client_id: clientId,
      nudge_type: resolvedType,
      message,
    });
  } catch (err) {
    console.error('nudge_log insert error:', err);
  }

  return NextResponse.json({ success: true, nudgeType: resolvedType, sentAt, message });
}
