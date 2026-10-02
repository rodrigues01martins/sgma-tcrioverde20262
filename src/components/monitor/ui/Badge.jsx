const variants = {
  neutral: { bg: 'var(--bg-subtle)',            text: 'var(--text-secondary)',       border: 'var(--border-default)'        },
  brand:   { bg: 'var(--brand-subtle)',          text: 'var(--brand-primary)',        border: 'var(--border-brand)'          },
  success: { bg: 'var(--status-success-bg)',     text: 'var(--status-success-text)',  border: 'var(--status-success-border)' },
  warning: { bg: 'var(--status-warning-bg)',     text: 'var(--status-warning-text)',  border: 'var(--status-warning-border)' },
  danger:  { bg: 'var(--status-danger-bg)',      text: 'var(--status-danger-text)',   border: 'var(--status-danger-border)'  },
  info:    { bg: 'var(--status-info-bg)',        text: 'var(--status-info-text)',     border: 'var(--status-info-border)'    },
}

export default function Badge({ children, variant = 'neutral', style: extra = {} }) {
  const v = variants[variant] || variants.neutral
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: '24px',
        padding: '0 12px',
        borderRadius: 'var(--radius-full)',
        border: `1px solid ${v.border}`,
        background: v.bg,
        color: v.text,
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: 'var(--font-family)',
        lineHeight: '16px',
        whiteSpace: 'nowrap',
        ...extra,
      }}
    >
      {children}
    </span>
  )
}
