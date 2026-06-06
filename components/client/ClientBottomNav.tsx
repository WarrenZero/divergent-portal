'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './ClientBottomNav.module.css';

// ─── Nav definition ────────────────────────────────────────────

const NAV_BASE = [
  { href: '/checkin',  label: 'Home',       subtitle: 'Check in',  glyph: '◈', live: true },
  { href: '/journal',  label: 'Journal',    subtitle: 'Log meals', glyph: '⚘', live: true },
  { href: '/meals',    label: 'Meals',      subtitle: 'Recipes',   glyph: '✿', live: true },
  { href: '/naq',      label: 'Assessment', subtitle: null,         glyph: '◉', live: true },
  { href: '/vault',    label: 'Library',    subtitle: 'Resources', glyph: '✦', live: true },
];

// ─── Props ────────────────────────────────────────────────────

interface Props {
  wellnessScore?: number | null;
}

// ─── Component ────────────────────────────────────────────────

export default function ClientBottomNav({ wellnessScore }: Props) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Client navigation">
      {NAV_BASE.map(({ href, label, subtitle, glyph, live }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');

        // Dynamic subtitle for Assessment tab
        const resolvedSubtitle = href === '/naq'
          ? (wellnessScore != null && wellnessScore > 0
              ? `Score: ${wellnessScore}`
              : 'Take assessment')
          : subtitle;

        // Dynamic glyph for Assessment tab when score exists
        const resolvedGlyph = href === '/naq' && wellnessScore != null && wellnessScore > 0
          ? '◎'
          : glyph;

        if (!live) {
          return (
            <span key={href} className={`${styles.tab} ${styles.tabDisabled}`}>
              <span className={styles.glyph}>{resolvedGlyph}</span>
              <span className={styles.label}>{label}</span>
              <span className={styles.subtitle}>{resolvedSubtitle}</span>
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
            <span className={styles.glyph}>{resolvedGlyph}</span>
            <span className={styles.label}>{label}</span>
            <span className={styles.subtitle}>{resolvedSubtitle}</span>
          </Link>
        );
      })}
    </nav>
  );
}
