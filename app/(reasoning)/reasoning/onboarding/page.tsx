'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './onboarding.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  full_name?: string;
  credentials?: string[];
  certifying_body?: string;
  training_hours?: number;
  years_in_practice?: number;
  year_certified?: number;
  active_client_count?: string;
  primary_client_types?: string[];
  primary_conditions?: string[];
  age_ranges_served?: string[];
  average_protocol_length?: string;
  labs_ordered?: string[];
  lab_interpretation_approach?: string;
  preferred_lab_companies?: string[];
  primary_frameworks?: string[];
  dietary_approaches?: string[];
  supplement_philosophy?: string;
  protocol_building_approach?: string;
  htma_first_look?: string;
  challenging_patterns?: string;
  information_style?: 'brief' | 'balanced' | 'detailed';
  additional_context?: string;
}

// ─── Intelligence level calculation ───────────────────────────────────────────

function computeIntelligenceLevel(profile: Partial<ProfileData>): string {
  let score = 0;

  const hours = profile.training_hours ?? 0;
  if (hours < 500) score += 1;
  else if (hours < 1000) score += 2;
  else if (hours < 1500) score += 3;
  else if (hours < 2000) score += 4;
  else score += 5;

  const yearsMap: Record<string, number> = {
    'student': 0,
    '1-2': 1,
    '3-5': 2,
    '6-10': 3,
    '10+': 4,
  };
  score += yearsMap[String(profile.years_in_practice ?? 'student')] ?? 0;

  const labCount = (profile.labs_ordered ?? []).length;
  if (labCount >= 1 && labCount <= 2) score += 1;
  else if (labCount <= 5) score += 2;
  else if (labCount <= 8) score += 3;
  else score += 4;

  const approachMap: Record<string, number> = {
    'standard': 1,
    'functional': 2,
    'functional+patterns': 3,
    'htma-led': 3,
    'integrative': 4,
  };
  score += approachMap[profile.lab_interpretation_approach ?? ''] ?? 0;

  if (score <= 5) return 'student';
  if (score <= 9) return 'emerging';
  if (score <= 13) return 'intermediate';
  if (score <= 17) return 'advanced';
  return 'expert';
}

// ─── Chip component ───────────────────────────────────────────────────────────

function Chip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${active ? styles.chipActive : ''}`}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}

// ─── Radio option component ───────────────────────────────────────────────────

function RadioOption({
  value,
  label,
  sub,
  selected,
  onSelect,
}: {
  value: string;
  label: string;
  sub?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`${styles.radioOption} ${selected ? styles.radioOptionActive : ''}`}
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
    >
      <div className={`${styles.radioCircle} ${selected ? styles.radioCircleActive : ''}`}>
        {selected && <div className={styles.radioDot} />}
      </div>
      <div>
        <div className={styles.radioLabel}>{label}</div>
        {sub && <div className={styles.radioSub}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Multi-chip helper ────────────────────────────────────────────────────────

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
}) {
  return (
    <div className={styles.chipGrid}>
      {options.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          active={selected.includes(opt)}
          onToggle={() => onToggle(opt)}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<ProfileData>>({});
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const [intelligenceLevel, setIntelligenceLevel] = useState('');

  const totalSteps = 5;

  function toggleArrayField<K extends keyof ProfileData>(
    key: K,
    value: string,
  ) {
    setProfile((prev) => {
      const current = (prev[key] as string[] | undefined) ?? [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  }

  function setField<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  const saveStep = useCallback(
    async (isComplete = false) => {
      setSaving(true);
      try {
        const level = computeIntelligenceLevel(profile);
        const payload: Partial<ProfileData> & {
          onboarding_complete?: boolean;
          intelligence_level?: string;
        } = { ...profile };

        if (isComplete) {
          payload.onboarding_complete = true;
          payload.intelligence_level = level;
          setIntelligenceLevel(level);
        }

        await fetch('/api/reasoning/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        // Non-fatal — progress is saved on next attempt
      } finally {
        setSaving(false);
      }
    },
    [profile],
  );

  async function handleContinue() {
    if (step < totalSteps) {
      await saveStep(false);
      setStep((s) => s + 1);
    } else {
      await saveStep(true);
      setComplete(true);
    }
  }

  function handleBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  // ─── Completion screen ──────────────────────────────────────────────────────

  if (complete) {
    const levelLabels: Record<string, string> = {
      student: 'Student Practitioner',
      emerging: 'Emerging Clinician',
      intermediate: 'Established Practitioner',
      advanced: 'Advanced Clinician',
      expert: 'Expert Practitioner',
    };

    return (
      <div className={styles.completionPage}>
        <div className={styles.completionCard}>
          <div className={styles.completionGlyph}>✦</div>
          <h1 className={styles.completionTitle}>Your clinical profile is complete.</h1>
          <p className={styles.completionSubtitle}>
            <em>
              The reasoning assistant has been calibrated to your frameworks, labs, and experience. It knows how you think.
            </em>
          </p>
          <div className={styles.intelligenceBadge}>
            <div className={styles.intelligenceBadgeLabel}>Intelligence Level</div>
            <div className={styles.intelligenceBadgeValue}>
              {levelLabels[intelligenceLevel] ?? intelligenceLevel}
            </div>
          </div>
          <button
            className={styles.openButton}
            onClick={() => router.push('/reasoning/workspace')}
          >
            Open the Reasoning Assistant →
          </button>
        </div>
      </div>
    );
  }

  // ─── Step rendering ─────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/reasoning/join" className={styles.headerBrand}>✦ Divergent AI</Link>
        <span className={styles.headerStep}>Step {step} of {totalSteps}</span>
      </header>

      <div className={styles.progressWrap}>
        <div
          className={styles.progressBar}
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      <div className={styles.content}>
        {step === 1 && (
          <>
            <div className={styles.stepHeader}>
              <p className={styles.stepEyebrow}>Step 1 — Credentials</p>
              <h2 className={styles.stepTitle}>Tell us about your training.</h2>
              <p className={styles.stepSubtitle}>
                <em>This shapes how the assistant communicates with you — your experience is the baseline.</em>
              </p>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Credentials (select all that apply)</label>
              <ChipGroup
                options={['NTP', 'FNTP', 'NTC', 'RD', 'RDN', 'CNS', 'ND', 'DC', 'CFNC', 'CHN', 'CHHC', 'Other']}
                selected={profile.credentials ?? []}
                onToggle={(v) => toggleArrayField('credentials', v)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Certifying body</label>
              <ChipGroup
                options={['NTA', 'NANP', 'ACN', 'IAACN', 'IFM', 'AHG', 'Other']}
                selected={profile.certifying_body ? [profile.certifying_body] : []}
                onToggle={(v) =>
                  setField('certifying_body', profile.certifying_body === v ? '' : v)
                }
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Training hours</label>
              <div className={styles.radioGroup}>
                {[
                  { value: '200', label: 'Under 200 hours', sub: 'Foundational coursework' },
                  { value: '500', label: '200–500 hours', sub: 'Core program completion' },
                  { value: '1000', label: '500–1,000 hours', sub: 'Advanced program' },
                  { value: '1500', label: '1,000–1,500 hours', sub: 'Intensive / multi-credential' },
                  { value: '2000', label: '1,500–2,000+ hours', sub: 'Doctoral-equivalent or dual-program' },
                ].map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    sub={opt.sub}
                    selected={String(profile.training_hours) === opt.value}
                    onSelect={() => setField('training_hours', parseInt(opt.value))}
                  />
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Years in practice</label>
              <div className={styles.radioGroup}>
                {[
                  { value: 'student', label: 'Currently in training' },
                  { value: '1-2', label: '1–2 years' },
                  { value: '3-5', label: '3–5 years' },
                  { value: '6-10', label: '6–10 years' },
                  { value: '10+', label: '10+ years' },
                ].map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    selected={String(profile.years_in_practice) === opt.value}
                    onSelect={() => setField('years_in_practice', opt.value as unknown as number)}
                  />
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Year certified (optional)</label>
              <input
                type="number"
                className={`${styles.textInput} ${styles.numberInput}`}
                placeholder="2022"
                min={1990}
                max={2030}
                value={profile.year_certified ?? ''}
                onChange={(e) =>
                  setField('year_certified', e.target.value ? parseInt(e.target.value) : undefined)
                }
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className={styles.stepHeader}>
              <p className={styles.stepEyebrow}>Step 2 — Practice Profile</p>
              <h2 className={styles.stepTitle}>Who do you work with?</h2>
              <p className={styles.stepSubtitle}>
                <em>The assistant uses this to frame case context and pattern recognition for your specific client population.</em>
              </p>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Active clients</label>
              <div className={styles.radioGroup}>
                {[
                  { value: '0', label: 'Pre-launch', sub: 'Building toward first clients' },
                  { value: '1-5', label: '1–5 clients' },
                  { value: '6-15', label: '6–15 clients' },
                  { value: '16-30', label: '16–30 clients' },
                  { value: '30+', label: '30+ clients' },
                ].map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    sub={opt.sub}
                    selected={profile.active_client_count === opt.value}
                    onSelect={() => setField('active_client_count', opt.value)}
                  />
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Primary client types (select all that apply)</label>
              <ChipGroup
                options={[
                  'Adults (general)', "Women's health", "Men's health", 'Pediatric',
                  'Prenatal / postnatal', 'Athletes', 'Seniors', 'Autoimmune focus',
                  'Mental health / mood', 'Chronic illness', 'Weight management',
                ]}
                selected={profile.primary_client_types ?? []}
                onToggle={(v) => toggleArrayField('primary_client_types', v)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Primary conditions you address (select all that apply)</label>
              <ChipGroup
                options={[
                  'GI dysfunction', 'Thyroid', 'Adrenal / HPA-axis', 'Blood sugar dysregulation',
                  'Inflammation', 'Immune dysfunction', 'Hormonal imbalance', 'Fatigue / energy',
                  'Sleep disruption', 'Anxiety / mood', 'Heavy metal burden', 'Nutrient deficiency',
                  'Skin conditions', 'Cardiovascular', 'Detox support',
                ]}
                selected={profile.primary_conditions ?? []}
                onToggle={(v) => toggleArrayField('primary_conditions', v)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Average protocol length</label>
              <div className={styles.radioGroup}>
                {[
                  { value: '4-6 weeks', label: '4–6 weeks' },
                  { value: '8-12 weeks', label: '8–12 weeks' },
                  { value: '3-6 months', label: '3–6 months' },
                  { value: '6-12 months', label: '6–12 months' },
                  { value: '12+ months', label: '12+ months (ongoing care)' },
                ].map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    selected={profile.average_protocol_length === opt.value}
                    onSelect={() => setField('average_protocol_length', opt.value)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className={styles.stepHeader}>
              <p className={styles.stepEyebrow}>Step 3 — Lab Work</p>
              <h2 className={styles.stepTitle}>What labs do you run?</h2>
              <p className={styles.stepSubtitle}>
                <em>This calibrates the assistant's lab interpretation depth and which markers it prioritizes in pattern recognition.</em>
              </p>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Labs you order or interpret (select all that apply)</label>
              <ChipGroup
                options={[
                  'HTMA', 'CBC', 'CMP', 'Thyroid Panel (TSH/T3/T4)', 'DUTCH Hormone Panel',
                  'GI Map / Stool Analysis', 'OAT (Organic Acids)', 'SIBO Breath Test',
                  'Food Sensitivity (IgG)', 'Adrenal Stress Index', 'Nutrient Panel',
                  'Heavy Metal (Urine)', 'Metabolomix+', 'Lipid Panel', 'Ferritin / Iron Studies',
                  'HbA1c / Insulin', 'Homocysteine / Methylation', 'Mold / Mycotoxin',
                ]}
                selected={profile.labs_ordered ?? []}
                onToggle={(v) => toggleArrayField('labs_ordered', v)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Lab interpretation approach</label>
              <div className={styles.radioGroup}>
                {[
                  {
                    value: 'standard',
                    label: 'Standard reference ranges',
                    sub: 'I use the lab\'s provided reference ranges',
                  },
                  {
                    value: 'functional',
                    label: 'Functional ranges',
                    sub: 'I use tighter optimal ranges (e.g., TSH 1.0–2.0)',
                  },
                  {
                    value: 'functional+patterns',
                    label: 'Functional ranges + pattern analysis',
                    sub: 'I look at marker relationships and clustering',
                  },
                  {
                    value: 'htma-led',
                    label: 'HTMA-led interpretation',
                    sub: 'HTMA is my primary lens; blood labs supplement it',
                  },
                  {
                    value: 'integrative',
                    label: 'Fully integrative / multi-system',
                    sub: 'I synthesize across HTMA, blood, hormones, and genomics',
                  },
                ].map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    sub={opt.sub}
                    selected={profile.lab_interpretation_approach === opt.value}
                    onSelect={() => setField('lab_interpretation_approach', opt.value)}
                  />
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Preferred lab companies</label>
              <ChipGroup
                options={[
                  'Analytical Research Labs (ARL)', 'TEI / Trace Elements', 'Doctors Data',
                  'Great Plains Laboratory', 'Genova Diagnostics', 'Dutch Test (Precision Analytics)',
                  'BioHealth Laboratory', 'ZRT Laboratory', 'LabCorp', 'Quest Diagnostics',
                  'Vibrant America', 'Rupa Health (aggregator)', 'Other',
                ]}
                selected={profile.preferred_lab_companies ?? []}
                onToggle={(v) => toggleArrayField('preferred_lab_companies', v)}
              />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className={styles.stepHeader}>
              <p className={styles.stepEyebrow}>Step 4 — Clinical Frameworks</p>
              <h2 className={styles.stepTitle}>How do you build protocols?</h2>
              <p className={styles.stepSubtitle}>
                <em>Understanding your frameworks lets the assistant reason within your clinical language — not against it.</em>
              </p>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Primary clinical frameworks (select all that apply)</label>
              <ChipGroup
                options={[
                  'NTA Nutritional Hierarchy', 'Functional Medicine (IFM)', 'Metabolic Typing',
                  'HTMA / Mineral Balancing', 'Weston A. Price', 'Ayurvedic principles',
                  'Traditional Chinese Medicine', 'Ancestral / paleo framework',
                  'Gut-brain axis focus', 'Epigenetics / nutrigenomics', 'Naturopathic principles',
                  'Anti-inflammatory protocol', 'Dr. Paul Eck mineral balancing',
                ]}
                selected={profile.primary_frameworks ?? []}
                onToggle={(v) => toggleArrayField('primary_frameworks', v)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Dietary approaches you use</label>
              <ChipGroup
                options={[
                  'Whole food / unprocessed', 'Anti-inflammatory', 'Elimination diet',
                  'Low-FODMAP', 'Carnivore / animal-based', 'Ketogenic',
                  'Paleo / primal', 'Mediterranean', 'Low-glycemic', 'Grain-free',
                  'Dairy-free', 'Gluten-free', 'Plant-forward', 'Macro-balanced (40/30/30)',
                ]}
                selected={profile.dietary_approaches ?? []}
                onToggle={(v) => toggleArrayField('dietary_approaches', v)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Supplement philosophy</label>
              <div className={styles.radioGroup}>
                {[
                  {
                    value: 'food-first',
                    label: 'Food-first',
                    sub: 'Supplements only when diet cannot bridge the gap',
                  },
                  {
                    value: 'targeted',
                    label: 'Targeted therapeutic',
                    sub: 'Specific supplements to address identified deficiencies or patterns',
                  },
                  {
                    value: 'protocol-driven',
                    label: 'Protocol-driven stacks',
                    sub: 'I build layered supplement protocols tied to clinical phases',
                  },
                  {
                    value: 'minimal',
                    label: 'Minimal intervention',
                    sub: 'I prefer the fewest supplements possible — let food do the work',
                  },
                ].map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    sub={opt.sub}
                    selected={profile.supplement_philosophy === opt.value}
                    onSelect={() => setField('supplement_philosophy', opt.value)}
                  />
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Protocol building approach</label>
              <div className={styles.radioGroup}>
                {[
                  {
                    value: 'nta-hierarchy',
                    label: 'NTA Nutritional Hierarchy',
                    sub: 'Foundation → digestion → blood sugar → fatty acids → minerals → hydration',
                  },
                  {
                    value: 'htma-mineral-first',
                    label: 'HTMA mineral balancing first',
                    sub: 'Address mineral ratios and oxidation rate before layering',
                  },
                  {
                    value: 'symptom-priority',
                    label: 'Symptom-priority',
                    sub: 'Most pressing symptoms drive the first protocol phase',
                  },
                  {
                    value: 'gut-first',
                    label: 'Gut-first always',
                    sub: 'Repair digestion and the microbiome before everything else',
                  },
                  {
                    value: 'client-led',
                    label: 'Client-led and iterative',
                    sub: 'I start where the client has capacity and build momentum',
                  },
                ].map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    sub={opt.sub}
                    selected={profile.protocol_building_approach === opt.value}
                    onSelect={() => setField('protocol_building_approach', opt.value)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div className={styles.stepHeader}>
              <p className={styles.stepEyebrow}>Step 5 — Clinical Voice</p>
              <h2 className={styles.stepTitle}>How do you think?</h2>
              <p className={styles.stepSubtitle}>
                <em>These three questions are the heart of the calibration. Take your time.</em>
              </p>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                When you first look at an HTMA, where does your eye go?
              </label>
              <textarea
                className={`${styles.textInput} ${styles.textarea}`}
                placeholder="e.g., I immediately look at the Ca/Mg ratio to assess oxidation rate, then check Na/K for adrenal status…"
                value={profile.htma_first_look ?? ''}
                onChange={(e) => setField('htma_first_look', e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                What clinical patterns do you find most challenging to navigate?
              </label>
              <textarea
                className={`${styles.textInput} ${styles.textarea}`}
                placeholder="e.g., Clients with both slow oxidation and high calcium — the supplement paradox makes me cautious…"
                value={profile.challenging_patterns ?? ''}
                onChange={(e) => setField('challenging_patterns', e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                How do you prefer the assistant to communicate with you?
              </label>
              <div className={styles.radioGroup}>
                {[
                  {
                    value: 'brief' as const,
                    label: 'Brief and direct',
                    sub: 'Lead with the finding. I\'ll draw my own connections. 2–3 sentences max.',
                  },
                  {
                    value: 'balanced' as const,
                    label: 'Balanced — insight + reasoning',
                    sub: 'Give me the key point with supporting rationale. Invite my interpretation.',
                  },
                  {
                    value: 'detailed' as const,
                    label: 'Detailed walkthrough',
                    sub: 'Full reasoning chain — mechanisms, differentials, pattern context.',
                  },
                ].map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    sub={opt.sub}
                    selected={profile.information_style === opt.value}
                    onSelect={() => setField('information_style', opt.value)}
                  />
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Anything else the assistant should know? (optional)</label>
              <textarea
                className={`${styles.textInput} ${styles.textarea}`}
                placeholder="Clinical philosophy, practice context, areas of special interest…"
                value={profile.additional_context ?? ''}
                onChange={(e) => setField('additional_context', e.target.value)}
              />
            </div>
          </>
        )}

        <div className={styles.nav}>
          {step > 1 ? (
            <button className={styles.backButton} onClick={handleBack} disabled={saving}>
              ← Back
            </button>
          ) : (
            <div />
          )}
          <button
            className={styles.continueButton}
            onClick={handleContinue}
            disabled={saving}
          >
            {saving
              ? 'Saving…'
              : step === totalSteps
              ? 'Complete profile →'
              : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
