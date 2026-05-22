'use client';

import { useState } from 'react';
import PractitionerTopNav from './PractitionerTopNav';
import PractitionerSidebar from './PractitionerSidebar';
import styles from './PractitionerShell.module.css';

interface Props {
  practitionerName: string;
  children: React.ReactNode;
}

export default function PractitionerShell({ practitionerName, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <PractitionerTopNav
        practitionerName={practitionerName}
        onMenuToggle={() => setMobileOpen((v) => !v)}
      />

      <PractitionerSidebar
        practitionerName={practitionerName}
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Backdrop — mobile only, dismisses the drawer */}
      {mobileOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className={styles.main}>{children}</main>
    </>
  );
}
