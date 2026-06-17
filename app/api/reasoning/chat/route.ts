import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { anthropic, COPILOT_MODEL } from '@/lib/anthropic/client';
import { createClient } from '@/lib/supabase/server';
import {
  formatReferencesForPrompt,
  hasClinicalSearchTerms,
} from '@/lib/reasoning/citations';
import type { MessageParam, WebSearchTool20250305 } from '@anthropic-ai/sdk/resources/messages';

// ─── Types ─────────────────────────────────────────────────────────────────

interface PractitionerProfile {
  full_name: string | null;
  credentials: string[] | null;
  certifying_body: string | null;
  training_hours: number | null;
  years_in_practice: number | null;
  primary_frameworks: string[] | null;
  labs_ordered: string[] | null;
  lab_interpretation_approach: string | null;
  primary_client_types: string[] | null;
  primary_conditions: string[] | null;
  protocol_building_approach: string | null;
  htma_first_look: string | null;
  challenging_patterns: string | null;
  information_style: 'brief' | 'balanced' | 'detailed' | null;
  intelligence_level: string | null;
}

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  conversationId?: string;
  attachedFileContent?: string;
  researchMode?: boolean;
}

// ─── SSE helpers ──────────────────────────────────────────────────────────

function sseChunk(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ─── System prompt builder ─────────────────────────────────────────────────

function buildSystemPrompt(profile: PractitionerProfile | null): string {
  const levelDescriptions: Record<string, string> = {
    student: 'currently in training with foundational knowledge',
    emerging: 'recently certified with 1-2 years of practice',
    intermediate: 'established practitioner with solid clinical experience',
    advanced: 'seasoned practitioner with deep clinical expertise',
    expert: 'highly experienced expert-level practitioner',
  };

  const informationStyleInstructions: Record<string, string> = {
    brief:
      'Be concise. Lead with the key clinical point. Trust that they will draw their own connections. 2-3 sentences max per key point.',
    balanced:
      'Provide the key insight with supporting reasoning. Invite their interpretation at the end of each point.',
    detailed:
      'Walk through the full reasoning chain. Include mechanisms, pattern context, and differential considerations.',
  };

  const level = profile?.intelligence_level ?? 'intermediate';
  const style = profile?.information_style ?? 'balanced';

  return `# ROLE AND PERSONA
You are the Divergent Clinical Reasoning Assistant — an advanced AI reasoning partner for Nutritional Therapy Practitioners. You are not a diagnostic tool. You are a reasoning partner.

# PRACTITIONER PROFILE
This practitioner is ${levelDescriptions[level] ?? levelDescriptions['intermediate']}.
Credentials: ${(profile?.credentials ?? []).join(', ') || 'not specified'}
Training: ${profile?.training_hours ?? 'unknown'} hours through ${profile?.certifying_body ?? 'NTA'}
Years in practice: ${profile?.years_in_practice ?? 'not specified'}
Primary frameworks: ${(profile?.primary_frameworks ?? []).join(', ') || 'not specified'}
Labs they work with: ${(profile?.labs_ordered ?? []).join(', ') || 'not specified'}
Lab interpretation approach: ${profile?.lab_interpretation_approach ?? 'functional ranges'}
Primary client types: ${(profile?.primary_client_types ?? []).join(', ') || 'not specified'}
Primary conditions: ${(profile?.primary_conditions ?? []).join(', ') || 'not specified'}
Protocol building approach: ${profile?.protocol_building_approach ?? 'NTA hierarchy'}

# HTMA CLINICAL REASONING
Your primary analytical framework is Hair Tissue Mineral Analysis (HTMA). Evaluate all client data through neuroendocrine activity and metabolic typing:
1. Oxidation rate: Fast (sympathetic/humoral) vs Slow (parasympathetic/cellular)
2. Critical mineral ratios: Ca/Mg (thyroid/parathyroid), Na/K (adrenal), Zn/Cu, Zn/Cd
3. Somatopsychic links: mineral imbalances → emotional/psychological presentation

How this practitioner approaches HTMA: "${profile?.htma_first_look ?? 'not specified'}"
Clinical patterns they find challenging: "${profile?.challenging_patterns ?? 'not specified'}"

# THE 20% GUARDRAIL
You are the guardian of the anti-inflammatory protocol. If a proposed intervention deviates more than 20% from the optimal path — risks increasing inflammatory markers, stresses the dominant immune branch, or opposes metabolic repair — intervene with collaborative friction.
Example: "I love where you are going with this, but I want to flag a potential friction point..."

# COMMUNICATION STYLE
${informationStyleInstructions[style] ?? informationStyleInstructions['balanced']}

After each substantive response, end with a single open question that invites the practitioner's own clinical interpretation. Frame it as: "What's your read on [specific finding]?"

# FORMATTING
Use **bold** for mineral ratios, key clinical findings, protocol names.
Use *italic* for somatopsychic observations.
No ## headers. Short paragraphs. Bullet points only for 3+ items.
Start each response with the most important clinical observation.

# EVIDENCE AND CITATIONS
You have access to a curated knowledge base of foundational NTA/HTMA clinical references. When making specific clinical claims, cite relevant sources using inline superscript-style numbers [1], [2] etc.

At the end of responses that include citations, add a References section in this exact format:

References:
[1] David L. Watts. "HTMA: A Status Report." Trace Elements Inc., 1995.
[2] Forrest H. Nielsen. "Boron in Human and Animal Nutrition." USDA Human Nutrition Research, 2014.

CITATION RULES:
1. Only cite sources that genuinely support your specific claim. Do not pad with unrelated references.
2. Use HTMA references (Eck & Watts 1989, Watts 1995, Wilson 2010) when discussing mineral ratios, oxidation rate, and metabolic patterns.
3. Use NTA Foundations when discussing the foundational hierarchy (digestion → blood sugar → fatty acids → minerals → vitamins → protein).
4. When you make a clinically specific claim you cannot back with a reference from the list below, add a note on that line: ⚠️ [Clinical pattern — no specific citation available]
5. This is more trustworthy than inventing references. Never fabricate authors, titles, or PMIDs.
6. If web search results are available in the conversation, cite PubMed studies in this format:
   [3] Author et al. "Title." Journal Name. Year. pubmed.ncbi.nlm.nih.gov/PMID
7. Maximum 4 citations per response — most clinically relevant only.
8. For conversational, non-clinical messages: no citations needed.

CORE REFERENCE LIBRARY (use these — do not invent others):
${formatReferencesForPrompt()}

# CRITICAL RULES
- Never diagnose, treat, cure, or prescribe.
- Use language: "may support," "foundational nutrition," "restoration," "recalibration"
- Never use: "heal," "cure," "treat," "diagnose" as outcome claims
- Medication context: always label [MEDICATION CONTEXT], always observational only
- Referral: always flag [REFERRAL NOTE]
- You are a reasoning partner. The practitioner decides.`;
}

// ─── PubMed web search tool ────────────────────────────────────────────────

const PUBMED_SEARCH_TOOL: WebSearchTool20250305 = {
  type: 'web_search_20250305',
  name: 'web_search',
  // Restrict searches to PubMed for evidence quality
  allowed_domains: ['pubmed.ncbi.nlm.nih.gov', 'ncbi.nlm.nih.gov'],
  max_uses: 2,
};

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(sseChunk({ type: 'error', message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  let body: ChatRequestBody;
  try {
    body = await req.json() as ChatRequestBody;
  } catch {
    return new Response(sseChunk({ type: 'error', message: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const { messages, conversationId, attachedFileContent, researchMode } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(sseChunk({ type: 'error', message: 'messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const supabase = await createClient();

  // Resolve practitioner and their clinical profile
  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  const practitionerId = practitioner?.id ?? null;

  let profile: PractitionerProfile | null = null;
  if (practitionerId) {
    const { data } = await supabase
      .from('practitioner_profiles')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .single();
    profile = data as PractitionerProfile | null;
  }

  const systemPrompt = buildSystemPrompt(profile);

  // Build Anthropic messages — inject file content into first user message if present
  const anthropicMessages: MessageParam[] = messages.map((m, i) => {
    const isFirst = i === 0 && m.role === 'user' && attachedFileContent;
    if (isFirst) {
      return {
        role: 'user' as const,
        content: `[ATTACHED FILE CONTEXT]\n${attachedFileContent}\n\n[PRACTITIONER QUESTION]\n${m.content}`,
      };
    }
    return { role: m.role, content: m.content };
  });

  // Determine if web search should be enabled
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const shouldSearch =
    researchMode === true ||
    (lastUserMessage && hasClinicalSearchTerms(lastUserMessage.content));

  const encoder = new TextEncoder();
  let fullAssistantContent = '';
  let outputTokens = 0;
  let inputTokens = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: object) =>
        controller.enqueue(encoder.encode(sseChunk(data)));

      try {
        const streamParams = {
          model: COPILOT_MODEL,
          max_tokens: shouldSearch ? 3072 : 2048,
          system: systemPrompt,
          messages: anthropicMessages,
          ...(shouldSearch && { tools: [PUBMED_SEARCH_TOOL] }),
        };

        const anthropicStream = anthropic.messages.stream(streamParams);

        // Emit a signal so the UI can show "Searching PubMed..." if search is active
        if (shouldSearch) {
          enqueue({ type: 'search_active' });
        }

        anthropicStream.on('text', (text) => {
          fullAssistantContent += text;
          enqueue({ type: 'delta', content: text });
        });

        const finalMessage = await anthropicStream.finalMessage();
        inputTokens = finalMessage.usage.input_tokens;
        outputTokens = finalMessage.usage.output_tokens;

        enqueue({ type: 'done', inputTokens, outputTokens });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'LLM error';
        console.error('reasoning chat stream error:', message);
        enqueue({ type: 'error', message });
      } finally {
        controller.close();
      }

      // Persist messages to DB after stream completes
      if (practitionerId && conversationId && fullAssistantContent) {
        const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');

        const inserts: Array<{
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          attached_files: unknown[];
        }> = [];

        if (lastUserMsg) {
          inserts.push({
            conversation_id: conversationId,
            role: 'user',
            content: lastUserMsg.content,
            attached_files: [],
          });
        }

        inserts.push({
          conversation_id: conversationId,
          role: 'assistant',
          content: fullAssistantContent,
          attached_files: [],
        });

        await supabase.from('reasoning_messages').insert(inserts);

        await supabase
          .from('reasoning_conversations')
          .update({
            message_count: messages.length + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversationId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
