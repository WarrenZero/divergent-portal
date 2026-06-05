import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { anthropic, COPILOT_MODEL, COPILOT_MAX_TOKENS } from '@/lib/anthropic/client';
import { COPILOT_SYSTEM_PROMPT } from '@/lib/anthropic/systemPrompt';
import { createClient } from '@/lib/supabase/server';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

// ─── Request / response shape ─────────────────────────────────

interface CopilotAttachment {
  name: string;
  base64: string;
}

interface CopilotRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  clientId?: string;
  attachment?: CopilotAttachment | null;
}

// ─── SSE helpers ──────────────────────────────────────────────

function sseChunk(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ─── Route handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth — must be an authenticated practitioner
  const { userId } = await auth();
  if (!userId) {
    return new Response(sseChunk({ type: 'error', message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  // 2. Parse body
  let body: CopilotRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(sseChunk({ type: 'error', message: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const { messages, clientId, attachment } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(sseChunk({ type: 'error', message: 'messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  // 3. Resolve practitioner_id from Supabase (needed for DB logging)
  const supabase = await createClient();
  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  const practitionerId = practitioner?.id ?? null;

  // 3b. Fetch recent session transcriptions for context (if clientId present)
  let sessionContext = '';
  if (clientId) {
    try {
      const { data: transcriptions } = await supabase
        .from('session_transcriptions')
        .select('created_at, lens_clinical_matrix, lens_client_roadmap')
        .eq('client_id', clientId)
        .eq('status', 'complete')
        .not('lens_clinical_matrix', 'is', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (transcriptions && transcriptions.length > 0) {
        const lines: string[] = ['RECENT SESSION HISTORY:'];
        for (const t of transcriptions) {
          const date = new Date(t.created_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          });
          const matrix = t.lens_clinical_matrix as Record<string, unknown> | null;
          const roadmap = t.lens_client_roadmap as Record<string, unknown> | null;
          const updates = typeof matrix?.protocol_updates === 'string'
            ? matrix.protocol_updates.slice(0, 200) : '';
          const concerns = typeof roadmap?.presenting_concerns === 'string'
            ? roadmap.presenting_concerns.slice(0, 200) : '';
          const detail = [updates, concerns].filter(Boolean).join(' | ');
          if (detail) lines.push(`[Session — ${date}]: ${detail}`);
        }
        if (lines.length > 1) sessionContext = lines.join('\n');
      }
    } catch {
      // Non-fatal — proceed without session context
    }
  }

  const systemPromptWithContext = sessionContext
    ? `${COPILOT_SYSTEM_PROMPT}\n\n${sessionContext}`
    : COPILOT_SYSTEM_PROMPT;

  // 4. Log the last user message immediately
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  if (practitionerId && lastUserMsg) {
    await supabase.from('copilot_messages').insert({
      practitioner_id: practitionerId,
      client_id: clientId ?? null,
      role: 'user',
      content: lastUserMsg.content,
    });
  }

  // 5. Build the SSE stream
  const encoder = new TextEncoder();
  let fullAssistantContent = '';
  let outputTokens = 0;
  let inputTokens = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: object) =>
        controller.enqueue(encoder.encode(sseChunk(data)));

      try {
        // Cast messages to Anthropic's MessageParam type.
        // If a PDF attachment is present, replace the last user message's
        // content with a multi-block array: [document, text].
        const anthropicMessages: MessageParam[] = messages.map((m, i) => {
          const isLastUser =
            attachment && i === messages.length - 1 && m.role === 'user';

          if (isLastUser) {
            return {
              role: 'user',
              content: [
                {
                  type: 'document' as const,
                  source: {
                    type: 'base64' as const,
                    media_type: 'application/pdf' as const,
                    data: attachment!.base64,
                  },
                },
                { type: 'text' as const, text: m.content },
              ],
            };
          }

          return { role: m.role, content: m.content };
        });

        // Stream from Anthropic
        const anthropicStream = anthropic.messages.stream({
          model: COPILOT_MODEL,
          max_tokens: COPILOT_MAX_TOKENS,
          system: systemPromptWithContext,
          messages: anthropicMessages,
        });

        // Forward each text delta as an SSE event
        anthropicStream.on('text', (text) => {
          fullAssistantContent += text;
          enqueue({ type: 'delta', content: text });
        });

        // Wait for the full response to get usage stats
        const finalMessage = await anthropicStream.finalMessage();
        inputTokens = finalMessage.usage.input_tokens;
        outputTokens = finalMessage.usage.output_tokens;

        // Signal completion with token counts
        enqueue({ type: 'done', inputTokens, outputTokens });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'LLM error';
        console.error('copilot stream error:', message);
        enqueue({ type: 'error', message });
      } finally {
        controller.close();
      }

      // 6. Log assistant response to DB after stream completes
      if (practitionerId && fullAssistantContent) {
        await supabase.from('copilot_messages').insert({
          practitioner_id: practitionerId,
          client_id: clientId ?? null,
          role: 'assistant',
          content: fullAssistantContent,
          tokens_used: outputTokens,
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable Nginx buffering on Vercel
    },
  });
}
