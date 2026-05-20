'use client';

import { useState } from 'react';
import styles from './ClientProfile.module.css';

interface Props {
  text: string;
}

export default function NAQCopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select a temp textarea
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button className={styles.copyBtn} onClick={handleCopy}>
      {copied ? '✓ Copied' : '✦ Copy NAQ Summary for Co-Pilot'}
    </button>
  );
}
