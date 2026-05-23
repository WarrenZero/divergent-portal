// ─── NAQ Sensitivity Warnings ────────────────────────────────────
// Maps NAQ domain burden scores to sensitivity flag warnings.
// Used on the client Meals page to show contextual warnings on recipes.

import type { NAQDomainScore } from '@/app/(client)/naq/data';

export interface NAQWarning {
  flag: string;
  message: string;
  domain: string;
}

interface DomainRule {
  domainId: string;
  domainName: string;
  thresholdPct: number;
  warnFlags: string[];
  message: string;
}

const DOMAIN_RULES: DomainRule[] = [
  {
    domainId: 'gi',
    domainName: 'GI / Digestion',
    thresholdPct: 40,
    warnFlags: ['gluten', 'dairy', 'nightshades', 'lectins', 'corn'],
    message: 'May challenge your digestive system',
  },
  {
    domainId: 'blood_sugar',
    domainName: 'Blood Sugar',
    thresholdPct: 40,
    warnFlags: ['sugar', 'high-glycemic', 'alcohol', 'fruit-juice'],
    message: 'May destabilize blood sugar regulation',
  },
  {
    domainId: 'adrenal',
    domainName: 'Adrenal / Stress',
    thresholdPct: 40,
    warnFlags: ['caffeine', 'sugar', 'alcohol'],
    message: 'May increase adrenal stress load',
  },
  {
    domainId: 'immune',
    domainName: 'Immune / Lymph',
    thresholdPct: 40,
    warnFlags: ['gluten', 'dairy', 'soy', 'corn', 'eggs'],
    message: 'May trigger immune reactivity',
  },
  {
    domainId: 'hormonal',
    domainName: 'Hormonal',
    thresholdPct: 40,
    warnFlags: ['soy', 'conventional-dairy', 'flaxseed-excess'],
    message: 'May affect hormone signaling',
  },
  {
    domainId: 'liver',
    domainName: 'Liver / Detox',
    thresholdPct: 40,
    warnFlags: ['alcohol', 'processed-fats'],
    message: 'May increase detoxification burden',
  },
  // Thyroid — triggered by high GI burden (proxy for overall ENS stress)
  {
    domainId: 'gi',
    domainName: 'Thyroid (via GI pattern)',
    thresholdPct: 50,
    warnFlags: ['goitrogens', 'raw-cruciferous'],
    message: 'May suppress thyroid function when eaten raw',
  },
];

// Domain priority for deduplication — lower number = higher clinical relevance.
// When a flag matches multiple domains, the highest-priority domain's message wins.
const DOMAIN_PRIORITY: Record<string, number> = {
  'Immune / Lymph':          0,
  'GI / Digestion':          1,
  'Hormonal':                2,
  'Adrenal / Stress':        3,
  'Liver / Detox':           4,
  'Blood Sugar':             5,
  'Thyroid (via GI pattern)': 6,
};

function domainPriority(domainName: string): number {
  return DOMAIN_PRIORITY[domainName] ?? 99;
}

/**
 * Given a client's NAQ domain scores and a recipe's sensitivity flag array,
 * returns an array of warnings to display on the recipe card or detail modal.
 *
 * Rules:
 * 1. Only fires when the domain burden exceeds the rule threshold.
 * 2. Only fires for flags that are present in recipeSensitivityFlags.
 * 3. Each flag produces at most ONE warning — the highest-priority domain wins
 *    when multiple domains would fire for the same ingredient.
 */
export function getNAQWarnings(
  domainScores: NAQDomainScore[],
  recipeSensitivityFlags: string[],
): NAQWarning[] {
  const recipeFlags = new Set(recipeSensitivityFlags.map((f) => f.toLowerCase()));

  // Map from flag → best (lowest priority number) matching rule so far
  const best = new Map<string, { message: string; domain: string; priority: number }>();

  for (const rule of DOMAIN_RULES) {
    const domain = domainScores.find((s) => s.domainId === rule.domainId);
    if (!domain || domain.burden < rule.thresholdPct) continue;

    const priority = domainPriority(rule.domainName);

    for (const flag of rule.warnFlags) {
      if (!recipeFlags.has(flag.toLowerCase())) continue;

      const existing = best.get(flag);
      if (!existing || priority < existing.priority) {
        best.set(flag, { message: rule.message, domain: rule.domainName, priority });
      }
    }
  }

  return Array.from(best.entries()).map(([flag, { message, domain }]) => ({
    flag,
    message,
    domain,
  }));
}
