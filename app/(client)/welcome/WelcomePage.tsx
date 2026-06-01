'use client';

import { useRouter } from 'next/navigation';
import styles from './WelcomePage.module.css';

interface Props {
  firstName: string;
}

const STEPS = [
  {
    icon: '◈',
    title: 'Check in daily',
    body: 'Tell me how you\'re feeling. Takes 30 seconds.',
  },
  {
    icon: '⚘',
    title: 'Follow your plan',
    body: 'Your personal protocol is ready and waiting.',
  },
  {
    icon: '✿',
    title: 'Log what you eat',
    body: 'Helps me see your patterns and personalize your plan.',
  },
];

export default function WelcomePage({ firstName }: Props) {
  const router = useRouter();

  function handleBegin() {
    localStorage.setItem('divergent-welcomed', 'true');
    router.replace('/checkin');
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* Glyph */}
        <div className={styles.glyph}>✦</div>

        {/* Greeting */}
        <h1 className={styles.heading}>Welcome, {firstName}.</h1>

        {/* Warren's note */}
        <p className={styles.note}>
          I&rsquo;ve built this portal just for you. It takes less than 2 minutes
          a day — and every entry helps me help you better.
        </p>

        {/* Slogan */}
        <p className={styles.slogan}>
          Your body has answers. We help you hear them.
        </p>

        {/* Step cards */}
        <div className={styles.steps}>
          {STEPS.map((step) => (
            <div key={step.title} className={styles.stepCard}>
              <span className={styles.stepIcon}>{step.icon}</span>
              <div>
                <div className={styles.stepTitle}>{step.title}</div>
                <div className={styles.stepBody}>{step.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button className={styles.cta} onClick={handleBegin}>
          I&rsquo;m ready — let&rsquo;s begin →
        </button>

        {/* Footer credential */}
        <p className={styles.footer}>
          Warren Hennon, NTP · 1,226 hours · NTA Tumwater · Honors
        </p>
      </div>
    </div>
  );
}
