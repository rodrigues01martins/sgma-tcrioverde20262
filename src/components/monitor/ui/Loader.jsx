export default function Loader({ message = 'Carregando...', size = 20 }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '64px 32px',
        color: 'var(--text-muted)',
        fontSize: '14px',
        fontFamily: 'var(--font-family)',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          border: '2px solid var(--border-brand)',
          borderTopColor: 'var(--brand-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          flexShrink: 0,
        }}
      />
      {message}
    </div>
  )
}
