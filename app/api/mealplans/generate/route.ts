import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { anthropic } from '@/lib/anthropic/client';
import { calculateScores } from '@/app/(client)/naq/data';

interface GenerateBody {
  clientId: string;
  dietaryLifestyle: string;
  specialRequests: string;
  season: string;
}

interface GeneratedRecipe {
  title: string;
  description: string;
  therapeutic_note: string;
  ingredients: Array<{ name: string; amount: string; unit: string }>;
  instructions: string;
  macros: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  prep_time_minutes: number;
  servings: number;
  dietary_tags: string[];
  sensitivity_flags: string[];
  image_query: string;
  why_this_recipe: string;
}

const MEAL_PLAN_SYSTEM =
  'You are a clinical nutritional therapy AI specializing in the MABC anti-inflammatory protocol and ENS restoration. Generate recipes that support foundational healing. You always return ONLY valid JSON — no prose, no markdown, no explanation outside the JSON structure requested.';

export async function POST(req: NextRequest) {
  // 1. Auth — practitioner only
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // Resolve practitioner
  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) {
    return NextResponse.json({ error: 'Practitioner not found' }, { status: 403 });
  }

  // 2. Parse body
  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { clientId, dietaryLifestyle, specialRequests, season } = body;
  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 });
  }

  // Verify practitioner owns this client
  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name')
    .eq('id', clientId)
    .eq('practitioner_id', practitioner.id)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // 3. Fetch contextual data in parallel
  const [naqRes, sensitivityRes, protocolRes] = await Promise.all([
    supabase
      .from('naq_responses')
      .select('question_id, response_value')
      .eq('client_id', clientId),

    supabase
      .from('client_sensitivities')
      .select('sensitivity_name')
      .eq('client_id', clientId),

    supabase
      .from('client_protocols')
      .select('current_phase, protocols(name)')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  // Build domain burden profile from NAQ responses
  const responseMap: Record<string, number> = {};
  for (const row of naqRes.data ?? []) {
    responseMap[row.question_id] = row.response_value;
  }
  const { domainScores } = calculateScores(responseMap);
  const burdenLines = domainScores
    .map((d) => `  ${d.name}: ${d.burden}% burden`)
    .join('\n');

  const sensitivities = (sensitivityRes.data ?? [])
    .map((s) => s.sensitivity_name)
    .join(', ') || 'None noted';

  const protocolRecord = protocolRes.data as {
    current_phase: number;
    protocols: { name: string } | null;
  } | null;
  const protocolLine = protocolRecord
    ? `${protocolRecord.protocols?.name ?? 'Active protocol'}, Phase ${protocolRecord.current_phase}`
    : 'No active protocol';

  // 4. Call Claude
  const userMessage = `Generate a detailed therapeutic recipe for this client:

NAQ BURDEN PROFILE:
${burdenLines}

PROTOCOL: ${protocolLine}
DIETARY LIFESTYLE: ${dietaryLifestyle || 'No specific preference'}
SENSITIVITIES TO AVOID: ${sensitivities}
SEASON: ${season}
SPECIAL REQUESTS: ${specialRequests || 'None'}

Return ONLY valid JSON with this exact structure:
{
  "title": "string",
  "description": "string",
  "therapeutic_note": "string",
  "ingredients": [{"name": "string", "amount": "string", "unit": "string"}],
  "instructions": "string (numbered steps, each on a new line)",
  "macros": {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0},
  "prep_time_minutes": 0,
  "servings": 0,
  "dietary_tags": [],
  "sensitivity_flags": [],
  "image_query": "2-3 word search term",
  "why_this_recipe": "2-3 sentence therapeutic rationale"
}`;

  let rawContent = '';
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: MEAL_PLAN_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    });

    rawContent = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'LLM error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // 5. Parse Claude JSON response (strip markdown fences if present)
  let recipe: GeneratedRecipe;
  try {
    let json = rawContent.trim();
    const fenceMatch = json.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) json = fenceMatch[1].trim();
    const start = json.indexOf('{');
    const end = json.lastIndexOf('}');
    if (start !== -1 && end !== -1) json = json.slice(start, end + 1);
    recipe = JSON.parse(json) as GeneratedRecipe;
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: rawContent }, { status: 502 });
  }

  // 6. Fetch food photo (inline for debug visibility in Vercel logs)
  const imageQuery = recipe.image_query ?? recipe.title;
  const unsplashUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(imageQuery + ' food')}&orientation=landscape&content_filter=high`;

  const photoRes = await fetch(unsplashUrl, {
    headers: {
      Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
    },
  });

  console.log('Unsplash status:', photoRes.status);
  console.log('Unsplash key present:', !!process.env.UNSPLASH_ACCESS_KEY);

  let imageUrl: string | null = null;
  if (photoRes.ok) {
    const photoData = await photoRes.json();
    imageUrl = photoData?.urls?.regular || null;
    console.log('Photo URL:', imageUrl);
  } else {
    console.log('Unsplash error:', await photoRes.text());
  }

  // 7. Save to database
  const { data: saved, error: saveError } = await supabase
    .from('recipes')
    .insert({
      title: recipe.title,
      description: recipe.description,
      dietary_tags: recipe.dietary_tags ?? [],
      seasons: [season],
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      macros: recipe.macros,
      image_query: recipe.image_query,
      image_url: imageUrl,
      sensitivity_flags: recipe.sensitivity_flags ?? [],
      is_ai_generated: true,
      created_by: practitioner.id,
      is_public: true,
      prep_time_minutes: recipe.prep_time_minutes,
      servings: recipe.servings,
    })
    .select()
    .single();

  if (saveError) {
    console.error('recipe save error:', saveError.message);
    // Return the generated recipe even if save failed
    return NextResponse.json({
      ...recipe,
      image_url: imageUrl,
      id: null,
      therapeutic_note: recipe.therapeutic_note,
      why_this_recipe: recipe.why_this_recipe,
      _saveError: saveError.message,
    });
  }

  return NextResponse.json({
    ...saved,
    therapeutic_note: recipe.therapeutic_note,
    why_this_recipe: recipe.why_this_recipe,
  });
}
