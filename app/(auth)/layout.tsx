// Centered shell for login + signup — no sidebar, no nav chrome
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background:
          'radial-gradient(ellipse 80% 60% at 20% 80%, rgba(42,67,48,0.06) 0%, transparent 60%), ' +
          'radial-gradient(ellipse 60% 40% at 80% 20%, rgba(192,120,72,0.05) 0%, transparent 50%), ' +
          'var(--bg)',
      }}
    >
      {/* Brand mark */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'linear-gradient(135deg, var(--pine-700), var(--pine-500))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--pine-100)',
            fontSize: 20,
            margin: '0 auto 12px',
          }}
        >
          ✦
        </div>
        <div
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '0.04em',
            color: 'var(--pine-900)',
          }}
        >
          DIVERGENT
        </div>
        <div
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
            marginTop: 2,
          }}
        >
          Nutritional Therapy
        </div>
      </div>

      {children}
    </div>
  );
}
