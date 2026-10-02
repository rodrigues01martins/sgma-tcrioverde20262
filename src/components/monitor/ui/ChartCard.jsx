import Badge from './Badge'

const badgeVariantMap = {
  accent:  'brand',
  green:   'success',
  teal:    'brand',
  purple:  'info',
  warn:    'warning',
  danger:  'danger',
  success: 'success',
  info:    'info',
  warning: 'warning',
}

export default function ChartCard({ title, badge, badgeColor = 'brand', children }) {
  const badgeVariant = badgeVariantMap[badgeColor] || 'neutral'

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-subtle)',
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          lineHeight: '20px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-family)',
        }}>
          {title}
        </h3>
        {badge && (
          <Badge variant={badgeVariant}>{badge}</Badge>
        )}
      </div>
      <div style={{ padding: '16px' }}>
        {children}
      </div>
    </div>
  )
}
