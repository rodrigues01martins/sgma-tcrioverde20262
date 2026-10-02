const variants = {
  primary:     { bg: 'var(--brand-primary)',      text: '#FFFFFF',                  border: 'transparent'              },
  secondary:   { bg: 'var(--bg-surface)',          text: 'var(--brand-primary)',     border: 'var(--border-brand)'      },
  ghost:       { bg: 'transparent',               text: 'var(--text-secondary)',    border: 'transparent'              },
  destructive: { bg: 'var(--status-danger-text)',  text: '#FFFFFF',                  border: 'transparent'              },
}

const sizes = {
  sm: { height: '32px', padding: '0 12px', fontSize: '13px', iconSize: 16, gap: '6px' },
  md: { height: '40px', padding: '0 16px', fontSize: '14px', iconSize: 18, gap: '8px' },
  lg: { height: '48px', padding: '0 20px', fontSize: '15px', iconSize: 20, gap: '8px' },
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  iconLeft,
  iconRight,
  onClick,
  type = 'button',
  style: extraStyle = {},
  ...props
}) {
  const v = variants[variant] || variants.primary
  const s = sizes[size] || sizes.md

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        fontFamily: 'var(--font-family)',
        lineHeight: 1,
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${v.border}`,
        background: disabled || loading ? 'var(--border-default)' : v.bg,
        color: disabled || loading ? 'var(--text-muted)' : v.text,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: `background var(--motion-normal), box-shadow var(--motion-normal), transform var(--motion-fast)`,
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...extraStyle,
      }}
      onMouseEnter={e => {
        if (disabled || loading) return
        if (variant === 'primary')     e.currentTarget.style.background = '#005f59'
        if (variant === 'secondary')   e.currentTarget.style.background = 'var(--bg-subtle)'
        if (variant === 'ghost')       e.currentTarget.style.background = 'var(--bg-subtle)'
        if (variant === 'destructive') e.currentTarget.style.background = '#b91c1c'
      }}
      onMouseLeave={e => {
        if (disabled || loading) return
        e.currentTarget.style.background = v.bg
      }}
    >
      {loading ? (
        <span style={{
          width: s.iconSize,
          height: s.iconSize,
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: '#FFFFFF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          display: 'inline-block',
          flexShrink: 0,
        }} />
      ) : iconLeft ? (
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{iconLeft}</span>
      ) : null}

      {children}

      {!loading && iconRight && (
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{iconRight}</span>
      )}
    </button>
  )
}
