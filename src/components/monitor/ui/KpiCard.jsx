const colorMap = {
  blue:    { bar: 'var(--brand-primary)',        value: 'var(--brand-primary)'        },
  green:   { bar: 'var(--status-success-text)',  value: 'var(--status-success-text)'  },
  teal:    { bar: 'var(--brand-secondary)',      value: 'var(--brand-secondary)'      },
  purple:  { bar: 'var(--status-info-text)',     value: 'var(--status-info-text)'     },
  warn:    { bar: 'var(--brand-orange)',         value: 'var(--status-warning-text)'  },
  danger:  { bar: 'var(--status-danger-text)',   value: 'var(--status-danger-text)'   },
}

// onDetails é opcional — quando fornecido, o card ganha affordance "Ver
// detalhes" e vira acionável (clique + teclado), sem mudar em nada os
// cards que não passam essa prop. detailsLabel troca só o texto da
// affordance (ex.: "Detalhes →" nos cards com modal de detalhamento),
// mantendo o padrão "Ver detalhes →" para todos os demais.
export default function KpiCard({ label, value, sub, color = 'blue', icon, onDetails, detailsLabel = 'Ver detalhes →' }) {
  const c = colorMap[color] || colorMap.blue
  const acionavel = !!onDetails

  return (
    <div
      onClick={onDetails}
      role={acionavel ? 'button' : undefined}
      tabIndex={acionavel ? 0 : undefined}
      onKeyDown={acionavel ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDetails() } } : undefined}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        cursor: acionavel ? 'pointer' : undefined,
      }}
    >
      {/* Barra superior colorida */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '4px',
        background: c.bar,
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
      }} />

      {/* Label + ícone */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px',
        marginTop: '4px',
      }}>
        <p style={{
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-family)',
          lineHeight: '16px',
        }}>
          {label}
        </p>
        {icon && (
          <span style={{ opacity: 0.7, flexShrink: 0 }}>
            {icon}
          </span>
        )}
      </div>

      {/* Valor */}
      <p style={{
        fontSize: '28px',
        fontWeight: 700,
        lineHeight: '32px',
        letterSpacing: '-0.02em',
        color: c.value,
        fontFamily: 'var(--font-family)',
        marginBottom: '6px',
      }}>
        {value}
      </p>

      {/* Sub */}
      {sub && (
        <p style={{
          fontSize: '13px',
          lineHeight: '18px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-family)',
        }}>
          {sub}
        </p>
      )}

      {/* Affordance de drill-down — nunca só o card inteiro sem indicação */}
      {acionavel && (
        <p style={{
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--brand-primary)',
          fontFamily: 'var(--font-family)',
          marginTop: '10px',
        }}>
          {detailsLabel}
        </p>
      )}
    </div>
  )
}
