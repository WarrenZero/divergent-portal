'use client';

import { useState, useTransition } from 'react';
import { inviteClient } from './actions';
import styles from './ClientProfile.module.css';

interface Props {
  clientId: string;
  email: string;
  alreadyActive: boolean;
}

export default function InviteButton({ clientId, email, alreadyActive }: Props) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (alreadyActive) {
    return (
      <span
        style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--pine-500)',
          padding: '7px 14px',
        }}
      >
        ✓ Portal Active
      </span>
    );
  }

  if (sent) {
    return (
      <span
        style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--pine-500)',
          padding: '7px 14px',
        }}
      >
        ✓ Invite Sent
      </span>
    );
  }

  function handleInvite() {
    setError(null);
    startTransition(async () => {
      const result = await inviteClient(clientId, email);
      if (result.error) {
        setError(result.error);
      } else {
        setSent(true);
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        className={styles.btnGhost}
        onClick={handleInvite}
        disabled={isPending}
      >
        {isPending ? 'Sending…' : '✉ Invite Client'}
      </button>
      {error && (
        <span
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 10,
            color: 'var(--danger)',
            maxWidth: 180,
            textAlign: 'right',
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
