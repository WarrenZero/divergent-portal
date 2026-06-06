'use server';

import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';

interface PracticeSettingsInput {
  practiceName: string;
  displayName: string;
  tagline: string;
  brandColor: string;
  bio: string;
}

export async function savePracticeSettings(input: PracticeSettingsInput): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated' };

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from('practitioners')
    .update({
      name: input.displayName || undefined,
      practice_name: input.practiceName || null,
      practice_tagline: input.tagline || null,
      brand_color: input.brandColor,
      practitioner_bio: input.bio || null,
    })
    .eq('clerk_user_id', userId);

  if (error) return { error: error.message };
  return {};
}
