import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Inter, Lora, JetBrains_Mono } from 'next/font/google';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '600'],
  style: ['normal', 'italic'],
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
      className={`${plusJakartaSans.variable} ${inter.variable} ${lora.variable} ${jetbrainsMono.variable}`}
      style={{ minHeight: '100vh' }}
    >
      {children}
    </div>
  );
}
