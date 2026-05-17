import { createServerClient } from '@supabase/ssr';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

/**
 * Normalize the Supabase URL — strip any trailing REST path if accidentally
 * included (e.g. "/rest/v1/"). The JS client only wants the project base URL.
 */
function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return raw.replace(/\/(rest|auth|storage|realtime)(\/.*)?$/, '');
}

/**
 * Server-side Supabase client with Clerk JWT injected.
 *
 * Clerk must have a JWT template named "supabase" configured in the Clerk
 * dashboard (Authentication → JWT Templates → New → Supabase).
 * That template passes the Clerk user ID as `sub`, which the RLS policies
 * key off via `auth.jwt() ->> 'sub'`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  // Get a Supabase-compatible JWT from Clerk (requires "supabase" template in Clerk dashboard)
  let supabaseToken: string | null = null;
  try {
    const { getToken } = await auth();
    supabaseToken = await getToken({ template: 'supabase' });
  } catch {
    // Not authenticated — proceed as anon (RLS will block PHI access)
  }

  return createServerClient(getSupabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: {
      headers: supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {},
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — middleware will handle cookie writes
        }
      },
    },
  });
}

/**
 * Service-role client — bypasses RLS entirely.
 * Use ONLY for server-side admin operations (e.g. creating practitioner
 * records on first sign-up). Never expose this client to the browser.
 */
export async function createServiceClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() {},  // service role never needs to set cookies
    },
  });
}
