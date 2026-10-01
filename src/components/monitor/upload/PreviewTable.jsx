export default function PreviewTable({ dados }) {
  if (!dados.length) return null
  // `_classificacao` (e qualquer outro campo interno prefixado com `_`) é
  // metadado derivado pela Etapa 3, não uma coluna do CSV — nunca deve
  // aparecer aqui, e é um objeto, não um valor renderizável em célula.
  const cols = Object.keys(dados[0]).filter(c => !c.startsWith('_'))
  const amostra = dados.slice(0, 8)

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-subtle)',
      }}>
        <h3 style={{
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-family)',
        }}>
          Prévia dos dados
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '24px',
            padding: '0 12px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--brand-subtle)',
            border: '1px solid var(--border-brand)',
            color: 'var(--brand-primary)',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            {dados.length} linhas
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '24px',
            padding: '0 12px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--status-success-bg)',
            border: '1px solid var(--status-success-border)',
            color: 'var(--status-success-text)',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            {cols.length} colunas
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ overflowX: 'auto', maxHeight: '260px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c} style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-subtle)',
                  whiteSpace: 'nowrap',
                  position: 'sticky',
                  top: 0,
                  borderBottom: '1px solid var(--border-default)',
                }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {amostra.map((row, i) => (
              <tr
                key={i}
                style={{ borderBottom: '1px solid var(--border-default)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {cols.map(c => (
                  <td key={c} style={{
                    padding: '10px 16px',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    minHeight: '40px',
                    lineHeight: '20px',
                  }}>
                    {row[c] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
