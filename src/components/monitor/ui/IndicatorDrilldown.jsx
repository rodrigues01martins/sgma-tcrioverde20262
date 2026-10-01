import { useEffect, useRef, useState } from 'react'
import Button from './Button'
import Loader from './Loader'
import EmptyState from './EmptyState'

// ── Peças pequenas reutilizáveis pelo conteúdo de cada drill-down ──

// Tipo A/B — pares label/valor (numerador, denominador, resultado...).
export function DrilldownComposicao({ itens }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '16px' }}>
      {itens.map(({ label, valor, destaque }) => (
        <div key={label}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
          <p style={{ fontSize: destaque ? '22px' : '16px', fontWeight: 700, color: destaque ? 'var(--brand-primary)' : 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>{valor}</p>
        </div>
      ))}
    </div>
  )
}

// Explicação textual da fórmula real — nunca inventada, sempre a mesma
// conta já usada no KPI principal.
export function DrilldownFormula({ texto }) {
  return (
    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '16px' }}>
      Fórmula: {texto}
    </p>
  )
}

// Tipo B — lista/tabela analítica, sem edição e sem coluna de ação
// individual. Grandes listas usam "Mostrar mais" incremental em vez de
// renderizar tudo de uma vez ou de introduzir paginação nova.
export function DrilldownLista({ colunas, linhas, limiteInicial = 50, passo = 50 }) {
  const [limite, setLimite] = useState(limiteInicial)
  const visiveis = linhas.slice(0, limite)

  return (
    <div>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'var(--font-family)' }}>
          <thead>
            <tr>
              {colunas.map(c => (
                <th key={c} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap' }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((linha, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}>
                {linha.map((valor, j) => (
                  <td key={j} style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{valor ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)' }}>
          Mostrando {visiveis.length} de {linhas.length}
        </p>
        {limite < linhas.length && (
          <Button variant="ghost" size="sm" onClick={() => setLimite(l => l + passo)}>Mostrar mais</Button>
        )}
      </div>
    </div>
  )
}

// Tipo C — critérios/perguntas (✓ atendido, ✕ não atendido). Semântica
// vem de quem chama — nunca inventa categoria "parcial" se a regra real
// só distinguir sim/não.
export function DrilldownCriterios({ itens }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {itens.map((item, i) => {
        const cor = item.status === 'sim' ? 'var(--status-success-text)' : item.status === 'parcial' ? 'var(--status-warning-text)' : 'var(--status-danger-text)'
        const icone = item.status === 'sim' ? '✓' : item.status === 'parcial' ? '⚠' : '✕'
        return (
          <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 16px', background: 'var(--bg-surface)' }}>
            <span aria-hidden="true" style={{ color: cor, fontWeight: 700, flexShrink: 0 }}>{icone}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>{item.label}</p>
              {item.detalhe && <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginTop: '2px' }}>{item.detalhe}</p>}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: cor, flexShrink: 0, fontFamily: 'var(--font-family)' }}>
              {item.status === 'sim' ? 'Sim' : item.status === 'parcial' ? 'Parcial' : 'Não'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Modal de drill-down reutilizável pela família Painéis — do resultado
// para a composição e, quando fizer sentido, para os registros de
// origem. Não conhece fórmula nenhuma: só monta a moldura (título,
// contexto/competência, fechar por ESC/backdrop, foco, loading/erro/
// vazio); o conteúdo (composição, lista ou critérios) é passado como
// children por quem abre o drill-down, que decide o que exibir e com
// que dado — nunca recalcula nada aqui dentro.
export default function IndicatorDrilldown({
  aberto,
  titulo,
  contexto,
  onFechar,
  loading = false,
  erro = null,
  onTentarNovamente,
  vazio = false,
  vazioTitulo = 'Nenhuma ocorrência encontrada',
  vazioDescricao,
  children,
}) {
  const previamenteFocado = useRef(null)
  const botaoFecharRef = useRef(null)

  useEffect(() => {
    if (!aberto) return
    previamenteFocado.current = document.activeElement
    botaoFecharRef.current?.focus()
    function handleEscape(e) {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      previamenteFocado.current?.focus?.()
    }
  }, [aberto, onFechar])

  if (!aberto) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div
        onClick={onFechar}
        style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(2px)' }}
      />
      <div style={{
        position: 'relative',
        zIndex: 1,
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
        width: '100%',
        maxWidth: '760px',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', padding: '20px 24px', borderBottom: '1px solid var(--border-default)' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
              {titulo}
            </h3>
            {contexto && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginTop: '2px' }}>
                {contexto}
              </p>
            )}
          </div>
          <button
            ref={botaoFecharRef}
            onClick={onFechar}
            aria-label="Fechar detalhamento"
            style={{
              flexShrink: 0,
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Corpo — rolável */}
        <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
          {loading ? (
            <Loader message="Carregando detalhes..." />
          ) : erro ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)' }}>
                Não foi possível carregar o detalhamento.
              </p>
              {onTentarNovamente && (
                <Button variant="secondary" size="sm" onClick={onTentarNovamente}>Tentar novamente</Button>
              )}
            </div>
          ) : vazio ? (
            <EmptyState title={vazioTitulo} description={vazioDescricao} />
          ) : children}
        </div>
      </div>
    </div>
  )
}
