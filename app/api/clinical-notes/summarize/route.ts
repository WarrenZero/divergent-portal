import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { anthropic, COPILOT_MODEL } from '@/lib/anthropic/client';
import { createClient } from '@/lib/supabase/server';

const SUMMARY_PROMPT =
  'Summarize this clinical conversation in 3-5 bullet points for the practitioner\'s records. ' +
  'Focus on clinical observations, recommendations made, and any follow-up actions discussed.';

interface SummarizeRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  clientId?: string | null;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: SummarizeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { messages, clientId } = body;

  if (!Array.isArray(messages) || messages.length < 2) {
    return NextResponse.json({ error: 'At least 2 messages required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Resolve practitioner
  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) return NextResponse.json({ error: 'Practitioner not found' }, { status: 403 });

  // Build conversation text for summarization
  const conversationText = messages
    .map((m) => `${m.role === 'user' ? 'Practitioner' : 'Co-Pilot'}: ${m.content}`)
    .join('\n\n');

  // Non-streaming call — summary is background, doesn't need SSE
  const response = await anthropic.messages.create({
    model: COPILOT_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `${SUMMARY_PROMPT}\n\n---\n\n${conversationText}`,
      },
    ],
  });

  const summaryContent = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  if (!summaryContent) {
    return NextResponse.json({ error: 'Empty summary returned' }, { status: 500 });
  }

  // Save to clinical_notes
  const { data: note, error: insertError } = await supabase
    .from('clinical_notes')
    .insert({
      client_id: clientId ?? null,
      practitioner_id: practitioner.id,
      note_type: 'copilot_summary',
      content: summaryContent,
    })
    .select()
    .single();

  if (insertError) {
    console.error('clinical_notes insert error:', insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ note });
}
