// Indicador discreto do estado de autosave — reutilizável pela família
// Formulários. Anuncia só mudanças de estado relevantes via aria-live
// (não cada tecla), e nunca depende só de cor (ícone + texto sempre
// juntos).

function horaCurta(date) {
  if (!date) return null
  const pad = n => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const CONFIG = {
  dirty:  { icone: '●', cor: 'var(--text-muted)',          texto: 'Alterações não salvas' },
  saving: { icone: '◌', cor: 'var(--brand-primary)',       texto: 'Salvando…' },
  saved:  { icone: '✓', cor: 'var(--status-success-text)', texto: 'Salvo' },
  error:  { icone: '⚠', cor: 'var(--status-danger-text)',  texto: 'Não foi possível salvar' },
}

export default function AutosaveStatus({ status, lastSavedAt, onRetry }) {
  if (!status || status === 'idle') return null
  const cfg = CONFIG[status]
  if (!cfg) return null

  const texto = status === 'saved' && lastSavedAt
    ? `Salvo às ${horaCurta(lastSavedAt)}`
    : cfg.texto

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        fontWeight: 600,
        color: cfg.cor,
        fontFamily: 'var(--font-family)',
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true">{cfg.icone}</span>
      {texto}
      {status === 'error' && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--status-danger-text)',
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
          }}
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
