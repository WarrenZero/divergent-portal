import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PracticeSettingsForm from './PracticeSettingsForm';

export const metadata = { title: 'Practice Settings — Divergent' };

export default async function PracticeSettingsPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const supabase = await createClient();
  const { data } = await supabase
    .from('practitioners')
    .select('id, name, practice_name, practice_tagline, brand_color, practitioner_bio')
    .eq('id', practitioner.id)
    .single();

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--copper-500)', marginBottom: 8 }}>
          ✦ Settings
        </div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>
          Practice Settings
        </h1>
        <p style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 14, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.6 }}>
          Customize how your clients experience your practice in the portal.
        </p>
      </div>
      <PracticeSettingsForm practitioner={data ?? { id: practitioner.id, name: practitioner.name }} />
    </div>
  );
}
