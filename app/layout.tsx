import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Divergent · Nutritional Therapy — Humane AI Wellness Platform',
  description:
    'Humane AI wellness platform — parasympathetic-first clinical tools for NTPs and their clients.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Divergent',
  },
  icons: {
    apple: '/apple-touch-icon.png',
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#1E3122',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/signup"
    >
      <html lang="en" data-theme="light">
        <body>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <main id="main-content">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
