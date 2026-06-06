import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { calculateScores } from '@/app/(client)/naq/data';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceClient();

  // Get client record
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, last_insight_generated_at, wellness_score')
    .eq('clerk_user_id', userId)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Check if insight was generated in the last 7 days
  if (client.last_insight_generated_at) {
    const lastGen = new Date(client.last_insight_generated_at);
    const daysSince = (Date.now() - lastGen.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) {
      return NextResponse.json({
        generated: false,
        reason: 'Insight already generated this week',
      });
    }
  }

  // Check if client has 3+ journal entries in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: journalCount } = await supabase
    .from('journal_entries')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', client.id)
    .gte('logged_at', sevenDaysAgo);

  if (!journalCount || journalCount < 3) {
    return NextResponse.json({
      generated: false,
      reason: 'Not enough journal entries this week (need 3+)',
    });
  }

  // Fetch all data needed for insight
  const [naqResult, journalResult, pulseResult, supplementsResult, protocolResult] =
    await Promise.all([
      supabase
        .from('naq_responses')
        .select('question_id, response_value, domain')
        .eq('client_id', client.id),
      supabase
        .from('journal_entries')
        .select('foods_eaten, mood_before, mood_after, symptoms, logged_at')
        .eq('client_id', client.id)
        .gte('logged_at', sevenDaysAgo)
        .order('logged_at', { ascending: false })
        .limit(7),
      supabase
        .from('daily_pulse')
        .select('digestion_score, sleep_score, stress_score, logged_at')
        .eq('client_id', client.id)
        .gte('logged_at', sevenDaysAgo)
        .order('logged_at', { ascending: true })
        .limit(7),
      supabase
        .from('supplements')
        .select('name, dose, timing')
        .eq('client_id', client.id)
        .eq('is_active', true),
      supabase
        .from('client_protocols')
        .select('start_date, current_phase, protocols(name)')
        .eq('client_id', client.id)
        .eq('is_active', true)
        .single(),
    ]);

  // Calculate domain scores from NAQ
  const naqResponses = naqResult.data ?? [];
  const responsesMap: Record<string, number> = {};
  for (const r of naqResponses) {
    if (r.question_id && r.response_value !== null && r.response_value !== undefined) {
      responsesMap[r.question_id] = r.response_value;
    }
  }
  const { domainScores } = calculateScores(responsesMap);

  // Sort domains by burden descending, take top 5
  const topDomains = [...domainScores]
    .sort((a, b) => b.burden - a.burden)
    .slice(0, 5);

  // Type helpers for Supabase untyped results
  type JournalRow = { foods_eaten: string | null; mood_before: number | null; mood_after: number | null; symptoms: string | null; logged_at: string };
  type PulseRow = { digestion_score: number | null; sleep_score: number | null; stress_score: number | null; logged_at: string };
  type SupplementRow = { name: string; dose: string | null; timing: string | null };

  // Build food patterns
  const journalEntries: JournalRow[] = (journalResult.data ?? []) as JournalRow[];
  const allFoods = journalEntries
    .flatMap((e) => (e.foods_eaten ?? '').split(/[,\n]+/))
    .map((f) => f.trim().toLowerCase())
    .filter(Boolean);

  const foodFreq: Record<string, number> = {};
  for (const food of allFoods) {
    foodFreq[food] = (foodFreq[food] ?? 0) + 1;
  }
  const topFoods = Object.entries(foodFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([food]) => food);

  // Symptom patterns
  const moodBefores = journalEntries
    .map((e) => e.mood_before)
    .filter((v): v is number => v !== null && v !== undefined);
  const moodAfters = journalEntries
    .map((e) => e.mood_after)
    .filter((v): v is number => v !== null && v !== undefined);
  const avgMoodBefore =
    moodBefores.length > 0
      ? (moodBefores.reduce((a: number, b: number) => a + b, 0) / moodBefores.length).toFixed(1)
      : 'N/A';
  const avgMoodAfter =
    moodAfters.length > 0
      ? (moodAfters.reduce((a: number, b: number) => a + b, 0) / moodAfters.length).toFixed(1)
      : 'N/A';

  const symptomsText = journalEntries
    .map((e) => e.symptoms ?? '')
    .filter(Boolean)
    .join(', ');

  // Daily feeling scores (energy proxy)
  const pulseEntries: PulseRow[] = (pulseResult.data ?? []) as PulseRow[];
  const feelingScores = pulseEntries.map((p) => {
    const digestion = p.digestion_score ?? 5;
    const sleep = p.sleep_score ?? 5;
    const stressInverted = 11 - (p.stress_score ?? 5);
    const proxy = ((digestion + sleep + stressInverted) / 3).toFixed(1);
    const date = new Date(p.logged_at).toLocaleDateString('en-US', { weekday: 'short' });
    return `${date}: ${proxy}/10`;
  });

  // Protocol info
  const protocolData = protocolResult.data;
  let protocolName = 'No active protocol';
  let protocolDay = 0;
  if (protocolData) {
    const rawProto = protocolData.protocols;
    const proto = (Array.isArray(rawProto) ? rawProto[0] : rawProto) as { name: string } | null;
    protocolName = proto?.name ?? 'Active Protocol';
    if (protocolData.start_date) {
      const start = new Date(protocolData.start_date);
      protocolDay = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  // Supplements
  const supplements = ((supplementsResult.data ?? []) as SupplementRow[]).map(
    (s) => `${s.name}${s.dose ? ' ' + s.dose : ''}${s.timing ? ' (' + s.timing + ')' : ''}`
  );

  // Build prompt
  const userPrompt = `Generate a weekly wellness insight for this client:

NAME: ${client.first_name}
PROTOCOL: ${protocolName}
PROTOCOL DAY: ${protocolDay} of 90

NAQ BURDEN (highest first):
${topDomains.map((d) => `- ${d.name}: ${d.burden}%`).join('\n')}

THIS WEEK'S FOOD PATTERNS:
${topFoods.length > 0 ? topFoods.map((f) => `- ${f}`).join('\n') : '- No food data logged'}

SYMPTOM PATTERNS:
- Average symptom score before eating: ${avgMoodBefore}/5
- Average symptom score after eating: ${avgMoodAfter}/5
- Most common symptoms noted: ${symptomsText || 'None noted'}

DAILY FEELING SCORES:
${feelingScores.length > 0 ? feelingScores.join('\n') : 'No pulse entries this week'}

ACTIVE SUPPLEMENTS: ${supplements.length > 0 ? supplements.join(', ') : 'None listed'}

Generate a personalized insight that:
1. Names one specific pattern you observe in their data (food + symptom connection)
2. Explains what this pattern suggests about their body in plain English
3. Gives one specific actionable focus for the coming week
4. Ends with an encouraging observation about their consistency or progress

Do not use clinical jargon. Write warmly as if Warren is reviewing their data personally.`;

  // Call Claude Haiku
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system:
      'You are a nutritional intelligence system built by Warren Hennon, NTP. Generate personalized weekly wellness insights based on client portal data. Be warm, specific, encouraging, and clinically observant. Never diagnose. Focus on patterns and connections. Write in second person directly to the client. Keep responses under 250 words.',
    messages: [{ role: 'user', content: userPrompt }],
  });

  const insightText =
    message.content[0].type === 'text' ? message.content[0].text : 'Unable to generate insight.';

  // Save to client_insights
  const { data: savedInsight, error: saveError } = await supabase
    .from('client_insights')
    .insert({
      client_id: client.id,
      insight_text: insightText,
      insight_type: 'weekly',
      week_start: new Date(sevenDaysAgo).toISOString().split('T')[0],
    })
    .select('id')
    .single();

  if (saveError) {
    console.error('Failed to save insight:', saveError);
    return NextResponse.json({ error: 'Failed to save insight' }, { status: 500 });
  }

  // Update last_insight_generated_at on client
  await supabase
    .from('clients')
    .update({ last_insight_generated_at: new Date().toISOString() })
    .eq('id', client.id);

  // Send email via Resend (non-fatal)
  if (process.env.RESEND_API_KEY && client.email) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Warren Hennon, NTP <warren@divergentnt.com>',
        to: client.email,
        subject: `Your weekly wellness insight, ${client.first_name} ✦`,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0F1F13;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F1F13;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:32px;background-color:#162A1A;border-radius:12px;border:1px solid #2A4330;">
              <p style="margin:0 0 24px;font-family:'Syne',sans-serif,Georgia;font-size:22px;color:#C07848;letter-spacing:0.05em;">✦</p>
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#FDFAF5;font-family:Georgia,serif;letter-spacing:-0.01em;">Your Weekly Wellness Insight</h1>
              <p style="margin:0 0 24px;font-size:13px;color:#80A088;font-family:Georgia,serif;">Hello, ${client.first_name}.</p>
              <div style="background:#0F1F13;border-radius:8px;padding:20px;border-left:3px solid #C07848;">
                <p style="margin:0;font-size:15px;line-height:1.75;color:#F8F2E8;font-family:Georgia,serif;font-style:italic;">${insightText}</p>
              </div>
              <p style="margin:24px 0 0;font-size:11px;color:#5A7C62;font-family:Georgia,serif;">Generated from your Divergent portal data · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <p style="margin:16px 0 0;font-size:11px;color:#3A5C42;font-family:Georgia,serif;">Statements regarding nutritional support have not been evaluated by the FDA. Foundational nutrition is not intended to diagnose, treat, cure, or prevent any disease.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      });
    } catch (emailErr) {
      console.warn('Email send failed (non-fatal):', emailErr);
    }
  }

  return NextResponse.json({
    insight: insightText,
    insightId: savedInsight?.id,
    generated: true,
  });
}
