'use client';

import { useClerk } from '@clerk/nextjs';
import styles from './ClientTopBar.module.css';

interface Props {
  email: string | null;
}

export default function ClientTopBar({ email }: Props) {
  const { signOut } = useClerk();

  return (
    <div className={styles.bar}>
      {email && <span className={styles.email}>{email}</span>}
      <button
        className={styles.signOut}
        onClick={() => signOut({ redirectUrl: 'https://divergentportal.com' })}
      >
        Sign out
      </button>
    </div>
  );
}
