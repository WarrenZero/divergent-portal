'use client';

import Link from 'next/link';
import styles from './PractitionerTopNav.module.css';

interface Props {
  practitionerName: string;
  onMenuToggle?: () => void;
}

export default function PractitionerTopNav({ practitionerName, onMenuToggle }: Props) {
  return (
    <nav className={styles.topnav}>
      {/* Hamburger — mobile only */}
      <button
        className={styles.hamburger}
        onClick={onMenuToggle}
        aria-label="Toggle navigation menu"
      >
        ☰
      </button>

      <Link href="/" className={styles.brand}>
        <span className={styles.brandGlyph}>✦</span>
        <span className={styles.brandName}>Divergent</span>
        <div className={styles.brandSep} />
        <span className={styles.brandSub}>Nutritional Therapy</span>
      </Link>

      <div className={styles.right}>
        <span className={styles.practitionerLabel}>{practitionerName}</span>
        <Link href="/" className={styles.pill}>
          <span className={styles.pillDot} />
          Practitioner Portal
        </Link>
      </div>
    </nav>
  );
}
