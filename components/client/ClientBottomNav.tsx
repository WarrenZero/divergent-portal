'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './ClientBottomNav.module.css';

// ─── Nav definition ────────────────────────────────────────────

const NAV = [
  { href: '/checkin',  label: 'Home',       subtitle: 'Check in',       glyph: '◈', live: true },
  { href: '/journal',  label: 'Journal',    subtitle: 'Log meals',      glyph: '⚘', live: true },
  { href: '/meals',    label: 'Meals',      subtitle: 'Recipes',        glyph: '✿', live: true },
  { href: '/naq',      label: 'Assessment', subtitle: 'Health picture', glyph: '◉', live: true },
  { href: '/vault',    label: 'Library',    subtitle: 'Resources',      glyph: '✦', live: true },
];

// ─── Component ────────────────────────────────────────────────

export default function ClientBottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Client navigation">
      {NAV.map(({ href, label, subtitle, glyph, live }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');

        if (!live) {
          return (
            <span key={href} className={`${styles.tab} ${styles.tabDisabled}`}>
              <span className={styles.glyph}>{glyph}</span>
              <span className={styles.label}>{label}</span>
              <span className={styles.subtitle}>{subtitle}</span>
            </span>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={styles.glyph}>{glyph}</span>
            <span className={styles.label}>{label}</span>
            <span className={styles.subtitle}>{subtitle}</span>
          </Link>
        );
      })}
    </nav>
  );
}
