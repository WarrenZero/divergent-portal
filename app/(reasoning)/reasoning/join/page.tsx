'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './join.module.css';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
}

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

      // If the API returns a Clerk redirect URL, navigate there
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
      {/* Nav */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.navBrand}>✦ Divergent AI</Link>
        <Link href="/login" className={styles.navLink}>Sign in →</Link>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <p className={styles.eyebrow}>✦ Divergent AI · Clinical Reasoning Assistant</p>
        <h1 className={styles.headline}>
          The clinical reasoning partner built for how NTPs think.
        </h1>
        <p className={styles.subtitle}>
          <em>
            HTMA-first. Metabolic-type aware. Built around the way you already reason — and designed to push your thinking further.
          </em>
        </p>
      </section>

      {/* Value Props */}
      <div className={styles.valueProps}>
        <div className={styles.valuePropCard}>
          <p className={styles.valuePropEyebrow}>HTMA Reasoning</p>
          <h3 className={styles.valuePropTitle}>Mineral ratio analysis you can actually use</h3>
          <p className={styles.valuePropBody}>
            Upload an HTMA report and reason through Ca/Mg, Na/K, and Zn/Cu patterns with an AI that understands metabolic typing, oxidation rate, and somatopsychic links.
          </p>
        </div>
        <div className={styles.valuePropCard}>
          <p className={styles.valuePropEyebrow}>Protocol Building</p>
          <h3 className={styles.valuePropTitle}>The 20% guardrail, always on</h3>
          <p className={styles.valuePropBody}>
            Every suggestion is checked against anti-inflammatory principles. When something risks a client's metabolic repair, the assistant flags it — gently, with clinical reasoning.
          </p>
        </div>
        <div className={styles.valuePropCard}>
          <p className={styles.valuePropEyebrow}>Your Clinical Profile</p>
          <h3 className={styles.valuePropTitle}>Calibrated to your experience level</h3>
          <p className={styles.valuePropBody}>
            A 5-step onboarding assessment maps your training, frameworks, and lab approach. The assistant adapts its communication style to match exactly where you are clinically.
          </p>
        </div>
      </div>

      {/* Signup */}
      <section className={styles.signupSection}>
        <div className={styles.pricingCard}>
          <div className={styles.pricingHeader}>
            <div className={styles.pricingBadge}>7-Day Free Trial</div>
            <p className={styles.pricingPrice}>$39.99</p>
            <p className={styles.pricingPriceSub}>per month after trial · cancel anytime</p>
            <p className={styles.pricingTrial}>
              <em>Start thinking like a 1% clinical practitioner — free for 7 days.</em>
            </p>
          </div>

          <ul className={styles.featureList}>
            <li className={styles.featureItem}>
              <span className={styles.featureCheck}>✦</span>
              Unlimited AI reasoning conversations
            </li>
            <li className={styles.featureItem}>
              <span className={styles.featureCheck}>✦</span>
              HTMA report upload & mineral ratio analysis
            </li>
            <li className={styles.featureItem}>
              <span className={styles.featureCheck}>✦</span>
              Clinical notes — pinned, searchable, organized
            </li>
            <li className={styles.featureItem}>
              <span className={styles.featureCheck}>✦</span>
              File library (labs, images, recordings, research)
            </li>
            <li className={styles.featureItem}>
              <span className={styles.featureCheck}>✦</span>
              Practitioner profile calibration (5-step onboarding)
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

            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Creating your account…' : 'Start 7-day free trial →'}
            </button>
          </form>

          <div className={styles.signinLink}>
            Already have an account?{' '}
            <Link href="/login">Sign in →</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          Statements regarding nutritional support have not been evaluated by the Food and Drug Administration.
          Foundational nutrition is intended to support the body's natural systems and is not intended to
          diagnose, treat, cure, or prevent any disease.
        </p>
        <p className={styles.footerUpgrade}>
          Need full client management, protocols, and lab parsing?{' '}
          <a href="mailto:hello@divergentnt.com">Ask about the Full Portal →</a>
        </p>
      </footer>
    </div>
  );
}
