#!/usr/bin/env node
// ─── Backfill recipe photos ───────────────────────────────────────
// Fetches an Unsplash photo for every recipe that has a null image_url
// and writes it back to the recipes table.
//
// Usage:  node scripts/fetch-recipe-photos.mjs
// Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//           UNSPLASH_ACCESS_KEY  (reads from .env.local automatically)

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env.local manually (no dotenv dependency needed) ──────────
const envPath = resolve(process.cwd(), '.env.local');
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.warn('Warning: could not read .env.local — relying on existing env vars');
}

// ── Config ───────────────────────────────────────────────────────────
// Strip trailing /rest/v1/ if present — Supabase client wants the base URL
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY ?? '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!UNSPLASH_KEY) {
  console.warn('UNSPLASH_ACCESS_KEY not set — will write gradient fallbacks');
}

// ── Helpers ──────────────────────────────────────────────────────────
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #F5E0CC 0%, #DFA878 100%)',
  'linear-gradient(135deg, #DDE8DE 0%, #80A088 100%)',
  'linear-gradient(135deg, #F8F2E8 0%, #D4C4B0 100%)',
  'linear-gradient(135deg, #F0E8DA 0%, #C07848 100%)',
  'linear-gradient(135deg, #E8DECE 0%, #5A7C62 100%)',
];

function pickFallback(query) {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = (hash * 31 + query.charCodeAt(i)) & 0xffffffff;
  }
  return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length];
}

async function getPhoto(query) {
  if (!UNSPLASH_KEY) return pickFallback(query);
  try {
    const url = new URL('https://api.unsplash.com/photos/random');
    url.searchParams.set('query', `${query},food`);
    url.searchParams.set('orientation', 'landscape');
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
    });
    if (!res.ok) {
      console.warn(`  Unsplash ${res.status} for "${query}" — using fallback`);
      return pickFallback(query);
    }
    const photo = await res.json();
    return photo?.urls?.regular ?? pickFallback(query);
  } catch (err) {
    console.warn(`  Unsplash error for "${query}": ${err.message} — using fallback`);
    return pickFallback(query);
  }
}

// ── Supabase REST helpers (no SDK needed) ───────────────────────────
function supabaseHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };
}

async function fetchRecipes() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/recipes?select=id,title,image_query,image_url&is_public=eq.true&order=created_at.asc`,
    { headers: supabaseHeaders() },
  );
  if (!res.ok) throw new Error(`Failed to fetch recipes: ${res.status} ${await res.text()}`);
  return res.json();
}

async function updateImageUrl(id, imageUrl) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/recipes?id=eq.${id}`, {
    method: 'PATCH',
    headers: supabaseHeaders(),
    body: JSON.stringify({ image_url: imageUrl }),
  });
  if (!res.ok) throw new Error(`Failed to update ${id}: ${res.status} ${await res.text()}`);
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching recipes from Supabase...');
  const recipes = await fetchRecipes();

  const toProcess = recipes.filter((r) => !r.image_url);
  const alreadyDone = recipes.length - toProcess.length;

  console.log(`Total: ${recipes.length} recipes | Already have photo: ${alreadyDone} | Need fetch: ${toProcess.length}\n`);

  if (toProcess.length === 0) {
    console.log('All recipes already have image_url values. Nothing to do.');
    return;
  }

  let success = 0;
  let fallback = 0;

  for (const recipe of toProcess) {
    const query = recipe.image_query ?? recipe.title;
    process.stdout.write(`  Fetching "${query}"... `);
    const imageUrl = await getPhoto(query);
    const isFallback = imageUrl.startsWith('linear-gradient');
    await updateImageUrl(recipe.id, imageUrl);
    console.log(isFallback ? '[gradient fallback]' : '[photo]');
    if (isFallback) fallback++; else success++;

    // Respect Unsplash demo rate limit: 50 req/hr = 1 per 72ms
    // Add a small buffer to be safe
    if (UNSPLASH_KEY && !isFallback) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log(`\nDone. ${success} photos fetched, ${fallback} gradient fallbacks written.`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
