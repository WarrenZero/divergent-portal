'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './PractitionerSidebar.module.css';

interface Props {
  practitionerName: string;
  clientCount?: number;
  naqFlagCount?: number;
}

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', icon: '◈', label: 'Dashboard', href: '/dashboard' },
      {
        id: 'clients',
        icon: '◉',
        label: 'Clients',
        href: '/clients',
        badgeProp: 'clientCount' as const,
      },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      {
        id: 'naq',
        icon: '⬡',
        label: 'Dynamic NAQ',
        href: '/naq',
        badgeProp: 'naqFlagCount' as const,
      },
      { id: 'labs', icon: '⚗', label: 'Lab Parser', href: '/labs' },
      { id: 'engage', icon: '⟁', label: 'Engagement Loop', href: '/engage' },
    ],
  },
  {
    label: 'Practice',
    items: [
      { id: 'workflow', icon: '⊞', label: 'Workflow', href: '/workflow' },
      { id: 'form-builder', icon: '⊟', label: 'Form Builder', href: '/form-builder' },
      { id: 'meal-plans', icon: '✿', label: 'AI Meal Plans', href: '/meal-plans' },
      { id: 'library', icon: '⚘', label: 'Protocol Library', href: '/library' },
      {
        id: 'copilot-config',
        icon: '✦',
        label: 'AI Co-Pilot Config',
        href: '/copilot-config',
      },
      { id: 'symptom-maps', icon: '◎', label: 'Symptom Maps', href: '/symptom-maps' },
    ],
  },
];

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function PractitionerSidebar({
  practitionerName,
  clientCount,
  naqFlagCount,
}: Props) {
  const pathname = usePathname();

  const badges: Record<string, number | undefined> = {
    clientCount,
    naqFlagCount,
  };

  return (
    <aside className={styles.sidebar}>
      {NAV_SECTIONS.map((section, si) => (
        <div key={section.label}>
          {si > 0 && <div className={styles.divider} />}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>{section.label}</div>
            {section.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/');
              const badgeVal =
                'badgeProp' in item && item.badgeProp
                  ? badges[item.badgeProp]
                  : undefined;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`${styles.link} ${isActive ? styles.linkActive : ''}`}
                >
                  <span className={styles.icon}>{item.icon}</span>
                  {item.label}
                  {badgeVal !== undefined && badgeVal > 0 && (
                    <span className={styles.badge}>{badgeVal}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div className={styles.bottom}>
        <div className={styles.userRow}>
          <div className={styles.avatar}>{initials(practitionerName)}</div>
          <div>
            <div className={styles.userName}>{practitionerName}</div>
            <div className={styles.userRole}>NTP · Solo Practice</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
