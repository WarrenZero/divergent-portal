// ─── NAQ Data — question definitions and scoring ─────────────

export const SCALE_LABELS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] as const;
export type ScaleLabel = (typeof SCALE_LABELS)[number];

export interface NAQQuestion {
  id: string;
  text: string;
  isBranch: boolean;
  branchTag?: string;
}

export interface NAQDomain {
  id: string;
  name: string;
  glyph: string;
  tagline: string;
  screening: NAQQuestion[];
  branches: NAQQuestion[];
  /** Show branch questions if ANY screening response ≥ this value (0–4 scale) */
  branchThreshold: number;
}

export interface NAQDomainScore {
  domainId: string;
  name: string;
  glyph: string;
  /** 0–100: percentage of max possible burden. Higher = more symptoms. */
  burden: number;
  /** 100 – burden. Used as the wellness contribution. */
  score: number;
}

// ─── Shared scoring (used by both client display and server action) ───

export function calculateScores(
  responses: Record<string, number>,
): { wellnessScore: number; domainScores: NAQDomainScore[] } {
  const domainScores: NAQDomainScore[] = NAQ_DOMAINS.map((domain) => {
    const allQs = [...domain.screening, ...domain.branches];
    const answered = allQs.filter((q) => responses[q.id] !== undefined);
    if (answered.length === 0) {
      return { domainId: domain.id, name: domain.name, glyph: domain.glyph, burden: 0, score: 100 };
    }
    const raw = answered.reduce((sum, q) => sum + (responses[q.id] ?? 0), 0);
    const max = answered.length * 4;
    const burden = Math.round((raw / max) * 100);
    return { domainId: domain.id, name: domain.name, glyph: domain.glyph, burden, score: 100 - burden };
  });

  const wellnessScore = Math.round(
    domainScores.reduce((sum, d) => sum + d.score, 0) / domainScores.length,
  );

  return { wellnessScore, domainScores };
}

// ─── Domain + question definitions ───────────────────────────

export const NAQ_DOMAINS: NAQDomain[] = [
  {
    id: 'gi',
    name: 'GI / Digestion',
    glyph: '🌀',
    tagline: 'Digestive function, stomach acid, enzyme production, and gut health',
    branchThreshold: 3,
    screening: [
      {
        id: 'gi_s1',
        text: 'Do you experience bloating, gas, or discomfort within 2 hours of eating?',
        isBranch: false,
      },
      {
        id: 'gi_s2',
        text: "Do you feel full long after eating, or like food 'sits heavy' in your stomach?",
        isBranch: false,
      },
    ],
    branches: [
      {
        id: 'gi_b1',
        text: 'Do you belch or have acid reflux within 30–60 minutes of eating?',
        isBranch: true,
        branchTag: 'HCl Insufficiency',
      },
      {
        id: 'gi_b2',
        text: 'Is your stool often light-colored, greasy, or difficult to flush?',
        isBranch: true,
        branchTag: 'Fat Malabsorption / Bile',
      },
      {
        id: 'gi_b3',
        text: 'Do you notice undigested food in your stool?',
        isBranch: true,
        branchTag: 'Enzyme Insufficiency',
      },
      {
        id: 'gi_b4',
        text: 'Do you experience constipation (fewer than one bowel movement per day)?',
        isBranch: true,
        branchTag: 'Motility / Microbiome',
      },
      {
        id: 'gi_b5',
        text: 'Have you taken antibiotics more than once in the last 5 years?',
        isBranch: true,
        branchTag: 'Dysbiosis / Gut Lining',
      },
    ],
  },
  {
    id: 'blood_sugar',
    name: 'Blood Sugar',
    glyph: '🩸',
    tagline: 'Glycemic regulation, insulin sensitivity, and energy stability',
    branchThreshold: 3,
    screening: [
      {
        id: 'bs_s1',
        text: 'Do you feel shaky, irritable, or mentally foggy if you miss a meal?',
        isBranch: false,
      },
      {
        id: 'bs_s2',
        text: 'Do you experience energy crashes or cravings 1–2 hours after eating?',
        isBranch: false,
      },
    ],
    branches: [
      {
        id: 'bs_b1',
        text: 'Do you crave sweets, bread, or caffeine in the afternoon?',
        isBranch: true,
        branchTag: 'Glycemic Instability',
      },
      {
        id: 'bs_b2',
        text: 'Do you wake between 2–4am and have trouble falling back asleep?',
        isBranch: true,
        branchTag: 'Cortisol-Glucose Connection',
      },
      {
        id: 'bs_b3',
        text: 'Do you feel better after eating but worse again 90 minutes later?',
        isBranch: true,
        branchTag: 'Reactive Hypoglycemia',
      },
    ],
  },
  {
    id: 'adrenal',
    name: 'Adrenal / Stress',
    glyph: '⚡',
    tagline: 'HPA axis function, cortisol rhythm, and stress response capacity',
    branchThreshold: 3,
    screening: [
      {
        id: 'ad_s1',
        text: "Do you feel 'tired but wired' — exhausted but unable to wind down?",
        isBranch: false,
      },
      {
        id: 'ad_s2',
        text: 'Do you feel most alert late at night rather than in the morning?',
        isBranch: false,
      },
    ],
    branches: [
      {
        id: 'ad_b1',
        text: 'Do you feel dizzy or lightheaded when standing up quickly?',
        isBranch: true,
        branchTag: 'Cortisol Stage Assessment',
      },
      {
        id: 'ad_b2',
        text: 'Do you rely on caffeine or sugar to function in the morning?',
        isBranch: true,
        branchTag: 'Morning Cortisol Pattern',
      },
      {
        id: 'ad_b3',
        text: 'Do you feel disproportionately reactive or emotional under stress?',
        isBranch: true,
        branchTag: 'HPA Dysregulation',
      },
      {
        id: 'ad_b4',
        text: 'Do you get frequent colds, infections, or heal more slowly than expected?',
        isBranch: true,
        branchTag: 'Immune-Adrenal Correlation',
      },
    ],
  },
  {
    id: 'fatty_acids',
    name: 'Fatty Acids',
    glyph: '🐟',
    tagline: 'Essential fatty acid status, cellular membrane integrity, and inflammation',
    branchThreshold: 3,
    screening: [
      {
        id: 'fa_s1',
        text: 'Is your skin dry, flaky, or does it crack easily?',
        isBranch: false,
      },
      {
        id: 'fa_s2',
        text: 'Do you have difficulty concentrating, brain fog, or poor memory?',
        isBranch: false,
      },
    ],
    branches: [
      {
        id: 'fa_b1',
        text: 'Do you have small bumps on the back of your arms (keratosis pilaris)?',
        isBranch: true,
        branchTag: 'Essential FA Deficiency',
      },
      {
        id: 'fa_b2',
        text: 'Is your hair brittle, thinning, or slow to grow?',
        isBranch: true,
        branchTag: 'Omega-3 / Biotin Status',
      },
    ],
  },
  {
    id: 'minerals',
    name: 'Minerals / Hydration',
    glyph: '💧',
    tagline: 'Electrolyte balance, magnesium status, and cellular hydration',
    branchThreshold: 3,
    screening: [
      {
        id: 'mi_s1',
        text: 'Do you experience muscle cramps, twitches, or restless legs?',
        isBranch: false,
      },
      {
        id: 'mi_s2',
        text: 'Do you feel thirsty frequently or is your urine consistently dark?',
        isBranch: false,
      },
    ],
    branches: [
      {
        id: 'mi_b1',
        text: 'Do you crave salt or salty foods?',
        isBranch: true,
        branchTag: 'Electrolyte / Adrenal Branch',
      },
      {
        id: 'mi_b2',
        text: 'Do you have difficulty sleeping through the night or grind your teeth?',
        isBranch: true,
        branchTag: 'Magnesium Deficiency',
      },
    ],
  },
  {
    id: 'liver',
    name: 'Liver / Detox',
    glyph: '🍃',
    tagline: 'Phase I/II detoxification pathways, bile flow, and hepatic burden',
    branchThreshold: 3,
    screening: [
      {
        id: 'lv_s1',
        text: 'Do you wake between 1–3am, have trouble falling asleep, or feel wired at night?',
        isBranch: false,
      },
      {
        id: 'lv_s2',
        text: 'Do you have skin issues (acne, rashes, eczema) or sensitivities to chemicals or perfumes?',
        isBranch: false,
      },
    ],
    branches: [
      {
        id: 'lv_b1',
        text: 'Do you feel nauseous after eating fatty or rich foods?',
        isBranch: true,
        branchTag: 'Bile Flow / Liver Branch',
      },
      {
        id: 'lv_b2',
        text: 'Do you have a history of significant alcohol, medication, or toxin exposure?',
        isBranch: true,
        branchTag: 'Detox Pathway Load',
      },
    ],
  },
  {
    id: 'immune',
    name: 'Immune / Lymph',
    glyph: '🛡',
    tagline: 'Immune resilience, lymphatic circulation, and inflammatory burden',
    branchThreshold: 3,
    screening: [
      {
        id: 'im_s1',
        text: 'Do you get sick (colds, infections) more than 2–3 times per year?',
        isBranch: false,
      },
      {
        id: 'im_s2',
        text: 'Do you have allergies, hay fever, or food sensitivities?',
        isBranch: false,
      },
    ],
    branches: [
      {
        id: 'im_b1',
        text: 'Do you have swollen lymph nodes or frequent throat or sinus issues?',
        isBranch: true,
        branchTag: 'Lymphatic Burden',
      },
      {
        id: 'im_b2',
        text: 'Do you have any diagnosed autoimmune conditions or a family history of them?',
        isBranch: true,
        branchTag: 'Autoimmune Branch',
      },
    ],
  },
  {
    id: 'sleep',
    name: 'Sleep / Recovery',
    glyph: '😴',
    tagline: 'Sleep architecture, circadian rhythm alignment, and cellular repair',
    branchThreshold: 3,
    screening: [
      {
        id: 'sl_s1',
        text: 'Do you feel unrested or unrefreshed when you wake up in the morning?',
        isBranch: false,
      },
      {
        id: 'sl_s2',
        text: 'Do you regularly get fewer than 7 hours of uninterrupted sleep?',
        isBranch: false,
      },
    ],
    branches: [
      {
        id: 'sl_b1',
        text: 'Do you have trouble falling asleep, or wake up and cannot fall back asleep?',
        isBranch: true,
        branchTag: 'Sleep Architecture',
      },
      {
        id: 'sl_b2',
        text: 'Do you snore, stop breathing, or feel unrefreshed regardless of hours slept?',
        isBranch: true,
        branchTag: 'Sleep Apnea Screening',
      },
      {
        id: 'sl_b3',
        text: 'Do you use screens, alcohol, or food within one hour of going to bed?',
        isBranch: true,
        branchTag: 'Sleep Hygiene',
      },
    ],
  },
  {
    id: 'cardiovascular',
    name: 'Cardiovascular',
    glyph: '❤️',
    tagline: 'Heart rhythm, vascular integrity, and circulatory function',
    branchThreshold: 3,
    screening: [
      {
        id: 'cv_s1',
        text: 'Do you experience heart palpitations, skipped beats, or a racing heart?',
        isBranch: false,
      },
      {
        id: 'cv_s2',
        text: 'Do you have high blood pressure or a family history of heart disease?',
        isBranch: false,
      },
    ],
    branches: [
      {
        id: 'cv_b1',
        text: 'Do you experience shortness of breath with mild exertion?',
        isBranch: true,
        branchTag: 'Cardiovascular Function',
      },
      {
        id: 'cv_b2',
        text: 'Do you have cold hands and feet, or poor circulation?',
        isBranch: true,
        branchTag: 'Peripheral Circulation',
      },
    ],
  },
  {
    id: 'hormonal',
    name: 'Hormonal',
    glyph: '🌙',
    tagline: 'Sex hormone balance, thyroid function, and endocrine regulation',
    branchThreshold: 3,
    screening: [
      {
        id: 'ho_s1',
        text: 'Do you experience significant PMS, irregular cycles, or hormonal mood swings?',
        isBranch: false,
      },
      {
        id: 'ho_s2',
        text: 'Have you noticed changes in libido, weight distribution, or body temperature regulation?',
        isBranch: false,
      },
    ],
    branches: [
      {
        id: 'ho_b1',
        text: 'Do you have significant breast tenderness, bloating, or mood shifts before your period?',
        isBranch: true,
        branchTag: 'Estrogen Dominance Branch',
      },
      {
        id: 'ho_b2',
        text: 'Do you experience hot flashes, night sweats, or vaginal dryness?',
        isBranch: true,
        branchTag: 'Perimenopause / Estrogen Drop',
      },
      {
        id: 'ho_b3',
        text: 'Do you have difficulty losing weight even with consistent dietary changes?',
        isBranch: true,
        branchTag: 'Thyroid / Metabolic Branch',
      },
    ],
  },
];
