import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Divergent · Nutritional Therapy — Humane AI Wellness Platform',
  description:
    'Humane AI wellness platform — parasympathetic-first clinical tools for NTPs and their clients.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0F1F13' },
    { media: '(prefers-color-scheme: light)', color: '#FDFAF5' },
  ],
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
