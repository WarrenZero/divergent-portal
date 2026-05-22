'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './ClientBottomNav.module.css';

// ─── Nav definition ────────────────────────────────────────────

const NAV = [
  { href: '/checkin',  label: 'Check-In',  glyph: '◈', live: true  },
  { href: '/journal',  label: 'Journal',   glyph: '⚘', live: true  },
  { href: '/meals',    label: 'Meals',     glyph: '✿', live: true  },
  { href: '/naq',      label: 'Assessment', glyph: '◉', live: true  },
  { href: '/vault',    label: 'Vault',     glyph: '✦', live: true  },
];

// ─── Component ────────────────────────────────────────────────

export default function ClientBottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Client navigation">
      {NAV.map(({ href, label, glyph, live }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');

        if (!live) {
          return (
            <span key={href} className={`${styles.tab} ${styles.tabDisabled}`}>
              <span className={styles.glyph}>{glyph}</span>
              <span className={styles.label}>{label}</span>
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
          </Link>
        );
      })}
    </nav>
  );
}
