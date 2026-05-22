import { getCurrentPractitioner } from '@/lib/clerk';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import MealPlanBrowser from './MealPlanBrowser';

export const metadata: Metadata = {
  title: 'AI Meal Plans — Divergent',
};

export interface RecipeRow {
  id: string;
  title: string;
  description: string | null;
  dietary_tags: string[];
  seasons: string[];
  ingredients: Array<{ name: string; amount: string; unit: string }> | null;
  instructions: string | null;
  macros: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  } | null;
  image_url: string | null;
  image_query: string | null;
  sensitivity_flags: string[];
  is_ai_generated: boolean;
  created_by: string | null;
  prep_time_minutes: number | null;
  servings: number | null;
  created_at: string;
}

export interface ClientOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

export interface RatingRow {
  recipe_id: string;
  stars: number;
  comment: string | null;
}

export default async function MealPlansPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect('/login');

  const supabase = await createSupabaseClient();

  const [recipesRes, clientsRes, ratingsRes] = await Promise.all([
    supabase
      .from('recipes')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false }),

    supabase
      .from('clients')
      .select('id, first_name, last_name, email')
      .eq('practitioner_id', practitioner.id)
      .order('last_name'),

    supabase
      .from('recipe_ratings')
      .select('recipe_id, stars, comment')
      .in(
        'client_id',
        // Sub-query equivalent: ratings from this practitioner's clients only
        // We'll filter client-side since RLS already scopes this
        [],
      ),
  ]);

  // Also fetch ratings across all clients for public recipes
  const { data: allRatings } = await supabase
    .from('recipe_ratings')
    .select('recipe_id, stars, comment');

  return (
    <MealPlanBrowser
      recipes={(recipesRes.data ?? []) as RecipeRow[]}
      clients={(clientsRes.data ?? []) as ClientOption[]}
      ratings={(allRatings ?? []) as RatingRow[]}
      practitionerId={practitioner.id}
    />
  );
}
