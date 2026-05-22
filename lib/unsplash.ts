// ─── Unsplash food photo fetcher ─────────────────────────────────
// Fetches a landscape food photo for a given search query.
// Falls back to a CSS gradient if API key is missing or request fails.
// Callers should cache the returned URL in the recipes.image_url column.

const UNSPLASH_BASE = 'https://api.unsplash.com';

// Warm, food-appropriate CSS gradients used as fallbacks
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #F5E0CC 0%, #DFA878 100%)',
  'linear-gradient(135deg, #DDE8DE 0%, #80A088 100%)',
  'linear-gradient(135deg, #F8F2E8 0%, #D4C4B0 100%)',
  'linear-gradient(135deg, #F0E8DA 0%, #C07848 100%)',
  'linear-gradient(135deg, #E8DECE 0%, #5A7C62 100%)',
];

function pickFallback(query: string): string {
  // Deterministic gradient based on query so it's consistent across renders
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = (hash * 31 + query.charCodeAt(i)) & 0xffffffff;
  }
  return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length];
}

export async function getRecipePhoto(query: string): Promise<string> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return pickFallback(query);

  try {
    const url = new URL(`${UNSPLASH_BASE}/photos/random`);
    url.searchParams.set('query', `${query},food`);
    url.searchParams.set('orientation', 'landscape');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${key}` },
      // Next.js fetch cache — revalidate daily so repeated builds
      // don't exhaust the 50 req/hr demo limit
      next: { revalidate: 86400 },
    });

    if (!res.ok) return pickFallback(query);

    const photo = await res.json();
    return (photo?.urls?.regular as string) ?? pickFallback(query);
  } catch {
    return pickFallback(query);
  }
}
