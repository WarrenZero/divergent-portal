'use client';

import { useState, useMemo, useTransition } from 'react';
import MacroBar, { type Macros } from '@/components/shared/MacroBar';
import type { RecipeRow, ClientOption, RatingRow } from './page';
import styles from './MealPlanBrowser.module.css';

// ─── Constants ────────────────────────────────────────────────

const LIFESTYLE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ens-protocol', label: 'ENS Protocol' },
  { id: 'anti-inflammatory', label: 'Anti-Inflammatory' },
  { id: 'paleo', label: 'Paleo' },
  { id: 'keto', label: 'Keto' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'aip', label: 'AIP' },
  { id: 'mediterranean', label: 'Mediterranean' },
  { id: 'gluten-free', label: 'Gluten-Free' },
];

const SEASONS = [
  { id: 'all', label: 'All Seasons', emoji: '' },
  { id: 'spring', label: 'Spring', emoji: '🌸' },
  { id: 'summer', label: 'Summer', emoji: '☀️' },
  { id: 'fall', label: 'Fall', emoji: '🍂' },
  { id: 'winter', label: 'Winter', emoji: '❄️' },
];

function getCurrentSeason(): string {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'fall';
  return 'winter';
}

function averageRating(ratings: RatingRow[], recipeId: string) {
  const r = ratings.filter((x) => x.recipe_id === recipeId);
  if (!r.length) return null;
  return Math.round((r.reduce((s, x) => s + x.stars, 0) / r.length) * 10) / 10;
}

// ─── Recipe Detail Modal ──────────────────────────────────────

interface DetailModalProps {
  recipe: RecipeRow;
  ratings: RatingRow[];
  clients: ClientOption[];
  onClose: () => void;
}

function RecipeDetailModal({ recipe, ratings, clients, onClose }: DetailModalProps) {
  const [shareClientId, setShareClientId] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [shareStatus, setShareStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [, startTransition] = useTransition();

  const recipeRatings = ratings.filter((r) => r.recipe_id === recipe.id);
  const avg = averageRating(ratings, recipe.id);
  const macros = recipe.macros as Macros | null;

  async function handleShare() {
    if (!shareClientId) return;
    setShareStatus('sending');
    try {
      const res = await fetch('/api/mealplans/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: shareClientId, recipeId: recipe.id, note: shareNote }),
      });
      if (res.ok) {
        setShareStatus('sent');
      } else {
        setShareStatus('error');
      }
    } catch {
      setShareStatus('error');
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-label={recipe.title}>
        {/* Hero photo */}
        <div
          className={styles.modalHero}
          style={{
            backgroundImage: recipe.image_url?.startsWith('linear-gradient')
              ? recipe.image_url
              : recipe.image_url
              ? `url(${recipe.image_url})`
              : 'linear-gradient(135deg, #F5E0CC 0%, #DFA878 100%)',
          }}
        >
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
          {recipe.is_ai_generated && <span className={styles.aiBadgeHero}>✦ AI Generated</span>}
        </div>

        <div className={styles.modalBody}>
          {/* Header */}
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>{recipe.title}</h2>
            <div className={styles.modalTags}>
              {recipe.dietary_tags.slice(0, 3).map((t) => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
            </div>
            <div className={styles.modalMeta}>
              {recipe.prep_time_minutes && <span>⏱ {recipe.prep_time_minutes} min</span>}
              {recipe.servings && <span>· {recipe.servings} servings</span>}
              {avg !== null && <span>· ⭐ {avg}</span>}
            </div>
          </div>

          {/* Why this recipe (AI only) */}
          {(recipe as RecipeRow & { why_this_recipe?: string }).why_this_recipe && (
            <div className={styles.therapeuticNote}>
              <div className={styles.therapeuticNoteLabel}>✦ Therapeutic Note</div>
              <p>{(recipe as RecipeRow & { why_this_recipe?: string }).why_this_recipe}</p>
            </div>
          )}

          {/* Sensitivity flags */}
          {recipe.sensitivity_flags.length > 0 && (
            <div className={styles.sensitivitySection}>
              <div className={styles.sectionLabel}>Contains</div>
              <div className={styles.flagList}>
                {recipe.sensitivity_flags.map((f) => (
                  <span key={f} className={styles.flagChip}>{f}</span>
                ))}
              </div>
            </div>
          )}

          {recipe.description && (
            <p className={styles.description}>{recipe.description}</p>
          )}

          <div className={styles.modalCols}>
            {/* Ingredients */}
            <div>
              <div className={styles.sectionLabel}>Ingredients</div>
              <div className={styles.ingredientGrid}>
                {(recipe.ingredients ?? []).map((ing, i) => (
                  <div key={i} className={styles.ingredientRow}>
                    <span className={styles.ingredientAmt}>{ing.amount} {ing.unit}</span>
                    <span className={styles.ingredientName}>{ing.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Macros */}
            {macros && (
              <div>
                <div className={styles.sectionLabel}>Nutrition</div>
                <MacroBar macros={macros} />
              </div>
            )}
          </div>

          {/* Instructions */}
          {recipe.instructions && (
            <div>
              <div className={styles.sectionLabel}>Instructions</div>
              <div className={styles.instructions}>
                {recipe.instructions.split('\n').filter(Boolean).map((step, i) => (
                  <p key={i} className={styles.instructionStep}>{step}</p>
                ))}
              </div>
            </div>
          )}

          {/* Share section */}
          <div className={styles.shareSection}>
            <div className={styles.sectionLabel}>Share with Client</div>
            {shareStatus === 'sent' ? (
              <div className={styles.shareSuccess}>✓ Recipe shared successfully</div>
            ) : (
              <div className={styles.shareForm}>
                <select
                  className={styles.shareSelect}
                  value={shareClientId}
                  onChange={(e) => setShareClientId(e.target.value)}
                >
                  <option value="">Select a client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
                <textarea
                  className={styles.shareNote}
                  placeholder="Add a personal note (optional)…"
                  value={shareNote}
                  onChange={(e) => setShareNote(e.target.value)}
                  rows={2}
                />
                <button
                  className={styles.shareBtn}
                  onClick={handleShare}
                  disabled={!shareClientId || shareStatus === 'sending'}
                >
                  {shareStatus === 'sending' ? 'Sending…' : shareStatus === 'error' ? 'Error — retry' : '✉ Send Recipe'}
                </button>
              </div>
            )}
          </div>

          {/* Community ratings */}
          {recipeRatings.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>Client Feedback ({recipeRatings.length})</div>
              <div className={styles.ratingList}>
                {recipeRatings.map((r, i) => (
                  <div key={i} className={styles.ratingRow}>
                    <span className={styles.ratingStars}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                    {r.comment && <span className={styles.ratingComment}>{r.comment}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI Generator Modal ───────────────────────────────────────

interface GeneratorModalProps {
  clients: ClientOption[];
  onClose: () => void;
  onSaved: (recipe: RecipeRow) => void;
}

function AIGeneratorModal({ clients, onClose, onSaved }: GeneratorModalProps) {
  const [clientId, setClientId] = useState('');
  const [lifestyle, setLifestyle] = useState('anti-inflammatory');
  const [season, setSeason] = useState(getCurrentSeason());
  const [requests, setRequests] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(RecipeRow & { why_this_recipe?: string; therapeutic_note?: string }) | null>(null);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/mealplans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          dietaryLifestyle: lifestyle,
          specialRequests: requests,
          season,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setResult(data as RecipeRow & { why_this_recipe?: string; therapeutic_note?: string });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-label="Generate AI Recipe">
        <div className={styles.modalBody}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>✦ Generate AI Recipe</h2>
            <button className={styles.modalCloseInner} onClick={onClose}>✕</button>
          </div>

          {!result ? (
            <div className={styles.generatorForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Personalize for Client</label>
                <select
                  className={styles.shareSelect}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">General (no client context)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Dietary Lifestyle</label>
                <div className={styles.lifestylePills}>
                  {LIFESTYLE_FILTERS.filter((l) => l.id !== 'all').map((l) => (
                    <button
                      key={l.id}
                      className={`${styles.pill} ${lifestyle === l.id ? styles.pillActive : ''}`}
                      onClick={() => setLifestyle(l.id)}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Season</label>
                <div className={styles.lifestylePills}>
                  {SEASONS.filter((s) => s.id !== 'all').map((s) => (
                    <button
                      key={s.id}
                      className={`${styles.pill} ${season === s.id ? styles.pillActive : ''}`}
                      onClick={() => setSeason(s.id)}
                    >
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Special Requests</label>
                <textarea
                  className={styles.shareNote}
                  placeholder="e.g. high boron, easy to digest, warming, under 30 min…"
                  value={requests}
                  onChange={(e) => setRequests(e.target.value)}
                  rows={3}
                />
              </div>

              {error && <div className={styles.genError}>{error}</div>}

              <button
                className={`${styles.generateBtn} ${loading ? styles.generateBtnLoading : ''}`}
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner} />
                    Generating therapeutic recipe…
                  </>
                ) : (
                  'Generate ✦'
                )}
              </button>
            </div>
          ) : (
            <div className={styles.generatedResult}>
              <div
                className={styles.generatedHero}
                style={{
                  backgroundImage: result.image_url?.startsWith('linear-gradient')
                    ? result.image_url
                    : result.image_url
                    ? `url(${result.image_url})`
                    : 'linear-gradient(135deg, #F5E0CC 0%, #DFA878 100%)',
                }}
              />
              <h3 className={styles.generatedTitle}>{result.title}</h3>

              {result.why_this_recipe && (
                <div className={styles.therapeuticNote}>
                  <div className={styles.therapeuticNoteLabel}>✦ Therapeutic Rationale</div>
                  <p>{result.why_this_recipe}</p>
                </div>
              )}

              <p className={styles.description}>{result.description}</p>

              <div className={styles.metaRow}>
                {result.prep_time_minutes && <span>⏱ {result.prep_time_minutes} min</span>}
                {result.servings && <span>· {result.servings} servings</span>}
              </div>

              {result.macros && <MacroBar macros={result.macros as Macros} />}

              <div className={styles.generatedActions}>
                {result.id && (
                  <button className={styles.saveLibraryBtn} onClick={() => { onSaved(result as RecipeRow); onClose(); }}>
                    ✓ Saved to Library
                  </button>
                )}
                <button className={styles.generateAgainBtn} onClick={() => setResult(null)}>
                  ← Generate Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Recipe Card ──────────────────────────────────────────────

interface CardProps {
  recipe: RecipeRow;
  avgRating: number | null;
  clients: ClientOption[];
  onOpen: () => void;
}

function RecipeCard({ recipe, avgRating, clients, onOpen }: CardProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [shareClientId, setShareClientId] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [shareStatus, setShareStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function handleQuickShare(e: React.MouseEvent) {
    e.stopPropagation();
    if (!shareClientId) { setShareOpen(true); return; }
    setShareStatus('sending');
    try {
      await fetch('/api/mealplans/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: shareClientId, recipeId: recipe.id, note: shareNote }),
      });
      setShareStatus('sent');
      setTimeout(() => { setShareOpen(false); setShareStatus('idle'); }, 2000);
    } catch {
      setShareStatus('idle');
    }
  }

  const seasonEmoji = recipe.seasons.includes('summer') ? '☀️' :
    recipe.seasons.includes('spring') ? '🌸' :
    recipe.seasons.includes('fall') ? '🍂' :
    recipe.seasons.includes('winter') ? '❄️' : '';

  return (
    <div className={styles.card} onClick={onOpen}>
      {/* Photo */}
      <div
        className={styles.cardPhoto}
        style={{
          backgroundImage: recipe.image_url?.startsWith('linear-gradient')
            ? recipe.image_url
            : recipe.image_url
            ? `url(${recipe.image_url})`
            : 'linear-gradient(135deg, #F5E0CC 0%, #DFA878 100%)',
        }}
      >
        {recipe.is_ai_generated && <span className={styles.aiBadge}>✦ AI</span>}
        {seasonEmoji && <span className={styles.seasonBadge}>{seasonEmoji}</span>}
      </div>

      {/* Tags */}
      <div className={styles.cardTagRow}>
        {recipe.dietary_tags.slice(0, 2).map((t) => (
          <span key={t} className={styles.tag}>{t}</span>
        ))}
      </div>

      <h3 className={styles.cardTitle}>{recipe.title}</h3>
      {recipe.description && (
        <p className={styles.cardDescription}>{recipe.description}</p>
      )}

      <div className={styles.cardMeta}>
        {recipe.prep_time_minutes && <span>⏱ {recipe.prep_time_minutes}m</span>}
        {recipe.servings && <span>· {recipe.servings} servings</span>}
        {avgRating !== null && <span>· ⭐ {avgRating}</span>}
      </div>

      {/* Macro pills */}
      {recipe.macros && (
        <div className={styles.macroPills}>
          <span className={styles.macroPillP}>P {(recipe.macros as Macros).protein_g}g</span>
          <span className={styles.macroPillC}>C {(recipe.macros as Macros).carbs_g}g</span>
          <span className={styles.macroPillF}>F {(recipe.macros as Macros).fat_g}g</span>
        </div>
      )}

      {/* Share button */}
      <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
        {shareOpen ? (
          <div className={styles.quickShare}>
            <select
              className={styles.quickShareSelect}
              value={shareClientId}
              onChange={(e) => setShareClientId(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">Client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
            <button
              className={styles.quickShareBtn}
              onClick={handleQuickShare}
              disabled={!shareClientId || shareStatus === 'sending'}
            >
              {shareStatus === 'sent' ? '✓' : shareStatus === 'sending' ? '…' : 'Send'}
            </button>
            <button className={styles.quickShareCancel} onClick={() => setShareOpen(false)}>✕</button>
          </div>
        ) : (
          <button className={styles.shareIconBtn} onClick={(e) => { e.stopPropagation(); setShareOpen(true); }}>
            ✉ Share
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Browser Component ───────────────────────────────────

interface Props {
  recipes: RecipeRow[];
  clients: ClientOption[];
  ratings: RatingRow[];
  practitionerId: string;
}

export default function MealPlanBrowser({ recipes: initialRecipes, clients, ratings, practitionerId }: Props) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [search, setSearch] = useState('');
  const [lifestyle, setLifestyle] = useState('all');
  const [season, setSeason] = useState('all');
  const [inSeasonOnly, setInSeasonOnly] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeRow | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);

  const currentSeason = getCurrentSeason();
  const activeSeason = inSeasonOnly ? currentSeason : season;

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const inTitle = r.title.toLowerCase().includes(q);
        const inIngredients = (r.ingredients ?? []).some((i) => i.name.toLowerCase().includes(q));
        if (!inTitle && !inIngredients) return false;
      }
      if (lifestyle !== 'all') {
        if (!r.dietary_tags.some((t) => t.toLowerCase().includes(lifestyle.toLowerCase()))) return false;
      }
      if (activeSeason !== 'all') {
        if (!r.seasons.includes(activeSeason)) return false;
      }
      return true;
    });
  }, [recipes, search, lifestyle, activeSeason]);

  function handleSaved(recipe: RecipeRow) {
    setRecipes((prev) => {
      if (prev.some((r) => r.id === recipe.id)) return prev;
      return [recipe, ...prev];
    });
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>AI Meal Plans</h1>
          <p className={styles.pageSubtitle}>{recipes.length} recipes · {filtered.length} showing</p>
        </div>
        <button className={styles.generateBtn} onClick={() => setShowGenerator(true)}>
          ✦ Generate AI Recipe
        </button>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search recipes or ingredients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.filterGroup}>
          <div className={styles.pillRow}>
            {LIFESTYLE_FILTERS.map((f) => (
              <button
                key={f.id}
                className={`${styles.filterPill} ${lifestyle === f.id ? styles.filterPillActive : ''}`}
                onClick={() => setLifestyle(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.pillRow}>
            {SEASONS.map((s) => (
              <button
                key={s.id}
                className={`${styles.filterPill} ${!inSeasonOnly && season === s.id ? styles.filterPillActive : ''}`}
                onClick={() => { setSeason(s.id); setInSeasonOnly(false); }}
              >
                {s.emoji} {s.label}
              </button>
            ))}
            <button
              className={`${styles.filterPill} ${inSeasonOnly ? styles.filterPillActive : ''}`}
              onClick={() => setInSeasonOnly((p) => !p)}
            >
              🌿 In Season Now
            </button>
          </div>
        </div>
      </div>

      {/* Recipe grid */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyGlyph}>✿</span>
          <p>No recipes match your filters. Try adjusting the search or lifestyle.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              avgRating={averageRating(ratings, recipe.id)}
              clients={clients}
              onOpen={() => setSelectedRecipe(recipe)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          ratings={ratings}
          clients={clients}
          onClose={() => setSelectedRecipe(null)}
        />
      )}

      {/* AI Generator modal */}
      {showGenerator && (
        <AIGeneratorModal
          clients={clients}
          onClose={() => setShowGenerator(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
