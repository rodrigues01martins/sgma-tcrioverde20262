import { useEffect, useRef, useState } from 'react'
import Button from './Button'
import EmptyState from './EmptyState'
import { DrilldownLista } from './IndicatorDrilldown'
import { exportarParaExcel } from '../../../services/exportExcelService'

// ============================================================
// MODAL DE DETALHAMENTO — comportamento intencionalmente diferente do
// IndicatorDrilldown (painel expansível dentro da página): este abre em
// pop-up central, com lista nominal + exportação Excel. Usado quando o
// indicador precisa desse detalhamento tabular/exportável específico
// (hoje: "Acima de 18 anos — PCD ou Estabilidade" e "Vale Transporte no
// mês"), sem afetar os demais indicadores do painel.
//
// `registros` é sempre o MESMO array já usado para calcular o número do
// Card (nunca um filtro paralelo) — colunas descrevem como cada campo
// aparece na tela (`cell`) e no Excel (`excel`), a partir dos mesmos
// dados, nunca de um valor recalculado.
export default function IndicatorListModal({ aberto, onFechar, titulo, subtitulo, registros, colunas, nomeArquivo, nomeAba }) {
  const previamenteFocado = useRef(null)
  const botaoFecharRef = useRef(null)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    previamenteFocado.current = document.activeElement
    botaoFecharRef.current?.focus()
    function aoTeclar(e) {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      previamenteFocado.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  if (!aberto) return null

  const linhasTabela = registros.map(r => colunas.map(c => c.cell(r)))

  async function handleExportar() {
    setExportando(true)
    try {
      await exportarParaExcel({ registros, colunas, nomeArquivo, nomeAba })
    } finally {
      setExportando(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={onFechar}
        style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)' }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px',
          padding: '20px 24px', borderBottom: '1px solid var(--border-default)', flexShrink: 0,
        }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
              {titulo}
            </h3>
            {subtitulo && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginTop: '2px' }}>
                {subtitulo}
              </p>
            )}
          </div>
          <button
            ref={botaoFecharRef}
            onClick={onFechar}
            aria-label="Fechar"
            style={{
              flexShrink: 0, width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-default)', background: 'var(--bg-surface)',
              color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Corpo — rolável */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-family)', marginBottom: '16px' }}>
            Total: <strong style={{ color: 'var(--text-primary)' }}>{registros.length}</strong> {registros.length === 1 ? 'registro' : 'registros'}
          </p>

          {registros.length === 0 ? (
            <EmptyState
              title="Nenhum registro encontrado"
              description="Nenhum aprendiz encontrado para a competência e filtros selecionados."
            />
          ) : (
            <DrilldownLista colunas={colunas.map(c => c.header)} linhas={linhasTabela} />
          )}
        </div>

        {/* Rodapé — ações */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '12px',
          padding: '16px 24px', borderTop: '1px solid var(--border-default)', flexShrink: 0,
        }}>
          <Button variant="secondary" onClick={onFechar}>Fechar</Button>
          <Button variant="primary" onClick={handleExportar} loading={exportando} disabled={registros.length === 0 || exportando}>
            Exportar Excel
          </Button>
        </div>
      </div>
    </div>
  )
}
