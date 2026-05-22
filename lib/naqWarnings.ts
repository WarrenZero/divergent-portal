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

/**
 * Given a client's NAQ domain scores and a recipe's sensitivity flag array,
 * returns an array of warnings to display on the recipe card or detail modal.
 *
 * Only returns warnings where:
 * 1. The domain burden exceeds the threshold, AND
 * 2. The recipe's sensitivity_flags array contains at least one of the warnFlags
 */
export function getNAQWarnings(
  domainScores: NAQDomainScore[],
  recipeSensitivityFlags: string[],
): NAQWarning[] {
  const recipeFlags = new Set(recipeSensitivityFlags.map((f) => f.toLowerCase()));
  const warnings: NAQWarning[] = [];
  const seen = new Set<string>(); // de-duplicate flag+domain combos

  for (const rule of DOMAIN_RULES) {
    const domain = domainScores.find((s) => s.domainId === rule.domainId);
    if (!domain || domain.burden < rule.thresholdPct) continue;

    for (const flag of rule.warnFlags) {
      if (!recipeFlags.has(flag.toLowerCase())) continue;
      const key = `${flag}|${rule.domainName}`;
      if (seen.has(key)) continue;
      seen.add(key);

      warnings.push({
        flag,
        message: rule.message,
        domain: rule.domainName,
      });
    }
  }

  return warnings;
}
