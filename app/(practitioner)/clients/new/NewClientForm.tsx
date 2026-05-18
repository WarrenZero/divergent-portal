'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { addClient } from '../actions';
import styles from './NewClientForm.module.css';

export default function NewClientForm() {
  const [state, formAction, isPending] = useActionState(addClient, null);

  return (
    <div className={styles.shell}>
      <Link href="/clients" className={styles.back}>
        ← Back to Clients
      </Link>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1 className={styles.cardTitle}>Add New Client</h1>
          <p className={styles.cardSub}>
            Create a client record. You can assign a protocol and supplements after saving.
          </p>
        </div>

        <form action={formAction} className={styles.form}>
          {state?.error && (
            <div className={styles.errorBox} role="alert">
              {state.error}
            </div>
          )}

          {/* Name row */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="first_name">
                First Name <span className={styles.required}>*</span>
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                className={styles.input}
                placeholder="Sarah"
                autoComplete="given-name"
                required
                disabled={isPending}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="last_name">
                Last Name <span className={styles.required}>*</span>
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                className={styles.input}
                placeholder="Morgenstern"
                autoComplete="family-name"
                required
                disabled={isPending}
              />
            </div>
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={styles.input}
              placeholder="sarah@example.com"
              autoComplete="email"
              disabled={isPending}
            />
          </div>

          {/* Primary concern */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="primary_concern">
              Primary Concern
            </label>
            <textarea
              id="primary_concern"
              name="primary_concern"
              className={styles.textarea}
              placeholder="GI burden, chronic fatigue, blood sugar dysregulation…"
              disabled={isPending}
            />
            <span className={styles.hint}>
              Describe the main health concern in the client&rsquo;s own words.
            </span>
          </div>

          <div className={styles.divider} />

          {/* Date of birth */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="date_of_birth">
              Date of Birth <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-3)' }}>(optional)</span>
            </label>
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              className={styles.input}
              disabled={isPending}
            />
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href="/clients" className={styles.btnCancel}>
              Cancel
            </Link>
            <button type="submit" className={styles.btnSubmit} disabled={isPending}>
              {isPending ? 'Saving…' : 'Add Client →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
