import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './SymptomMapsLanding.module.css';

export const metadata: Metadata = {
  title: 'Symptom Maps — Divergent',
};

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  primary_concern: string | null;
  wellness_score: number;
}

export default async function SymptomMapsPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const supabase = await createSupabaseClient();

  const { data: clients } = await supabase
    .from('clients')
    .select('id, first_name, last_name, primary_concern, wellness_score')
    .eq('practitioner_id', practitioner.id)
    .order('last_name', { ascending: true });

  const rows = (clients ?? []) as ClientRow[];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerGlyph}>◎</div>
        <div>
          <h1 className={styles.title}>Symptom Maps</h1>
          <p className={styles.subtitle}>Select a client to view their NAQ burden radar and trend history.</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyGlyph}>◎</span>
          <p>No clients yet. Add a client to generate a symptom map.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {rows.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}/symptoms`}
              className={styles.card}
            >
              <div className={styles.cardInitials}>
                {c.first_name[0]}{c.last_name[0]}
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardName}>{c.first_name} {c.last_name}</div>
                {c.primary_concern && (
                  <div className={styles.cardConcern}>{c.primary_concern}</div>
                )}
              </div>
              <div className={styles.cardScore} style={{
                color: c.wellness_score >= 70 ? 'var(--pine-400)' : c.wellness_score >= 40 ? 'var(--copper-500)' : '#B04848',
              }}>
                {c.wellness_score}
                <span className={styles.cardScoreUnit}>/100</span>
              </div>
              <div className={styles.cardArrow}>→</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
