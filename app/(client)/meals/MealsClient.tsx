'use client';

import { useState, useMemo } from 'react';
import MacroBar, { type Macros } from '@/components/shared/MacroBar';
import { getNAQWarnings } from '@/lib/naqWarnings';
import type { NAQDomainScore } from '@/app/(client)/naq/data';
import type { RecipeRow, SharedRecipe, RatingRow } from './page';
import styles from './MealsClient.module.css';

// ─── Therapeutic profile labels ───────────────────────────────

function getTherapeuticLabels(recipe: RecipeRow): string[] {
  const labels: string[] = [];
  const tags = recipe.dietary_tags.map((t) => t.toLowerCase());
  const ingredients = (recipe.ingredients ?? []).map((i) => i.name.toLowerCase());

  if (ingredients.some((i) => ['pumpkin seed', 'black bean', 'dark leafy', 'swiss chard', 'hemp seed'].some((k) => i.includes(k)))) {
    labels.push('High in magnesium');
  }
  if (ingredients.some((i) => ['broccoli', 'cauliflower', 'cabbage', 'brussel', 'kale', 'beet', 'garlic', 'watercress', 'radish', 'arugula'].some((k) => i.includes(k)))) {
    labels.push('Supports liver detox');
  }
  if (ingredients.some((i) => ['bone broth', 'collagen', 'gelatin', 'marshmallow root'].some((k) => i.includes(k)))) {
    labels.push('Gut-healing');
  }
  if (tags.includes('anti-inflammatory') && !tags.some((t) => ['dessert', 'high sugar'].includes(t))) {
    labels.push('Anti-Candida');
  }
  if (!ingredients.some((i) => ['spinach', 'almond', 'chocolate', 'rhubarb'].some((k) => i.includes(k)))) {
    labels.push('Low oxalate');
  }
  if (tags.some((t) => t.includes('aip'))) {
    labels.push('AIP-safe');
  }
  if (tags.some((t) => t.includes('ens-protocol') || t.includes('ens protocol'))) {
    labels.push('ENS Protocol Phase 1 appropriate');
  }
  if (ingredients.some((i) => ['raisin', 'prune', 'avocado', 'chickpea', 'peach', 'pear', 'grape'].some((k) => i.includes(k)))) {
    labels.push('High boron');
  }
  return labels;
}

// ─── Constants ────────────────────────────────────────────────

const COMMON_SENSITIVITIES = [
  'Gluten', 'Dairy', 'Eggs', 'Soy', 'Corn', 'Tree Nuts', 'Peanuts',
  'Shellfish', 'Nightshades', 'Refined Sugar', 'Caffeine', 'Alcohol',
];

const SEASON_LABELS: Record<string, string> = {
  spring: '🌸 Spring',
  summer: '☀️ Summer',
  fall: '🍂 Fall',
  winter: '❄️ Winter',
};

function averageRating(ratings: RatingRow[], recipeId: string) {
  const r = ratings.filter((x) => x.recipe_id === recipeId);
  if (!r.length) return null;
  return Math.round((r.reduce((s, x) => s + x.stars, 0) / r.length) * 10) / 10;
}

function StarRating({
  value,
  onRate,
  readonly,
}: {
  value: number;
  onRate?: (stars: number) => void;
  readonly?: boolean;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className={styles.stars} onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          className={`${styles.star} ${(hovered || value) >= s ? styles.starFilled : ''}`}
          onClick={() => !readonly && onRate?.(s)}
          onMouseEnter={() => !readonly && setHovered(s)}
          disabled={readonly}
          aria-label={`${s} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ─── Recipe Detail Modal (client version) ────────────────────

interface DetailProps {
  recipe: RecipeRow;
  clientId: string;
  savedIds: string[];
  myRating: { stars: number; comment: string | null } | null;
  allRatings: RatingRow[];
  domainScores: NAQDomainScore[];
  clientSensitivityNames: string[];
  onClose: () => void;
  onSaveToggle: (id: string, newSaved: boolean) => void;
  onRated: (id: string, stars: number, comment: string) => void;
}

function RecipeDetailModal({
  recipe,
  clientId,
  savedIds,
  myRating,
  allRatings,
  domainScores,
  clientSensitivityNames,
  onClose,
  onSaveToggle,
  onRated,
}: DetailProps) {
  const isSaved = savedIds.includes(recipe.id);
  const [rating, setRating] = useState(myRating?.stars ?? 0);
  const [comment, setComment] = useState(myRating?.comment ?? '');
  const [ratingStatus, setRatingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saving, setSaving] = useState(false);

  const macros = recipe.macros as Macros | null;
  const rawWarnings = getNAQWarnings(domainScores, recipe.sensitivity_flags);
  const naqWarnings = rawWarnings.filter(
    (w, i, arr) => arr.findIndex((x) => x.message === w.message) === i,
  ).slice(0, 1);
  const personalWarnings = recipe.sensitivity_flags.filter((f) =>
    clientSensitivityNames.some((s) => s.toLowerCase() === f.toLowerCase()),
  );

  const otherRatings = allRatings.filter(
    (r) => r.recipe_id === recipe.id && r.client_id !== clientId,
  );
  const avgRating = averageRating(allRatings, recipe.id);

  async function handleSaveToggle() {
    setSaving(true);
    try {
      const res = await fetch('/api/mealplans/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe.id }),
      });
      const data = await res.json();
      onSaveToggle(recipe.id, data.saved);
    } catch {}
    setSaving(false);
  }

  async function handleRate(stars: number) {
    setRating(stars);
    setRatingStatus('saving');
    try {
      await fetch('/api/mealplans/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe.id, stars, comment }),
      });
      onRated(recipe.id, stars, comment);
      setRatingStatus('saved');
      setTimeout(() => setRatingStatus('idle'), 2000);
    } catch {
      setRatingStatus('idle');
    }
  }

  async function handleCommentBlur() {
    if (rating === 0 || !comment.trim()) return;
    setRatingStatus('saving');
    try {
      await fetch('/api/mealplans/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe.id, stars: rating, comment }),
      });
      onRated(recipe.id, rating, comment);
      setRatingStatus('saved');
      setTimeout(() => setRatingStatus('idle'), 2000);
    } catch {
      setRatingStatus('idle');
    }
  }

  function handleShare() {
    const text = `${recipe.title}\n\nIngredients:\n${(recipe.ingredients ?? []).map((i) => `• ${i.amount} ${i.unit} ${i.name}`).join('\n')}`;
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-label={recipe.title}>
        {/* Hero */}
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
          <button
            className={`${styles.saveBtn} ${isSaved ? styles.saveBtnActive : ''}`}
            onClick={(e) => { e.stopPropagation(); handleSaveToggle(); }}
            disabled={saving}
            aria-label={isSaved ? 'Unsave recipe' : 'Save recipe'}
          >
            {isSaved ? '♥' : '♡'}
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* NAQ warnings */}
          {naqWarnings.length > 0 && (
            <div className={styles.warningSection}>
              {naqWarnings.map((w, i) => (
                <div key={i} className={styles.warningChip}>
                  <span className={styles.warningIcon}>⚠</span>
                  <span>Contains <strong>{w.flag}</strong> — {w.message} based on your assessment</span>
                </div>
              ))}
            </div>
          )}

          {personalWarnings.length > 0 && (
            <div className={styles.personalWarning}>
              You&rsquo;ve noted sensitivity to: {personalWarnings.join(', ')}
            </div>
          )}

          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>{recipe.title}</h2>
            <div className={styles.modalMeta}>
              {recipe.prep_time_minutes && <span>⏱ {recipe.prep_time_minutes} min</span>}
              {recipe.servings && <span>· {recipe.servings} servings</span>}
              {avgRating !== null && <span>· ⭐ {avgRating} avg</span>}
            </div>
            <div className={styles.modalTags}>
              {recipe.dietary_tags.slice(0, 3).map((t) => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
            </div>
          </div>

          {/* Therapeutic profile */}
          {(() => {
            const tLabels = getTherapeuticLabels(recipe);
            return tLabels.length > 0 ? (
              <div style={{ marginBottom: 14 }}>
                <div className={styles.sectionLabel} style={{ fontSize: 9, letterSpacing: '0.12em' }}>
                  Therapeutic Profile
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {tLabels.map((label) => (
                    <span
                      key={label}
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'var(--copper-500)',
                        border: '1px solid var(--copper-400)',
                        borderRadius: 20,
                        padding: '2px 8px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {recipe.description && (
            <p className={styles.description}>{recipe.description}</p>
          )}

          <div className={styles.modalCols}>
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
            {macros && (
              <div>
                <div className={styles.sectionLabel}>Nutrition</div>
                <MacroBar macros={macros} />
              </div>
            )}
          </div>

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

          {/* Your rating */}
          <div className={styles.ratingSection}>
            <div className={styles.sectionLabel}>Your Rating</div>
            <StarRating value={rating} onRate={handleRate} />
            {rating > 0 && (
              <textarea
                className={styles.commentArea}
                placeholder="Add a comment (optional)…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onBlur={handleCommentBlur}
                rows={2}
              />
            )}
            {ratingStatus === 'saved' && (
              <span className={styles.ratingSaved}>✓ Rating saved</span>
            )}
          </div>

          {/* Community ratings */}
          {otherRatings.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>Community ({otherRatings.length})</div>
              <div className={styles.communityList}>
                {otherRatings.map((r, i) => (
                  <div key={i} className={styles.communityRow}>
                    <span className={styles.communityStars}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                    {r.comment && <span className={styles.communityComment}>{r.comment}</span>}
                    <span className={styles.communityAnon}>Another client</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Share */}
          <div className={styles.shareRow}>
            <button className={styles.clipboardBtn} onClick={handleShare}>
              📋 Copy Recipe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Recipe Card (client version) ────────────────────────────

interface ClientCardProps {
  recipe: RecipeRow;
  isSaved: boolean;
  myRating: { stars: number; comment: string | null } | null;
  avgRating: number | null;
  naqWarnings: ReturnType<typeof getNAQWarnings>;
  personalWarnings: string[];
  onOpen: () => void;
  onSaveToggle: (id: string, newSaved: boolean) => void;
}

function ClientRecipeCard({
  recipe,
  isSaved,
  myRating,
  avgRating,
  naqWarnings,
  personalWarnings,
  onOpen,
  onSaveToggle,
}: ClientCardProps) {
  const [saving, setSaving] = useState(false);
  const seasonEmoji = recipe.seasons[0] ? SEASON_LABELS[recipe.seasons[0]]?.split(' ')[0] : '';

  async function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    setSaving(true);
    try {
      const res = await fetch('/api/mealplans/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe.id }),
      });
      const data = await res.json();
      onSaveToggle(recipe.id, data.saved);
    } catch {}
    setSaving(false);
  }

  return (
    <div className={styles.card} onClick={onOpen}>
      {/* NAQ warning banner */}
      {naqWarnings.length > 0 && (
        <div className={styles.cardWarning}>
          ⚠ {naqWarnings[0].message} ({naqWarnings[0].flag})
        </div>
      )}
      {personalWarnings.length > 0 && naqWarnings.length === 0 && (
        <div className={styles.cardPersonalWarning}>
          Sensitivity: {personalWarnings.join(', ')}
        </div>
      )}

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
        {seasonEmoji && <span className={styles.seasonBadge}>{seasonEmoji}</span>}
        <button
          className={`${styles.cardSave} ${isSaved ? styles.cardSaveActive : ''}`}
          onClick={handleSave}
          disabled={saving}
          aria-label={isSaved ? 'Unsave' : 'Save'}
        >
          {isSaved ? '♥' : '♡'}
        </button>
      </div>

      <div className={styles.cardTagRow}>
        {recipe.dietary_tags.slice(0, 2).map((t) => (
          <span key={t} className={styles.tag}>{t}</span>
        ))}
      </div>

      <h3 className={styles.cardTitle}>{recipe.title}</h3>
      {recipe.description && (
        <p className={styles.cardDescription}>{recipe.description}</p>
      )}

      <div className={styles.cardBottom}>
        <div className={styles.cardMeta}>
          {recipe.prep_time_minutes && <span>⏱ {recipe.prep_time_minutes}m</span>}
          {avgRating !== null && <span>⭐ {avgRating}</span>}
        </div>
        {myRating && (
          <div className={styles.myRatingBadge}>
            Your rating: {'★'.repeat(myRating.stars)}
          </div>
        )}
      </div>
      <div className={styles.tapHint}>Tap to explore →</div>
    </div>
  );
}

// ─── Sensitivities Panel ──────────────────────────────────────

interface SensitivitiesProps {
  sensitivities: Array<{ id: string; name: string }>;
  clientId: string;
  onUpdate: (updated: Array<{ id: string; name: string }>) => void;
}

function SensitivitiesPanel({ sensitivities, clientId, onUpdate }: SensitivitiesProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAdd(name: string) {
    if (!name.trim() || sensitivities.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    setLoading(true);
    try {
      const res = await fetch('/api/client/sensitivities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, name: name.trim() }),
      });
      const data = await res.json();
      if (data.id) {
        onUpdate([...sensitivities, { id: data.id, name: name.trim() }]);
        setInput('');
      }
    } catch {}
    setLoading(false);
  }

  async function handleRemove(id: string) {
    try {
      await fetch(`/api/client/sensitivities?id=${id}`, { method: 'DELETE' });
      onUpdate(sensitivities.filter((s) => s.id !== id));
    } catch {}
  }

  return (
    <div className={styles.sensPanel}>
      <button
        className={styles.sensPanelToggle}
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
      >
        <span>My Sensitivities</span>
        {sensitivities.length > 0 && (
          <span className={styles.sensBadge}>{sensitivities.length}</span>
        )}
        <span className={styles.sensChevron}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={styles.sensPanelBody}>
          <p className={styles.sensNote}>
            These are used to warn you about recipes that may not align with your sensitivities.
          </p>

          <div className={styles.sensList}>
            {sensitivities.map((s) => (
              <span key={s.id} className={styles.sensChip}>
                {s.name}
                <button
                  className={styles.sensRemove}
                  onClick={() => handleRemove(s.id)}
                  aria-label={`Remove ${s.name}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          <div className={styles.sensAdd}>
            <input
              className={styles.sensInput}
              placeholder="Add a sensitivity…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd(input)}
            />
            <button
              className={styles.sensAddBtn}
              onClick={() => handleAdd(input)}
              disabled={loading || !input.trim()}
            >
              Add
            </button>
          </div>

          <div className={styles.sensSuggestions}>
            {COMMON_SENSITIVITIES.filter(
              (s) => !sensitivities.some((x) => x.name.toLowerCase() === s.toLowerCase()),
            ).map((s) => (
              <button key={s} className={styles.sensSuggestion} onClick={() => handleAdd(s)}>
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────

interface Props {
  clientId: string;
  clientSensitivities: Array<{ id: string; name: string }>;
  domainScores: NAQDomainScore[];
  sharedRecipes: SharedRecipe[];
  allRecipes: RecipeRow[];
  savedIds: string[];
  myRatings: Record<string, { stars: number; comment: string | null }>;
  allRatings: RatingRow[];
  currentSeason: string;
}

type Tab = 'for-you' | 'all' | 'saved';

export default function MealsClient({
  clientId,
  clientSensitivities: initSens,
  domainScores,
  sharedRecipes,
  allRecipes,
  savedIds: initSaved,
  myRatings: initRatings,
  allRatings,
  currentSeason,
}: Props) {
  const [tab, setTab] = useState<Tab>('for-you');
  const [sensitivities, setSensitivities] = useState(initSens);
  const [savedIds, setSavedIds] = useState<string[]>(initSaved);
  const [myRatings, setMyRatings] = useState(initRatings);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeRow | null>(null);
  const [ratePromptId, setRatePromptId] = useState<string | null>(null);

  const sensitivityNames = sensitivities.map((s) => s.name);

  function handleSaveToggle(id: string, newSaved: boolean) {
    setSavedIds((prev) => newSaved ? [...prev, id] : prev.filter((x) => x !== id));
  }

  function handleRated(id: string, stars: number, comment: string) {
    setMyRatings((prev) => ({ ...prev, [id]: { stars, comment } }));
  }

  // In-season recipes for the seasonal section
  const inSeasonRecipes = useMemo(
    () => allRecipes.filter((r) => r.seasons.includes(currentSeason)).slice(0, 6),
    [allRecipes, currentSeason],
  );

  // Tab-filtered recipes
  const displayRecipes = useMemo(() => {
    if (tab === 'saved') return allRecipes.filter((r) => savedIds.includes(r.id));
    if (tab === 'for-you') {
      const sharedIds = new Set(sharedRecipes.map((s) => s.recipe.id));
      return allRecipes.filter((r) => sharedIds.has(r.id) || r.seasons.includes(currentSeason));
    }
    return allRecipes;
  }, [tab, allRecipes, savedIds, sharedRecipes, currentSeason]);

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageGlyph}>✿</div>
        <div>
          <h1 className={styles.pageTitle}>Recipes & Meal Plans</h1>
          <p className={styles.pageSubtitle}>
            Curated therapeutic recipes aligned with your protocol
          </p>
        </div>
      </div>

      {/* Sensitivities panel */}
      <SensitivitiesPanel
        sensitivities={sensitivities}
        clientId={clientId}
        onUpdate={setSensitivities}
      />

      {/* From Your Practitioner */}
      {sharedRecipes.length > 0 && (
        <div className={styles.sharedSection}>
          <div className={styles.sharedLabel}>
            From Warren
            <span className={styles.sharedCount}>{sharedRecipes.length}</span>
          </div>
          <div className={styles.sharedRow}>
            {sharedRecipes.map((s) => (
              <div
                key={s.id}
                className={styles.sharedCard}
                onClick={() => setSelectedRecipe(s.recipe)}
              >
                <div
                  className={styles.sharedCardPhoto}
                  style={{
                    backgroundImage: s.recipe.image_url?.startsWith('linear-gradient')
                      ? s.recipe.image_url
                      : s.recipe.image_url
                      ? `url(${s.recipe.image_url})`
                      : 'linear-gradient(135deg, #F5E0CC 0%, #DFA878 100%)',
                  }}
                />
                <div className={styles.sharedCardBody}>
                  <div className={styles.sharedCardTitle}>{s.recipe.title}</div>
                  {s.note && (
                    <div className={styles.sharedCardNote}>&ldquo;{s.note}&rdquo;</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'for-you' ? styles.tabActive : ''}`}
          onClick={() => setTab('for-you')}
        >
          ✦ For You
        </button>
        <button
          className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`}
          onClick={() => setTab('all')}
        >
          All Recipes
        </button>
        <button
          className={`${styles.tab} ${tab === 'saved' ? styles.tabActive : ''}`}
          onClick={() => setTab('saved')}
        >
          Saved ♥ {savedIds.length > 0 ? `(${savedIds.length})` : ''}
        </button>
      </div>

      {/* In Season section (only on All tab) */}
      {tab === 'all' && inSeasonRecipes.length > 0 && (
        <div className={styles.inSeasonSection}>
          <div className={styles.inSeasonLabel}>
            {SEASON_LABELS[currentSeason]} In Season Now
          </div>
          <div className={styles.inSeasonRow}>
            {inSeasonRecipes.map((r) => {
              const rawNaqW = getNAQWarnings(domainScores, r.sensitivity_flags);
              const naqW = rawNaqW
                .filter((w, i, arr) => arr.findIndex((x) => x.message === w.message) === i)
                .slice(0, 1);
              const persW = r.sensitivity_flags.filter((f) =>
                sensitivityNames.some((s) => s.toLowerCase() === f.toLowerCase()),
              );
              return (
                <ClientRecipeCard
                  key={r.id}
                  recipe={r}
                  isSaved={savedIds.includes(r.id)}
                  myRating={myRatings[r.id] ?? null}
                  avgRating={averageRating(allRatings, r.id)}
                  naqWarnings={naqW}
                  personalWarnings={persW}
                  onOpen={() => setSelectedRecipe(r)}
                  onSaveToggle={handleSaveToggle}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Main recipe grid */}
      {displayRecipes.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyGlyph}>✿</span>
          {tab === 'saved'
            ? <p>No saved recipes yet. Tap ♡ on any recipe to save it.</p>
            : <p>No recipes here yet.</p>
          }
        </div>
      ) : (
        <div className={styles.grid}>
          {displayRecipes.map((r) => {
            const rawNaqW = getNAQWarnings(domainScores, r.sensitivity_flags);
            const naqW = rawNaqW
              .filter((w, i, arr) => arr.findIndex((x) => x.message === w.message) === i)
              .slice(0, 1);
            const persW = r.sensitivity_flags.filter((f) =>
              sensitivityNames.some((s) => s.toLowerCase() === f.toLowerCase()),
            );
            return (
              <div key={r.id}>
                <ClientRecipeCard
                  recipe={r}
                  isSaved={savedIds.includes(r.id)}
                  myRating={myRatings[r.id] ?? null}
                  avgRating={averageRating(allRatings, r.id)}
                  naqWarnings={naqW}
                  personalWarnings={persW}
                  onOpen={() => setSelectedRecipe(r)}
                  onSaveToggle={(id, newSaved) => {
                    handleSaveToggle(id, newSaved);
                    if (newSaved) setRatePromptId(id);
                    else if (ratePromptId === id) setRatePromptId(null);
                  }}
                />
                {ratePromptId === r.id && (
                  <div className={styles.ratePrompt}>
                    <span>Rate this recipe after you try it — it helps Warren personalize your meal plan</span>
                    <button
                      className={styles.ratePromptDismiss}
                      onClick={(e) => { e.stopPropagation(); setRatePromptId(null); }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          clientId={clientId}
          savedIds={savedIds}
          myRating={myRatings[selectedRecipe.id] ?? null}
          allRatings={allRatings}
          domainScores={domainScores}
          clientSensitivityNames={sensitivityNames}
          onClose={() => setSelectedRecipe(null)}
          onSaveToggle={handleSaveToggle}
          onRated={handleRated}
        />
      )}
    </div>
  );
}
