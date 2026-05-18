import { SignIn } from '@clerk/nextjs';

// Divergent appearance tokens mapped to Clerk's appearance API
const divergentAppearance = {
  variables: {
    colorPrimary: '#C07848',           // --copper-500
    colorBackground: '#FDFAF5',        // --bone-50
    colorInputBackground: '#FFFFFF',
    colorInputText: '#0F1F13',         // --pine-900
    colorText: '#0F1F13',
    colorTextSecondary: '#9A8A72',     // --bone-600
    colorDanger: '#B04848',
    colorSuccess: '#5A7C62',           // --pine-400
    borderRadius: '6px',
    fontFamily: 'Lora, Georgia, serif',
    fontFamilyButtons: 'Syne, sans-serif',
    fontSize: '14px',
    spacingUnit: '18px',
  },
  elements: {
    card: {
      boxShadow: '0 4px 16px rgba(15,31,19,0.10)',
      border: '1px solid #E8DECE',     // --bone-300
      borderRadius: '18px',
      padding: '32px',
    },
    headerTitle: {
      fontFamily: 'Syne, sans-serif',
      fontWeight: '800',
      fontSize: '20px',
      color: '#0F1F13',
    },
    headerSubtitle: {
      fontFamily: 'Lora, Georgia, serif',
      color: '#9A8A72',
    },
    formButtonPrimary: {
      fontFamily: 'Syne, sans-serif',
      fontWeight: '600',
      fontSize: '12px',
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
      background: '#C07848',
      boxShadow: '0 4px 20px rgba(192,120,72,0.25)',
    },
    footerActionLink: {
      color: '#C07848',
      fontWeight: '600',
    },
    identityPreviewText: {
      fontFamily: 'Lora, Georgia, serif',
    },
    dividerLine: {
      background: '#E8DECE',
    },
    dividerText: {
      color: '#9A8A72',
      fontFamily: 'Syne, sans-serif',
      fontSize: '10px',
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const,
    },
  },
};

export default function LoginPage() {
  return (
    <SignIn
      appearance={divergentAppearance}
      forceRedirectUrl="/dashboard"
      signUpUrl="/signup"
    />
  );
}
