# Claude API Integration — Divergent Portal

## Setup

```typescript
// lib/anthropic/client.ts
import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
export const COPILOT_MODEL = 'claude-sonnet-4-6';
export const COPILOT_MAX_TOKENS = 2048;
```

## The Clinical Co-Pilot

The Co-Pilot is the core AI feature. It's a practitioner-only tool (never exposed directly to clients).

**System prompt location:** `lib/anthropic/systemPrompt.ts` — the `COPILOT_SYSTEM_PROMPT` constant.
**Never abbreviate or paraphrase the system prompt.** Inject verbatim on every request.

### Key Co-Pilot behaviors:
1. **HTMA & Metabolic Typing** — evaluates all client data through Hair Tissue Mineral Analysis lens
2. **Oxidation rate identification** — Fast (sympathetic) vs Slow (parasympathetic) metabolic types
3. **Mineral ratio analysis** — Ca/Mg, Na/K, Zn/Cu, Zn/Cd for endocrine imbalance detection
4. **The 20% Guardrail** — intervenes when a proposed intervention deviates >20% from optimal anti-inflammatory path
5. **Collaborative friction** — gentle, inquisitive intervention style ("I love where you're going with this, but...")
6. **Socratic reasoning** — asks before telling
7. **Metabolic "Why"** — every suggestion includes explicit biochemical reasoning

## Streaming API Route

The copilot uses Server-Sent Events (SSE) for streaming responses. See `app/api/copilot/route.ts`.

```typescript
import { anthropic, COPILOT_MODEL, COPILOT_MAX_TOKENS } from '@/lib/anthropic/client';
import { COPILOT_SYSTEM_PROMPT } from '@/lib/anthropic/systemPrompt';

// Inside POST handler, after auth:
const stream = await anthropic.messages.stream({
  model: COPILOT_MODEL,
  max_tokens: COPILOT_MAX_TOKENS,
  system: COPILOT_SYSTEM_PROMPT,
  messages: formattedMessages, // MessageParam[] from @anthropic-ai/sdk
});

// Stream chunks as SSE
const readable = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'delta', text: chunk.delta.text })}\n\n`
        ));
      }
    }
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
    controller.close();
  }
});

return new Response(readable, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }
});
```

## Client-Side Streaming Consumer

```typescript
const response = await fetch('/api/copilot', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages, clientId }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  const lines = text.split('\n').filter(l => l.startsWith('data: '));
  for (const line of lines) {
    const data = JSON.parse(line.slice(6));
    if (data.type === 'delta') setContent(prev => prev + data.text);
    if (data.type === 'done') setIsStreaming(false);
  }
}
```

## Context Injection

When a client is selected in the Co-Pilot panel, inject their data as context:

```typescript
// Prepend client context as first user message or system context
const clientContext = `
[CLIENT CONTEXT]
Name: ${client.first_name} ${client.last_name}
Primary concern: ${client.primary_concern}
Current protocol: ${protocol?.name}
Wellness score: ${client.wellness_score}
Latest daily pulse: Digestion ${pulse?.digestion_score}/10, Sleep ${pulse?.sleep_score}/10, Stress ${pulse?.stress_score}/10
`;
```

## AI Weekly Insights

Weekly insights generation (triggered by engagement loop):
- Model: `claude-sonnet-4-6`
- Input: past week's daily_pulse entries, journal entries, protocol adherence
- Output: structured JSON with `summary`, `patterns`, `recommendations`
- Stored in `insights` table

```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: 'You are generating weekly wellness insights for a nutritional therapy client...',
  messages: [{ role: 'user', content: weeklyDataSummary }],
});
```

## The 20% Guardrail Implementation

The guardrail is enforced via the system prompt — Claude evaluates each proposed intervention against the client's HTMA data. No application-layer code needed; it's a prompt-level directive.

When the Co-Pilot triggers the guardrail, it formats its response with collaborative friction language (see system prompt). The UI should display guardrail responses distinctly (e.g. amber border, ⚠ prefix).

## Vocabulary RAG (future)

`app/api/vocabulary/` — clinical vocabulary endpoint for RAG-enhanced Co-Pilot responses. Seeds the model with HTMA-specific terminology and Divergent protocol language.

## Model Selection

Default: `claude-sonnet-4-6` (balanced capability + cost).
For complex clinical reasoning tasks (HTMA report generation, full protocol drafting): consider `claude-opus-4-6`.
For simple tasks (weekly summary, short notifications): `claude-haiku-4-5-20251001`.

## HIPAA Note

PHI sent to Claude API is processed by Anthropic. Ensure Anthropic BAA is in place before sending real client data. In development, use mock/anonymized data only.
