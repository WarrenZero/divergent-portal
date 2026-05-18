import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────

export interface Practitioner {
  id: string;
  clerk_user_id: string;
  name: string;
  email: string;
  ntp_credential: string | null;
  practice_name: string | null;
  practice_location: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  practitioner_id: string;
  clerk_user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  date_of_birth: string | null;
  primary_concern: string | null;
  current_protocol_id: string | null;
  wellness_score: number;
  created_at: string;
}

// ─── Practitioner helpers ─────────────────────────────────────

/**
 * Returns the practitioner row for the currently authenticated user.
 * Returns null if no row exists yet (first login before sync).
 */
export async function getCurrentPractitioner(): Promise<Practitioner | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('practitioners')
    .select('*')
    .eq('clerk_user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('getCurrentPractitioner:', error.message);
  }
  return data ?? null;
}

/**
 * Upserts a practitioner record for the current Clerk user.
 * Safe to call on every dashboard load — idempotent via `onConflict`.
 * Uses the service-role client so the INSERT isn't blocked by RLS
 * (the row doesn't exist yet when called for the first time).
 */
export async function syncPractitioner(): Promise<Practitioner | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.emailAddresses[0]?.emailAddress ||
    'Practitioner';

  const email = user.emailAddresses[0]?.emailAddress ?? '';

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('practitioners')
    .upsert({ clerk_user_id: userId, name, email }, { onConflict: 'clerk_user_id' })
    .select()
    .single();

  if (error) console.error('syncPractitioner:', error.message);
  return data ?? null;
}

/**
 * Like getCurrentPractitioner but redirects to sign-in if not authenticated,
 * and redirects to an onboarding error if no practitioner record exists.
 * Use in Server Components that require a valid practitioner context.
 */
export async function requirePractitioner(): Promise<Practitioner> {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  // Sync on every request — no-op if record already exists
  const practitioner = await syncPractitioner();
  if (!practitioner) redirect('/login?error=sync_failed');

  return practitioner;
}

// ─── Client helpers ───────────────────────────────────────────

/**
 * Returns the client row for the currently authenticated user.
 * Returns null if the user is not linked to a client record.
 */
export async function getCurrentClient(): Promise<Client | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('clerk_user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('getCurrentClient:', error.message);
  }
  return data ?? null;
}

/**
 * Like getCurrentClient but redirects to sign-in if not authenticated,
 * and throws if no client record is linked to the Clerk user.
 */
export async function requireClient(): Promise<Client> {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const client = await getCurrentClient();
  if (!client) redirect('/login?error=no_client_record');

  return client;
}
