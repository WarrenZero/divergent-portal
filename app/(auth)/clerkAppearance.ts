// Shared Clerk appearance config for login + signup pages.
// Divergent brand: Forest Pine · Warm Bone · Muted Copper

export const divergentAppearance = {
  variables: {
    colorPrimary:        '#C07848',   // --copper-500
    colorBackground:     '#FDFAF5',   // --bone-50
    colorInputBackground:'#FFFFFF',
    colorInputText:      '#0F1F13',   // --pine-900
    colorText:           '#0F1F13',
    colorTextSecondary:  '#9A8A72',   // --bone-600
    colorDanger:         '#B04848',
    colorSuccess:        '#5A7C62',   // --pine-400
    borderRadius:        '6px',
    fontFamily:          'Lora, Georgia, serif',
    fontFamilyButtons:   'Syne, sans-serif',
    fontSize:            '14px',
    spacingUnit:         '18px',
  },
  elements: {
    card: {
      boxShadow:    '0 4px 16px rgba(15,31,19,0.10)',
      border:       '1px solid #E8DECE',   // --bone-300
      borderRadius: '18px',
      padding:      '32px',
    },
    headerTitle: {
      fontFamily: 'Syne, sans-serif',
      fontWeight: '800',
      fontSize:   '20px',
      color:      '#0F1F13',
    },
    headerSubtitle: {
      fontFamily: 'Lora, Georgia, serif',
      color:      '#9A8A72',
    },

    // ── Google (and any other social) button ──────────────────
    // Clerk renders this as a full-width block when only one
    // provider is enabled, which is the "prominent" treatment.
    socialButtonsBlockButton: {
      fontFamily:      'Syne, sans-serif',
      fontWeight:      '700',
      fontSize:        '13px',
      letterSpacing:   '0.03em',
      background:      '#FFFFFF',
      border:          '1px solid #D4C4B0',  // --bone-400
      color:           '#0F1F13',
      padding:         '11px 18px',
      transition:      'background 150ms, box-shadow 150ms',
    },
    socialButtonsBlockButtonText: {
      fontFamily: 'Syne, sans-serif',
      fontWeight: '700',
      fontSize:   '13px',
    },
    socialButtonsBlockButton__google: {
      // Extra specificity just for Google if Clerk supports it
      boxShadow: '0 2px 8px rgba(15,31,19,0.08)',
    },
    // ─────────────────────────────────────────────────────────

    formButtonPrimary: {
      fontFamily:      'Syne, sans-serif',
      fontWeight:      '600',
      fontSize:        '12px',
      letterSpacing:   '0.04em',
      textTransform:   'uppercase' as const,
      background:      '#C07848',
      boxShadow:       '0 4px 20px rgba(192,120,72,0.25)',
    },
    footerActionLink: {
      color:      '#C07848',
      fontWeight: '600',
    },
    identityPreviewText: {
      fontFamily: 'Lora, Georgia, serif',
    },
    dividerLine: {
      background: '#E8DECE',
    },
    dividerText: {
      color:          '#9A8A72',
      fontFamily:     'Syne, sans-serif',
      fontSize:       '10px',
      letterSpacing:  '0.1em',
      textTransform:  'uppercase' as const,
    },
  },
};
