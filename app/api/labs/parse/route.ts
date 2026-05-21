import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { anthropic, COPILOT_MODEL } from '@/lib/anthropic/client';
import { createClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────

export interface ParsedMarker {
  test_name: string;
  value: string | number;
  unit: string;
  standard_low: number | null;
  standard_high: number | null;
  reference_range: string;
}

interface FunctionalRangeDef {
  id: string;
  aliases: string[];
  functional_low?: number;
  functional_high?: number;
  standard_low?: number;
  standard_high?: number;
  note: string;
}

export interface FunctionalFlag {
  test_name: string;
  value: number;
  unit: string;
  standard_low: number | null;
  standard_high: number | null;
  functional_low: number | null;
  functional_high: number | null;
  status: 'optimal' | 'suboptimal' | 'out_of_range';
  direction: 'low' | 'high' | null;
  note: string;
}

// ─── Functional Range Definitions ─────────────────────────────

const FUNCTIONAL_RANGES: FunctionalRangeDef[] = [
  {
    id: 'tsh',
    aliases: ['tsh', 'thyroid stimulating hormone', 'thyrotropin'],
    functional_low: 1.0,
    functional_high: 2.0,
    standard_low: 0.5,
    standard_high: 4.5,
    note: 'Functional: 1.0–2.0 mIU/L — optimal thyroid axis activity',
  },
  {
    id: 'glucose',
    aliases: ['fasting glucose', 'glucose fasting', 'blood glucose', 'glucose', 'fbs', 'fpg', 'fasting blood sugar'],
    functional_low: 75,
    functional_high: 86,
    standard_low: 70,
    standard_high: 100,
    note: 'Functional: 75–86 mg/dL — optimal fasting glycemic regulation',
  },
  {
    id: 'ferritin',
    aliases: ['ferritin', 'serum ferritin'],
    functional_low: 50,
    functional_high: 150,
    standard_low: 12,
    standard_high: 150,
    note: 'Functional: 50–150 ng/mL — optimal iron storage; low ferritin stalls mitochondrial energy',
  },
  {
    id: 'vitamin_d',
    aliases: [
      'vitamin d', 'vit d', '25-oh vitamin d', '25 oh vitamin d',
      '25-hydroxyvitamin d', '25(oh)d', '25-oh-d', 'cholecalciferol', 'calcidiol',
    ],
    functional_low: 60,
    functional_high: 80,
    standard_low: 30,
    standard_high: 100,
    note: 'Functional: 60–80 ng/mL — optimal immune modulation and hormonal synthesis',
  },
  {
    id: 'b12',
    aliases: ['b12', 'vitamin b12', 'cobalamin', 'cyanocobalamin', 'vitamin b-12', 'b-12'],
    functional_low: 700,
    functional_high: 900,
    standard_low: 200,
    standard_high: 900,
    note: 'Functional: 700–900 pg/mL — optimal myelin integrity and methylation support',
  },
  {
    id: 'hba1c',
    aliases: [
      'hemoglobin a1c', 'hba1c', 'hb a1c', 'a1c', 'glycated hemoglobin',
      'glycohemoglobin', 'haemoglobin a1c', 'glycosylated hemoglobin',
    ],
    functional_high: 5.4,
    standard_high: 5.7,
    note: 'Functional: <5.4% — optimal long-term glycemic regulation',
  },
  {
    id: 'total_cholesterol',
    aliases: ['total cholesterol', 'cholesterol total', 'cholesterol', 'chol'],
    functional_low: 160,
    functional_high: 220,
    standard_high: 200,
    note: 'Functional: 160–220 mg/dL — optimal lipid substrate for steroid hormone synthesis',
  },
  {
    id: 'triglycerides',
    aliases: ['triglycerides', 'trigs', 'trig', 'triglyceride'],
    functional_high: 100,
    standard_high: 150,
    note: 'Functional: <100 mg/dL — optimal hepatic fat metabolism and insulin sensitivity',
  },
  {
    id: 'hdl',
    aliases: ['hdl', 'hdl cholesterol', 'hdl-c', 'high density lipoprotein', 'hdl-cholesterol'],
    functional_low: 55,
    standard_low: 40,
    note: 'Functional: >55 mg/dL — optimal reverse cholesterol transport',
  },
  {
    id: 'sodium',
    aliases: ['sodium', 'na', 'serum sodium', 'sodium serum'],
    functional_low: 135,
    functional_high: 142,
    standard_low: 136,
    standard_high: 145,
    note: 'Functional: 135–142 mEq/L — optimal adrenal-driven electrolyte balance',
  },
  {
    id: 'potassium',
    aliases: ['potassium', 'k', 'serum potassium', 'potassium serum'],
    functional_low: 4.0,
    functional_high: 4.5,
    standard_low: 3.5,
    standard_high: 5.1,
    note: 'Functional: 4.0–4.5 mEq/L — optimal Na/K ratio for cellular energy',
  },
  {
    id: 'magnesium',
    aliases: ['magnesium', 'mg', 'serum magnesium', 'magnesium serum'],
    functional_low: 2.0,
    functional_high: 2.5,
    standard_low: 1.7,
    standard_high: 2.2,
    note: 'Functional: 2.0–2.5 mg/dL — optimal cofactor for 300+ enzymatic reactions',
  },
];

// ─── Matching Logic ────────────────────────────────────────────

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findFunctionalRange(testName: string): FunctionalRangeDef | null {
  const normalized = normalizeName(testName);

  // Exact match first
  for (const def of FUNCTIONAL_RANGES) {
    if (def.aliases.some((alias) => normalized === alias)) return def;
  }

  // Substring match (test name contains alias, or alias contains test name)
  for (const def of FUNCTIONAL_RANGES) {
    if (
      def.aliases.some(
        (alias) => normalized.includes(alias) || alias.includes(normalized),
      )
    ) {
      return def;
    }
  }

  return null;
}

// ─── Status Computation ───────────────────────────────────────

function getStatus(
  value: number,
  def: FunctionalRangeDef,
  markerStandardLow: number | null,
  markerStandardHigh: number | null,
): { status: 'optimal' | 'suboptimal' | 'out_of_range'; direction: 'low' | 'high' | null } {
  const funcLow = def.functional_low ?? null;
  const funcHigh = def.functional_high ?? null;

  const aboveFuncLow = funcLow == null || value >= funcLow;
  const belowFuncHigh = funcHigh == null || value <= funcHigh;

  if (aboveFuncLow && belowFuncHigh) {
    return { status: 'optimal', direction: null };
  }

  const direction: 'low' | 'high' = !aboveFuncLow ? 'low' : 'high';

  // Check standard range
  const stdLow = markerStandardLow ?? def.standard_low ?? null;
  const stdHigh = markerStandardHigh ?? def.standard_high ?? null;
  const aboveStdLow = stdLow == null || value >= stdLow;
  const belowStdHigh = stdHigh == null || value <= stdHigh;

  if (!aboveStdLow || !belowStdHigh) {
    return { status: 'out_of_range', direction };
  }

  return { status: 'suboptimal', direction };
}

// ─── Route Handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { pdfBase64: string; clientId: string | null; fileName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { pdfBase64, clientId, fileName } = body;
  if (!pdfBase64) return NextResponse.json({ error: 'No PDF provided' }, { status: 400 });

  const supabase = await createClient();

  // Verify practitioner exists
  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) {
    return NextResponse.json({ error: 'Practitioner not found' }, { status: 403 });
  }

  // If clientId provided, verify it belongs to this practitioner
  if (clientId) {
    const { data: clientCheck } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('practitioner_id', practitioner.id)
      .single();

    if (!clientCheck) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
  }

  // ─── Extract markers via Claude ─────────────────────────────

  let rawMarkers: ParsedMarker[] = [];

  try {
    const response = await anthropic.messages.create({
      model: COPILOT_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
            {
              type: 'text',
              text: 'Extract all lab values from this report. For each value return: test_name, value (as number), unit, standard_low, standard_high, and reference_range (the printed range string). Return ONLY a JSON array, no explanation, no markdown code blocks.',
            },
          ],
        },
      ],
    });

    const textContent = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    // Strip markdown code fences if present
    const stripped = textContent
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    // Find the JSON array
    const arrayStart = stripped.indexOf('[');
    const arrayEnd = stripped.lastIndexOf(']');
    if (arrayStart === -1 || arrayEnd === -1) {
      throw new Error('No JSON array found in response');
    }

    rawMarkers = JSON.parse(stripped.slice(arrayStart, arrayEnd + 1));

    if (!Array.isArray(rawMarkers)) throw new Error('Parsed result is not an array');
  } catch (err) {
    console.error('[labs/parse] extraction error:', err);
    return NextResponse.json(
      { error: 'Failed to extract lab values from PDF. Ensure the file is a readable lab report.' },
      { status: 500 },
    );
  }

  // ─── Functional range analysis ──────────────────────────────

  const functionalFlags: FunctionalFlag[] = [];

  for (const marker of rawMarkers) {
    const numValue =
      typeof marker.value === 'string' ? parseFloat(marker.value) : marker.value;

    if (isNaN(numValue)) continue;

    const def = findFunctionalRange(marker.test_name);
    if (!def) continue;

    const { status, direction } = getStatus(
      numValue,
      def,
      marker.standard_low,
      marker.standard_high,
    );

    functionalFlags.push({
      test_name: marker.test_name,
      value: numValue,
      unit: marker.unit,
      standard_low: marker.standard_low,
      standard_high: marker.standard_high,
      functional_low: def.functional_low ?? null,
      functional_high: def.functional_high ?? null,
      status,
      direction,
      note: def.note,
    });
  }

  // ─── Save to Supabase ────────────────────────────────────────

  const { data: labResult, error: insertError } = await supabase
    .from('lab_results')
    .insert({
      client_id: clientId ?? null,
      file_name: fileName ?? 'lab_report.pdf',
      parsed_markers: rawMarkers,
      functional_flags: functionalFlags,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[labs/parse] insert error:', insertError.message);
    // Non-fatal — return results even if save fails
    console.warn('[labs/parse] continuing despite save failure');
  }

  console.log(
    '[labs/parse] complete — markers:', rawMarkers.length,
    '| flags:', functionalFlags.length,
    '| labId:', labResult?.id ?? 'unsaved',
  );

  return NextResponse.json({
    markers: rawMarkers,
    flags: functionalFlags,
    labId: labResult?.id ?? null,
  });
}
