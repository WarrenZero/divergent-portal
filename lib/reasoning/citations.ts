/**
 * NTA/HTMA foundational reference knowledge base.
 * Used to ground Clinical Reasoning Assistant responses in verifiable sources.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ClinicalReference {
  id: string;
  authors: string;
  title: string;
  publisher: string;
  year: number;
  topics: string[];
}

// ─── Core reference library ──────────────────────────────────────────────────

export const CORE_REFERENCES = {
  htma: [
    {
      id: 'eck-watts-1989',
      authors: 'Paul C. Eck & David L. Watts',
      title: 'Nutritional Balancing and Hair Tissue Mineral Analysis',
      publisher: 'Eck Institute of Applied Nutrition and Bioenergetics',
      year: 1989,
      topics: [
        'htma',
        'mineral ratios',
        'oxidation rate',
        'calcium',
        'magnesium',
        'sodium',
        'potassium',
      ],
    },
    {
      id: 'watts-1995',
      authors: 'David L. Watts',
      title: 'HTMA: A Status Report',
      publisher: 'Trace Elements Inc.',
      year: 1995,
      topics: ['htma interpretation', 'mineral patterns', 'metabolic types'],
    },
    {
      id: 'wilson-2010',
      authors: 'Lawrence Wilson, MD',
      title: 'Nutritional Balancing Science',
      publisher: 'LD Wilson Consultants',
      year: 2010,
      topics: ['mineral balancing', 'adrenal function', 'oxidation'],
    },
  ] satisfies ClinicalReference[],

  nta: [
    {
      id: 'nta-foundations',
      authors: 'Nutritional Therapy Association',
      title: 'Foundations of Nutritional Therapy',
      publisher: 'NTA',
      year: 2023,
      topics: [
        'nta hierarchy',
        'digestion',
        'blood sugar',
        'fatty acids',
        'minerals',
        'vitamins',
        'protein',
        'foundational nutrition',
      ],
    },
  ] satisfies ClinicalReference[],

  nutrition: [
    {
      id: 'fallon-2001',
      authors: 'Sally Fallon & Mary Enig',
      title: 'Nourishing Traditions',
      publisher: 'New Trends Publishing',
      year: 2001,
      topics: [
        'ancestral nutrition',
        'traditional fats',
        'fermentation',
        'mineral-rich foods',
      ],
    },
    {
      id: 'price-1939',
      authors: 'Weston A. Price, DDS',
      title: 'Nutrition and Physical Degeneration',
      publisher: 'Price-Pottenger Foundation',
      year: 1939,
      topics: ['ancestral diet', 'fat-soluble vitamins', 'mineral absorption'],
    },
    {
      id: 'williams-1956',
      authors: 'Roger J. Williams, PhD',
      title: 'Biochemical Individuality',
      publisher: 'University of Texas Press',
      year: 1956,
      topics: ['individual variation', 'nutritional needs', 'enzyme activity'],
    },
  ] satisfies ClinicalReference[],

  minerals: [
    {
      id: 'dean-2017',
      authors: 'Carolyn Dean, MD, ND',
      title: 'The Magnesium Miracle',
      publisher: 'Ballantine Books',
      year: 2017,
      topics: [
        'magnesium',
        'muscle function',
        'nervous system',
        'sleep',
        'anxiety',
      ],
    },
    {
      id: 'nielsen-boron',
      authors: 'Forrest H. Nielsen',
      title: 'Boron in Human and Animal Nutrition',
      publisher: 'USDA Human Nutrition Research',
      year: 2014,
      topics: [
        'boron',
        'nervous system',
        'calcium metabolism',
        'brain function',
        'gaba',
      ],
    },
  ] satisfies ClinicalReference[],
} as const;

// ─── All references flat list ────────────────────────────────────────────────

export const ALL_REFERENCES: ClinicalReference[] = [
  ...CORE_REFERENCES.htma,
  ...CORE_REFERENCES.nta,
  ...CORE_REFERENCES.nutrition,
  ...CORE_REFERENCES.minerals,
];

// ─── Topic matching ──────────────────────────────────────────────────────────

/**
 * Returns references whose topics overlap with the provided topic keywords.
 * Case-insensitive substring match.
 */
export function getRelevantReferences(topics: string[]): ClinicalReference[] {
  return ALL_REFERENCES.filter((ref) =>
    topics.some((topic) =>
      ref.topics.some((t) =>
        t.toLowerCase().includes(topic.toLowerCase()) ||
        topic.toLowerCase().includes(t.toLowerCase()),
      ),
    ),
  );
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/**
 * Format a reference as a numbered citation string.
 * [1] Author(s). "Title." Publisher, Year.
 */
export function formatCitation(ref: ClinicalReference, number: number): string {
  return `[${number}] ${ref.authors}. "${ref.title}." ${ref.publisher}, ${ref.year}.`;
}

/**
 * Format all core references as a compact list for injection into the system prompt.
 */
export function formatReferencesForPrompt(): string {
  return ALL_REFERENCES.map(
    (ref) =>
      `- id:${ref.id} | ${ref.authors} (${ref.year}). "${ref.title}." Topics: ${ref.topics.join(', ')}`,
  ).join('\n');
}

// ─── Clinical keyword detection ──────────────────────────────────────────────

const CLINICAL_KEYWORDS = new Set([
  // Minerals
  'magnesium', 'calcium', 'zinc', 'copper', 'sodium', 'potassium', 'boron',
  'selenium', 'chromium', 'iron', 'manganese', 'iodine', 'phosphorus',
  // Mineral ratios
  'ca/mg', 'na/k', 'zn/cu', 'zn/cd', 'mineral ratio',
  // HTMA
  'htma', 'hair tissue', 'oxidation rate', 'metabolic type', 'slow oxidizer', 'fast oxidizer',
  // Conditions
  'thyroid', 'adrenal', 'hashimoto', 'hypothyroid', 'hyperthyroid', 'pcos',
  'endometriosis', 'sibo', 'ibs', 'leaky gut', 'autoimmune', 'insulin',
  'glucose', 'inflammation', 'cortisol', 'dhea', 'testosterone', 'estrogen',
  'progesterone', 'lyme', 'mold', 'mycotoxin',
  // Lab markers
  'tsh', 'free t3', 'free t4', 'reverse t3', 'ferritin', 'crp', 'homocysteine',
  'mthfr', 'folate', 'b12', 'vitamin d', 'vitamin a', 'vitamin k',
  // Interventions
  'protocol', 'supplement', 'intervention', 'deficiency', 'toxicity',
  'omega', 'fish oil', 'probiotic', 'glutathione', 'nad+', 'coq10',
  // Research triggers
  'pubmed', 'research', 'study', 'studies', 'evidence', 'clinical trial',
  'randomized', 'peer-reviewed', 'meta-analysis',
  // NTA
  'nta hierarchy', 'digestion', 'blood sugar', 'fatty acid', 'foundational',
]);

/**
 * Returns true if the message contains clinical keywords that warrant a PubMed search.
 */
export function hasClinicalSearchTerms(message: string): boolean {
  const lower = message.toLowerCase();
  for (const keyword of CLINICAL_KEYWORDS) {
    if (lower.includes(keyword)) return true;
  }
  return false;
}

/**
 * Extract a concise search query from a user message for PubMed.
 * Takes up to 80 chars of content after stripping common filler phrases.
 */
export function extractSearchQuery(message: string): string {
  const cleaned = message
    .replace(/^(search pubmed for|find studies on|what does research say about|look up)/i, '')
    .trim();
  return cleaned.length > 100 ? cleaned.slice(0, 100) + '...' : cleaned;
}
