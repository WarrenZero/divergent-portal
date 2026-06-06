'use client';

interface Props {
  insightId: string;
  insight: string;
  generatedAt: string;
  isRead: boolean;
  onDismiss?: () => void;
}

export default function WeeklyInsightCard({
  insightId,
  insight,
  generatedAt,
  isRead,
  onDismiss,
}: Props) {
  const formattedDate = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  function handleDismiss() {
    // Fire-and-forget mark as read
    fetch('/api/vault/read-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insightId }),
    }).catch(() => {});

    onDismiss?.();
  }

  return (
    <div
      style={{
        background: 'var(--pine-900)',
        border: '1px solid var(--pine-700)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '20px',
        marginBottom: '12px',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--copper-500)', fontSize: '16px' }}>✦</span>
          <span
            style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--copper-500)',
            }}
          >
            Your Weekly Insight
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isRead && (
            <span
              style={{
                background: 'var(--copper-500)',
                color: '#FDFAF5',
                fontSize: '9px',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: '20px',
              }}
            >
              NEW
            </span>
          )}
          {onDismiss && (
            <button
              onClick={handleDismiss}
              aria-label="Dismiss insight"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--pine-400)',
                fontSize: '14px',
                padding: '2px 4px',
                lineHeight: 1,
                fontFamily: 'Syne, sans-serif',
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Insight text */}
      <p
        style={{
          fontFamily: 'Lora, Georgia, serif',
          fontSize: '14px',
          color: '#F8F2E8',
          lineHeight: 1.7,
          margin: '12px 0 0',
          fontStyle: 'italic',
        }}
      >
        {insight}
      </p>

      {/* Footer */}
      <p
        style={{
          fontFamily: 'Lora, Georgia, serif',
          fontSize: '11px',
          fontStyle: 'italic',
          color: 'var(--pine-400)',
          margin: '12px 0 0',
        }}
      >
        Generated from your portal data · {formattedDate}
      </p>
    </div>
  );
}
