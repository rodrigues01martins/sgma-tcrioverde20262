const IconEmpty = () => (
  <svg width="48" height="48" viewBox="0 -960 960 960" fill="var(--border-strong)">
    <path d="M240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/>
  </svg>
)

export default function EmptyState({
  icon,
  title = 'Nenhum dado encontrado',
  description = 'Faça upload de um CSV para começar.',
  action,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        textAlign: 'center',
        gap: '12px',
      }}
    >
      <div style={{ marginBottom: '4px', opacity: 0.5 }}>
        {icon || <IconEmpty />}
      </div>
      <h3 style={{
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-family)',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: '14px',
          color: 'var(--text-muted)',
          maxWidth: '320px',
          lineHeight: '20px',
        }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  )
}
