'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Brain,
  FileText,
  ShieldCheck,
  Microscope,
  NotebookPen,
  Layers,
  Check,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import styles from './join.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
}

// ─── Feature grid data ───────────────────────────────────────────────────────

const FEATURES = [
  {
    Icon: Brain,
    title: 'HTMA Pattern Recognition',
    body: 'Reason through Ca/Mg, Na/K, Zn/Cu ratios with an AI that understands oxidation rate, metabolic typing, and somatopsychic links.',
  },
  {
    Icon: FileText,
    title: 'Lab Upload & Interpretation',
    body: 'Upload HTMA reports, bloodwork, and functional labs. Get a structured clinical read using functional ranges — not just standard reference.',
  },
  {
    Icon: ShieldCheck,
    title: 'The 20% Guardrail',
    body: 'Every protocol suggestion is checked against anti-inflammatory principles. When a choice risks metabolic repair, the assistant flags it — with reasoning.',
  },
  {
    Icon: Microscope,
    title: 'Protocol Building Support',
    body: 'Walk through the NTA hierarchy, identify mineral antagonists, and stress-test your supplement strategy before the client sees it.',
  },
  {
    Icon: NotebookPen,
    title: 'Clinical Notes System',
    body: 'Pin, tag, and organize session summaries, clinical observations, and protocol notes — searchable, tied to client references.',
  },
  {
    Icon: Layers,
    title: 'Practitioner Calibration',
    body: 'A 5-step onboarding assessment maps your training, frameworks, and reasoning style. The assistant adapts to exactly where you are clinically.',
  },
] as const;

// ─── Pricing tiers ───────────────────────────────────────────────────────────

const TIER_REASONING = [
  'Unlimited AI reasoning conversations',
  'HTMA report upload & mineral ratio analysis',
  'Clinical notes — pinned, tagged, organized',
  'File library (labs, images, recordings, research)',
  'Practitioner profile calibration',
  '20% Guardrail on every response',
];

const TIER_FULL = [
  'Everything in Reasoning Assistant',
  'Full client management dashboard',
  'Dynamic NAQ assessment tool',
  'Protocol assignment & tracking',
  'Lab parser with functional ranges',
  'Meal plan generator (360k+ recipes)',
  'Telehealth session booking',
  'Secure practitioner ↔ client messaging',
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function JoinPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({ firstName: '', lastName: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reasoning/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json() as { error?: string; redirectUrl?: string };

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        router.push('/reasoning/onboarding');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>

      {/* ── Navigation ── */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.navBrand}>
          <span className={styles.navGlyph}>✦</span>
          <span>DIVERGENT AI</span>
        </Link>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Features</a>
          <a href="#pricing" className={styles.navLink}>Pricing</a>
          <a href="#" className={styles.navLink}>About</a>
        </div>
        <Link href="/login" className={styles.navSignIn}>
          Sign in <ArrowRight size={14} strokeWidth={2} />
        </Link>
      </nav>

      {/* ── Hero — two-column ── */}
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowGlyph}>✦</span>
            Clinical Reasoning Assistant for NTPs
          </p>
          <h1 className={styles.headline}>
            The reasoning partner built for how{' '}
            <em className={styles.headlineAccent}>NTPs think.</em>
          </h1>
          <p className={styles.subtitle}>
            Upload an HTMA report. Walk through a complex case. Get a second
            opinion that knows the difference between a Ca/Mg ratio and a Na/K
            pattern — because it was built by an NTP.
          </p>

          {/* Trust signals */}
          <div className={styles.trustGrid}>
            <div className={styles.trustItem}>
              <span className={styles.trustGlyph}>✦</span>
              <div>
                <p className={styles.trustTitle}>NTA-Trained</p>
                <p className={styles.trustBody}>Built on 1,226-hour NTP methodology</p>
              </div>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustGlyph}>✦</span>
              <div>
                <p className={styles.trustTitle}>HTMA-First</p>
                <p className={styles.trustBody}>Mineral ratios, metabolic typing, oxidation rate</p>
              </div>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustGlyph}>✦</span>
              <div>
                <p className={styles.trustTitle}>Calibrated to You</p>
                <p className={styles.trustBody}>Adapts to your training, frameworks, and style</p>
              </div>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustGlyph}>✦</span>
              <div>
                <p className={styles.trustTitle}>20% Guardrail</p>
                <p className={styles.trustBody}>Your clinical judgment stays at the center</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Signup card ── */}
        <div className={styles.heroRight}>
          <div className={styles.signupCard}>
            <div className={styles.signupCardHeader}>
              <span className={styles.trialBadge}>7-Day Free Trial</span>
              <div className={styles.priceRow}>
                <span className={styles.price}>$39.99</span>
                <span className={styles.pricePer}>/month</span>
              </div>
              <p className={styles.priceSub}>after trial · cancel anytime</p>
            </div>

            <ul className={styles.miniFeatures}>
              {TIER_REASONING.slice(0, 4).map((f) => (
                <li key={f} className={styles.miniFeatureItem}>
                  <Check size={14} color="#C07848" strokeWidth={2.5} />
                  <span>{f}</span>
                </li>
              ))}
              <li className={styles.miniFeatureMore}>
                + 2 more features included
              </li>
            </ul>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="firstName" className={styles.label}>First name</label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    className={styles.input}
                    placeholder="Warren"
                    value={form.firstName}
                    onChange={handleChange}
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="lastName" className={styles.label}>Last name</label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    className={styles.input}
                    placeholder="Hennon"
                    value={form.lastName}
                    onChange={handleChange}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={styles.input}
                  placeholder="warren@divergentnt.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>

              {error && <div className={styles.formError}>{error}</div>}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Creating your account…' : (
                  <>
                    Start free trial
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>

            <p className={styles.signInPrompt}>
              Already have an account?{' '}
              <Link href="/login" className={styles.signInLink}>Sign in →</Link>
            </p>

            <p className={styles.cardDisclaimer}>
              No credit card required for trial. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>What&rsquo;s included</p>
          <h2 className={styles.sectionTitle}>
            Every tool a clinical NTP needs to reason better.
          </h2>
          <p className={styles.sectionSubtitle}>
            <em>
              Built around HTMA methodology, functional nutrition frameworks, and the way
              experienced practitioners actually think through cases.
            </em>
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {FEATURES.map(({ Icon, title, body }) => (
            <div key={title} className={styles.featureCard}>
              <div className={styles.featureIconWrap}>
                <Icon size={22} color="#C07848" strokeWidth={1.75} />
              </div>
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureBody}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing comparison ── */}
      <section id="pricing" className={styles.pricingSection}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Pricing</p>
          <h2 className={styles.sectionTitle}>
            Start with reasoning. Grow into the full platform.
          </h2>
          <p className={styles.sectionSubtitle}>
            <em>
              Divergent AI is the entry point. The full portal is the destination.
              Upgrade anytime — your data and conversations carry over.
            </em>
          </p>
        </div>

        <div className={styles.pricingGrid}>
          {/* Tier 1 — Reasoning */}
          <div className={`${styles.pricingCard} ${styles.pricingCardHighlight}`}>
            <div className={styles.pricingCardBadge}>Start here</div>
            <p className={styles.pricingCardLabel}>Reasoning Assistant</p>
            <div className={styles.pricingCardPrice}>
              <span className={styles.pricingAmount}>$39.99</span>
              <span className={styles.pricingCadence}>/month</span>
            </div>
            <p className={styles.pricingCardTrial}>7-day free trial · no card required</p>
            <ul className={styles.tierList}>
              {TIER_REASONING.map((f) => (
                <li key={f} className={styles.tierItem}>
                  <Check size={14} color="#C07848" strokeWidth={2.5} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link href="#" className={styles.pricingCta} onClick={(e) => {
              e.preventDefault();
              document.querySelector('input#firstName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              (document.querySelector('input#firstName') as HTMLInputElement)?.focus();
            }}>
              Start free trial <ChevronRight size={15} />
            </Link>
          </div>

          {/* Tier 2 — Full Portal */}
          <div className={styles.pricingCard}>
            <p className={styles.pricingCardLabel}>Full Portal</p>
            <div className={styles.pricingCardPrice}>
              <span className={styles.pricingAmount}>$129</span>
              <span className={styles.pricingCadence}>/month</span>
            </div>
            <p className={styles.pricingCardTrial}>Includes Reasoning Assistant</p>
            <ul className={styles.tierList}>
              {TIER_FULL.map((f) => (
                <li key={f} className={`${styles.tierItem} ${f.startsWith('Everything') ? styles.tierItemBold : ''}`}>
                  <Check size={14} color="#5A7C62" strokeWidth={2.5} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <a href="mailto:hello@divergentnt.com" className={styles.pricingCtaSecondary}>
              Contact us <ChevronRight size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerGlyph}>✦</span>
            <span className={styles.footerBrandName}>DIVERGENT AI</span>
          </div>

          <div className={styles.footerCredentials}>
            <p className={styles.footerCredText}>
              Warren Hennon successfully completed the 1,226-hour Nutritional Therapy
              Practitioner Program through the Nutritional Therapy Association in
              Tumwater, Washington — graduating with Honors.
            </p>
          </div>

          <div className={styles.footerDisclaimer}>
            <p>
              Statements regarding nutritional support have not been evaluated by the
              Food and Drug Administration. Foundational nutrition is intended to support
              the body&apos;s natural systems and is not intended to diagnose, treat,
              cure, or prevent any disease.
            </p>
            <p className={styles.footerLinks}>
              <a href="mailto:hello@divergentnt.com">hello@divergentnt.com</a>
              <span>·</span>
              <a href="https://divergentportal.com">divergentportal.com</a>
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
