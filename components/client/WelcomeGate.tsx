'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Runs on every client page. If the localStorage key hasn't been set,
// redirects to /welcome before the user sees any other content.
export default function WelcomeGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/welcome') return; // already on welcome page
    if (!localStorage.getItem('divergent-welcomed')) {
      router.replace('/welcome');
    }
  }, [pathname, router]);

  return null;
}
