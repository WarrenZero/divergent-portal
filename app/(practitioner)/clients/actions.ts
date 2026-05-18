'use server';

import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface ActionState {
  error?: string;
}

export async function addClient(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await auth();
  if (!userId) return { error: 'Not authenticated. Please sign in.' };

  // Pull and trim every field
  const firstName = formData.get('first_name')?.toString().trim() ?? '';
  const lastName = formData.get('last_name')?.toString().trim() ?? '';
  const email = formData.get('email')?.toString().trim() || null;
  const primaryConcern = formData.get('primary_concern')?.toString().trim() || null;
  const rawDob = formData.get('date_of_birth')?.toString().trim() || '';
  const dateOfBirth = rawDob || null;

  // Validate required fields
  if (!firstName) return { error: 'First name is required.' };
  if (!lastName) return { error: 'Last name is required.' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address.' };
  }

  // Use service client so this works regardless of JWT template setup
  const supabase = await createServiceClient();

  // Resolve practitioner_id from Clerk user ID
  const { data: practitioner, error: practitionerError } = await supabase
    .from('practitioners')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (practitionerError || !practitioner) {
    console.error('addClient: practitioner lookup failed', practitionerError?.message);
    return { error: 'Practitioner record not found. Please try signing out and back in.' };
  }

  const { error: insertError } = await supabase.from('clients').insert({
    practitioner_id: practitioner.id,
    first_name: firstName,
    last_name: lastName,
    email,
    primary_concern: primaryConcern,
    date_of_birth: dateOfBirth,
    wellness_score: 0,
  });

  if (insertError) {
    console.error('addClient: insert failed', insertError.message);
    return { error: 'Could not save the client. Please try again.' };
  }

  redirect('/clients');
}
