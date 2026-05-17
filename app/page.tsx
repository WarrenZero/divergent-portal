'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ─── Theme helpers ────────────────────────────────────────────

type Theme = 'light' | 'dark';

function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem('divergent-theme');
    if (v === 'dark' || v === 'light') return v;
  } catch {}
  return 'light';
}

// ─── Component ────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [theme, setThemeState] = useState<Theme>('light');
  const revealRef = useRef<HTMLDivElement>(null);

  // Initialise theme from localStorage on mount
  useEffect(() => {
    const saved = readStoredTheme();
    setThemeState(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('divergent-theme', t); } catch {}
  }

  // Staggered reveal — fires once on mount, mirroring v11's initReveal()
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal');
    els.forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 80);
    });
  }, []);

  function goTo(path: string) {
    router.push(path);
  }

  return (
    <>
      {/* ═══════ TOP NAV ═══════ */}
      <nav className="topnav">
        <div className="topnav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && window.scrollTo({ top: 0 })}>
          <div className="brand-mark">✦</div>
          <div>
            <div className="brand-name">DIVERGENT</div>
            <div className="brand-tag">Nutritional Therapy</div>
          </div>
        </div>

        <div className="topnav-switcher">
          <button className="switcher-btn active">Home</button>
          <button className="switcher-btn" onClick={() => goTo('/dashboard')}>Practitioner</button>
          <button className="switcher-btn" onClick={() => goTo('/checkin')}>Client</button>
        </div>

        <div className="topnav-right">
          {/* Theme toggle */}
          <div className="theme-toggle" role="radiogroup" aria-label="Theme">
            <button
              className={`theme-btn${theme === 'light' ? ' active' : ''}`}
              onClick={() => setTheme('light')}
              aria-label="Light mode"
              aria-checked={theme === 'light'}
              role="radio"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
              </svg>
            </button>
            <button
              className={`theme-btn${theme === 'dark' ? ' active' : ''}`}
              onClick={() => setTheme('dark')}
              aria-label="Dark mode"
              aria-checked={theme === 'dark'}
              role="radio"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════ LANDING V2 ═══════ */}
      <div className="landing-v2" ref={revealRef} style={{ paddingTop: 80 }}>

        {/* Aurora */}
        <div className="aurora" aria-hidden="true" />

        {/* Badge */}
        <div className="v2-badge reveal">
          <span className="v2-badge-dot" />
          Humane AI Wellness Platform
        </div>

        {/* Hero H1 */}
        <h1 className="v2-h1 reveal">
          Intelligence that <em>heals</em><br />by design.
        </h1>

        {/* Subtitle */}
        <p className="v2-sub reveal">
          A precision clinical platform for Nutritional Therapy Practitioners — combining adaptive AI assessments, lab intelligence, and a client experience built for calm.
        </p>

        {/* CTA row */}
        <div className="v2-cta-row reveal">
          <button className="v2-cta primary" onClick={() => goTo('/dashboard')}>
            Enter Practitioner Portal <span aria-hidden="true">→</span>
          </button>
          <button className="v2-cta secondary" onClick={() => goTo('/checkin')}>
            Enter Client Hub
          </button>
        </div>

        {/* Stats */}
        <div className="v2-stats reveal">
          <div className="v2-stat">
            <div className="v2-stat-num">97</div>
            <div className="v2-stat-lab">AI clinical IQ</div>
          </div>
          <div className="v2-stat">
            <div className="v2-stat-num">10</div>
            <div className="v2-stat-lab">Foundation domains</div>
          </div>
          <div className="v2-stat">
            <div className="v2-stat-num">360k+</div>
            <div className="v2-stat-lab">Recipe database</div>
          </div>
          <div className="v2-stat">
            <div className="v2-stat-num">&lt; 60s</div>
            <div className="v2-stat-lab">Lab-to-insight time</div>
          </div>
        </div>

        {/* Portal cards */}
        <div className="v2-portal-row reveal">
          <div
            className="v2-portal"
            onClick={() => goTo('/dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && goTo('/dashboard')}
          >
            <div className="v2-portal-type">For Practitioners</div>
            <div className="v2-portal-title">The Right Hand</div>
            <p className="v2-portal-desc">
              AI-adaptive NAQ, functional lab parsing, symptom maps, integrated workflow, and Fullscript protocols &mdash; your entire clinical practice in one calm workspace.
            </p>
            <div className="v2-portal-arrow">Enter portal <span aria-hidden="true">→</span></div>
          </div>

          <div
            className="v2-portal"
            onClick={() => goTo('/checkin')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && goTo('/checkin')}
          >
            <div className="v2-portal-type">For Clients</div>
            <div className="v2-portal-title">The Safe Haven</div>
            <p className="v2-portal-desc">
              Daily pulse check-ins, food journal, root-cause education, and clear practitioner notes &mdash; healing, simplified, at your own pace.
            </p>
            <div className="v2-portal-arrow">Enter hub <span aria-hidden="true">→</span></div>
          </div>
        </div>

        {/* Feature grid */}
        <div className="v2-features reveal">
          <div className="v2-feat-card">
            <div className="v2-feat-icon">✦</div>
            <div className="v2-feat-title">AI Pattern Engine</div>
            <p className="v2-feat-desc">Adaptive symptom recognition across 10 foundation domains. Branches intelligently based on client responses.</p>
          </div>
          <div className="v2-feat-card">
            <div className="v2-feat-icon">⚗</div>
            <div className="v2-feat-title">Functional Lab Intelligence</div>
            <p className="v2-feat-desc">Parse any PDF lab report in under 60 seconds. Compare against functional ranges, flag priorities, generate summaries.</p>
          </div>
          <div className="v2-feat-card">
            <div className="v2-feat-icon">◎</div>
            <div className="v2-feat-title">Parasympathetic Design</div>
            <p className="v2-feat-desc">Every color, interaction, and moment of the client experience is engineered to calm the nervous system.</p>
          </div>
          <div className="v2-feat-card">
            <div className="v2-feat-icon">⟳</div>
            <div className="v2-feat-title">Closed-Loop System</div>
            <p className="v2-feat-desc">Intake to map to labs to protocol to meals to supplements to journal. One seamless clinical loop.</p>
          </div>
        </div>

        {/* Footer */}
        <p className="v2-footer">
          A Humane AI Wellness Product &nbsp;·&nbsp; Divergent Nutritional Therapy &nbsp;·&nbsp; © 2025
        </p>
      </div>
    </>
  );
}
