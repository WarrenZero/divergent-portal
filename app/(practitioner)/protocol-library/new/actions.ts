'use server';

import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';

interface PhaseInput {
  name: string;
  durationDays: number;
  description: string;
}

export async function saveCustomProtocol(input: {
  name: string;
  phases: PhaseInput[];
}): Promise<{ error?: string; id?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated' };

  const supabase = await createServiceClient();

  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!practitioner) return { error: 'Not authorized' };

  const phaseContent = input.phases
    .map((p, i) => `## Phase ${i + 1}: ${p.name}\n\nDuration: ${p.durationDays} days\n\n${p.description}`)
    .join('\n\n---\n\n');

  const { data, error } = await supabase
    .from('protocols')
    .insert({
      name: input.name,
      phase_count: input.phases.length,
      content_html: phaseContent,
      is_template: true,
      created_by: practitioner.id,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: data?.id };
}
