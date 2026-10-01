const IconInfo = () => (
  <svg width="18" height="18" viewBox="0 -960 960 960" fill="var(--brand-primary)">
    <path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />
  </svg>
)

// Nota fixa e sempre visível — não é tooltip escondido. Usada nas telas
// onde aparece um dos dois números de headcount (jovemAtivo x
// apuravelFinanceiro) para deixar explícito qual conceito está sendo
// mostrado e onde encontrar o complementar.
export default function NotaMetodologica({ titulo, children }) {
  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '14px 18px',
      background: 'var(--brand-subtle)',
      border: '1px solid var(--border-brand)',
      borderRadius: 'var(--radius-md)',
      marginBottom: '24px',
    }}>
      <span style={{ flexShrink: 0, marginTop: '1px' }}>
        <IconInfo />
      </span>
      <div>
        {titulo && (
          <p style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-family)',
            marginBottom: '4px',
          }}>
            {titulo}
          </p>
        )}
        <p style={{
          fontSize: '13px',
          lineHeight: '19px',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-family)',
        }}>
          {children}
        </p>
      </div>
    </div>
  )
}
