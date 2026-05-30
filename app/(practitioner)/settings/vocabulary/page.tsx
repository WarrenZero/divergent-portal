import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import VocabularyManager from './VocabularyManager';

export const metadata: Metadata = {
  title: 'Custom Vocabulary — Divergent',
};

export interface VocabTerm {
  id: string;
  term: string;
  definition: string;
  phonetic_variants: string[];
  created_at: string;
}

// Default ENS/HTMA vocabulary seeded on first visit
const DEFAULT_VOCAB: Array<{ term: string; definition: string; phonetic_variants: string[] }> = [
  { term: 'ENS', definition: 'Enteric Nervous System', phonetic_variants: ['enteric nervous', 'e-n-s'] },
  { term: 'HTMA', definition: 'Hair Tissue Mineral Analysis', phonetic_variants: ['hymn a', 'h-t-m-a', 'htma'] },
  { term: 'MABC', definition: 'Mineral and Adrenal Balance Calibration', phonetic_variants: ['m-a-b-c', 'mabc'] },
  { term: 'Ca/Mg ratio', definition: 'Calcium to Magnesium ratio — key thyroid/parathyroid indicator', phonetic_variants: ['calcium magnesium', 'ca mg'] },
  { term: 'Na/K ratio', definition: 'Sodium to Potassium ratio — adrenal function indicator', phonetic_variants: ['sodium potassium', 'na k'] },
  { term: 'SDA', definition: 'Specific Dynamic Action — thermogenic effect of food', phonetic_variants: ['specific dynamic action'] },
  { term: 'NTP', definition: 'Nutritional Therapy Practitioner', phonetic_variants: ['n-t-p', 'nutritional therapy practitioner'] },
  { term: 'Fast Oxidizer', definition: 'Sympathetic-dominant metabolic type with Humoral immune dominance', phonetic_variants: ['fast oxidizer', 'fast ox'] },
  { term: 'Slow Oxidizer', definition: 'Parasympathetic-dominant metabolic type with Cellular immune dominance', phonetic_variants: ['slow oxidizer', 'slow ox'] },
];

export default async function VocabularyPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const supabase = await createSupabaseClient();

  // Fetch existing vocab
  const { data: existing } = await supabase
    .from('practitioner_vocabulary')
    .select('id, term, definition, phonetic_variants, created_at')
    .eq('practitioner_id', practitioner.id)
    .order('created_at', { ascending: true });

  // Seed default vocab if none exists
  let terms: VocabTerm[] = (existing ?? []) as VocabTerm[];
  if (terms.length === 0) {
    const { data: seeded } = await supabase
      .from('practitioner_vocabulary')
      .insert(
        DEFAULT_VOCAB.map((v) => ({
          practitioner_id: practitioner.id,
          ...v,
        })),
      )
      .select('id, term, definition, phonetic_variants, created_at');
    terms = (seeded ?? []) as VocabTerm[];
  }

  return <VocabularyManager terms={terms} practitionerId={practitioner.id} />;
}
