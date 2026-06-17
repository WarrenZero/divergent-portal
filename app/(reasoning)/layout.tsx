import type { Metadata } from 'next';
import { Syne, Lora, JetBrains_Mono } from 'next/font/google';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['500', '600', '700', '800'],
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Divergent AI — Clinical Reasoning Assistant',
  description: 'The clinical reasoning partner built for how NTPs think.',
};

export default function ReasoningLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${syne.variable} ${lora.variable} ${jetbrainsMono.variable}`}
      style={{ minHeight: '100vh' }}
    >
      {children}
    </div>
  );
}
