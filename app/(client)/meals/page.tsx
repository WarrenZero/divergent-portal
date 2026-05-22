import { requireClient } from '@/lib/clerk';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { calculateScores, type NAQDomainScore } from '@/app/(client)/naq/data';
import MealsClient from './MealsClient';

export const metadata: Metadata = {
  title: 'Recipes & Meal Plans · Divergent',
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
  sensitivity_flags: string[];
  is_ai_generated: boolean;
  prep_time_minutes: number | null;
  servings: number | null;
}

export interface SharedRecipe {
  id: string;
  note: string | null;
  is_read: boolean;
  shared_at: string;
  recipe: RecipeRow;
}

export interface RatingRow {
  recipe_id: string;
  stars: number;
  comment: string | null;
  client_id: string;
}

function getCurrentSeason(): string {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'fall';
  return 'winter';
}

export default async function MealsPage() {
  const client = await requireClient();
  const supabase = await createSupabaseClient();

  const [naqRes, sensitivityRes, sharedRes, recipesRes, savesRes, myRatingsRes, allRatingsRes] =
    await Promise.all([
      // NAQ responses for domain burden calculation
      supabase
        .from('naq_responses')
        .select('question_id, response_value')
        .eq('client_id', client.id),

      // Client's sensitivity list
      supabase
        .from('client_sensitivities')
        .select('id, sensitivity_name')
        .eq('client_id', client.id),

      // Recipes shared by practitioner
      supabase
        .from('practitioner_recipe_shares')
        .select('id, note, is_read, shared_at, recipes(*)')
        .eq('client_id', client.id)
        .order('shared_at', { ascending: false }),

      // All public recipes
      supabase
        .from('recipes')
        .select('id, title, description, dietary_tags, seasons, ingredients, instructions, macros, image_url, sensitivity_flags, is_ai_generated, prep_time_minutes, servings')
        .eq('is_public', true)
        .order('created_at', { ascending: false }),

      // Client's saved recipes
      supabase
        .from('recipe_saves')
        .select('recipe_id')
        .eq('client_id', client.id),

      // Client's own ratings
      supabase
        .from('recipe_ratings')
        .select('recipe_id, stars, comment')
        .eq('client_id', client.id),

      // All ratings for community display
      supabase
        .from('recipe_ratings')
        .select('recipe_id, stars, comment, client_id'),
    ]);

  // Compute NAQ domain scores for warnings
  const responseMap: Record<string, number> = {};
  for (const row of naqRes.data ?? []) {
    responseMap[row.question_id] = row.response_value;
  }
  const { domainScores } = calculateScores(responseMap);

  // Mark unread shares as read (non-blocking, fire and forget)
  const unreadIds = (sharedRes.data ?? [])
    .filter((s: { is_read: boolean; id: string }) => !s.is_read)
    .map((s: { id: string }) => s.id);
  if (unreadIds.length > 0) {
    supabase
      .from('practitioner_recipe_shares')
      .update({ is_read: true })
      .in('id', unreadIds)
      .then(() => {});
  }

  const savedRecipeIds = new Set((savesRes.data ?? []).map((s: { recipe_id: string }) => s.recipe_id));
  const myRatingsMap = Object.fromEntries(
    (myRatingsRes.data ?? []).map((r: { recipe_id: string; stars: number; comment: string | null }) => [
      r.recipe_id,
      { stars: r.stars, comment: r.comment },
    ]),
  );

  const sharedRecipes: SharedRecipe[] = (sharedRes.data ?? []).map((s: {
    id: string;
    note: string | null;
    is_read: boolean;
    shared_at: string;
    recipes: RecipeRow | RecipeRow[] | null;
  }) => ({
    id: s.id,
    note: s.note,
    is_read: s.is_read,
    shared_at: s.shared_at,
    recipe: Array.isArray(s.recipes) ? s.recipes[0] : s.recipes,
  })).filter((s: SharedRecipe) => s.recipe);

  return (
    <MealsClient
      clientId={client.id}
      clientSensitivities={(sensitivityRes.data ?? []).map((s: { id: string; sensitivity_name: string }) => ({
        id: s.id,
        name: s.sensitivity_name,
      }))}
      domainScores={domainScores}
      sharedRecipes={sharedRecipes}
      allRecipes={(recipesRes.data ?? []) as RecipeRow[]}
      savedIds={[...savedRecipeIds]}
      myRatings={myRatingsMap}
      allRatings={(allRatingsRes.data ?? []) as RatingRow[]}
      currentSeason={getCurrentSeason()}
    />
  );
}
