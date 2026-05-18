import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentPractitioner, getCurrentClient } from '@/lib/clerk';
import { createServiceClient } from '@/lib/supabase/server';
import styles from './Portal.module.css';

export const metadata = { title: 'Divergent' };

/**
 * Role dispatcher — every login/signup lands here.
 *
 * Order of checks:
 * 1. Practitioner by clerk_user_id → /dashboard
 * 2. Client by clerk_user_id       → /checkin  (returning client)
 * 3. Client by email               → link + /checkin  (first login after invite)
 * 4. Neither                       → "not set up yet" screen
 */
export default async function PortalPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  // ── 1. Practitioner ────────────────────────────────────────────
  const practitioner = await getCurrentPractitioner();
  if (practitioner) redirect('/dashboard');

  // ── 2. Client (returning — already linked) ─────────────────────
  const client = await getCurrentClient();
  if (client) redirect('/checkin');

  // ── 3. Client (first login after invite — link by email) ────────
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? null;

  if (email) {
    const supabase = await createServiceClient();
    const { data: match } = await supabase
      .from('clients')
      .select('id')
      .eq('email', email)
      .is('clerk_user_id', null)
      .maybeSingle();

    if (match) {
      await supabase
        .from('clients')
        .update({ clerk_user_id: userId })
        .eq('id', match.id);

      redirect('/checkin');
    }
  }

  // ── 4. Not set up ───────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.glyph}>✦</div>
        <h1 className={styles.title}>You&rsquo;re almost there</h1>
        <p className={styles.body}>
          Your practitioner hasn&rsquo;t linked your account yet. Once they add your
          email to their client list and send you an invitation, you&rsquo;ll have
          full access to your wellness portal.
        </p>
        {email && (
          <p className={styles.email}>
            Signed in as <strong>{email}</strong>
          </p>
        )}
        <p className={styles.hint}>
          If you believe this is an error, reach out to your practitioner directly.
        </p>
        <Link href="/login" className={styles.back}>
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
