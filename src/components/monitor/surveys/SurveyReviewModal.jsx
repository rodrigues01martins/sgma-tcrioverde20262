import { useEffect, useRef } from 'react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'

// ============================================================
// MODAL DE REVISÃO DA IMPORTAÇÃO (seção 15/16/33 da manutenção de UX)
// ============================================================
// Reaproveita a MESMA moldura de modal já usada em IndicatorListModal.jsx
// (dialog/backdrop/foco/ESC) — nenhuma biblioteca nova, nenhum redesign.
// A revisão detalhada agora vive aqui (não mais inline no card), para o
// card do dropzone continuar compacto (seção 15: "não usar expansão
// gigante inline se houver componente de modal adequado").
function formatarDataHora(valor) {
  return valor || '—'
}

function PreviaCurada({ classificacao }) {
  const linhas = [
    ...classificacao.novos.map(r => ({ ...r, _situacao: 'Novo' })),
    ...classificacao.atualizados.map(r => ({ ...r, _situacao: 'Atualizado' })),
  ].slice(0, 15)

  if (linhas.length === 0) return null

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: '16px' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
        <h4 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>
          Prévia — {linhas.length} de {classificacao.novos.length + classificacao.atualizados.length} respostas novas/atualizadas
        </h4>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: '220px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              {['ID da resposta', 'Conclusão em', 'Município', 'Situação'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', whiteSpace: 'nowrap', position: 'sticky', top: 0, borderBottom: '1px solid var(--border-default)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map(r => (
              <tr key={r.sourceResponseId} style={{ borderBottom: '1px solid var(--border-default)' }}>
                <td style={{ padding: '8px 14px', color: 'var(--text-secondary)' }}>{r.sourceResponseId}</td>
                <td style={{ padding: '8px 14px', color: 'var(--text-secondary)' }}>{formatarDataHora(r.completedAt)}</td>
                <td style={{ padding: '8px 14px', color: 'var(--text-secondary)' }}>{r.municipalityName || (r.municipalityRaw ? `${r.municipalityRaw} (não reconhecido)` : '—')}</td>
                <td style={{ padding: '8px 14px' }}><Badge variant={r._situacao === 'Novo' ? 'success' : 'info'}>{r._situacao}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SurveyReviewModal({ aberto, onFechar, schema, arquivo, resultado, confirmando, onConfirmar }) {
  const previamenteFocado = useRef(null)
  const botaoFecharRef = useRef(null)

  useEffect(() => {
    if (!aberto) return
    previamenteFocado.current = document.activeElement
    botaoFecharRef.current?.focus()
    function aoTeclar(e) {
      if (e.key === 'Escape' && !confirmando) onFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      previamenteFocado.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  if (!aberto || !resultado) return null

  const podeConfirmar = (resultado.classificacao.novos.length + resultado.classificacao.atualizados.length) > 0 && !confirmando

  return (
    <div role="dialog" aria-modal="true" aria-label={`Revisar importação — ${schema.label}`}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div onClick={() => !confirmando && onFechar()} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'relative', zIndex: 1, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', width: '100%', maxWidth: '860px', maxHeight: '88vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '20px 24px', borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
              Revisar importação — {schema.label}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginTop: '2px' }}>
              {arquivo?.name}
            </p>
          </div>
          <button ref={botaoFecharRef} onClick={() => !confirmando && onFechar()} aria-label="Fechar revisão" disabled={confirmando}
            style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: '16px', cursor: confirmando ? 'not-allowed' : 'pointer', lineHeight: 1, opacity: confirmando ? 0.5 : 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '16px' }}>
            {[
              ['Versão do schema', schema.schemaVersion],
              ['Linhas encontradas', resultado.resumoValidacao.totalLinhas],
              ['Linhas válidas', resultado.resumoValidacao.validos],
              ['Novos', resultado.classificacao.novos.length],
              ['Atualizados', resultado.classificacao.atualizados.length],
              ['Inalterados', resultado.classificacao.inalterados.length],
              ['Avisos', resultado.resumoValidacao.avisos],
              ['Erros', resultado.resumoValidacao.invalidos],
            ].map(([label, valor]) => (
              <div key={label}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>{valor}</p>
              </div>
            ))}
          </div>

          {resultado.avisos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {resultado.avisos.slice(0, 8).map((aviso, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 14px', background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', borderRadius: 'var(--radius-sm)' }}>
                  <Badge variant="warning">⚠</Badge>
                  <p style={{ fontSize: '13px', color: 'var(--status-warning-text)', fontFamily: 'var(--font-family)' }}>{aviso.mensagem}</p>
                </div>
              ))}
              {resultado.avisos.length > 8 && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)' }}>+ {resultado.avisos.length - 8} aviso(s) adicional(is).</p>
              )}
            </div>
          )}

          {resultado.errosLinha?.length > 0 && (
            <div style={{ padding: '10px 14px', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)' }}>
                {resultado.errosLinha.length} linha(s) com erro foram ignoradas e não serão importadas.
              </p>
              <details style={{ marginTop: '8px' }}>
                <summary style={{ fontSize: '12px', color: 'var(--status-danger-text)', cursor: 'pointer' }}>Ver linhas com erro</summary>
                <ul style={{ marginTop: '8px', paddingLeft: '18px' }}>
                  {resultado.errosLinha.slice(0, 20).map((erro, i) => (
                    <li key={i} style={{ fontSize: '12px', color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)' }}>{erro.mensagem}</li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          <PreviaCurada classificacao={resultado.classificacao} />

          {!podeConfirmar && !confirmando && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginTop: '16px' }}>
              Nenhuma resposta nova ou atualizada para importar.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid var(--border-default)', flexShrink: 0 }}>
          <Button variant="secondary" onClick={onFechar} disabled={confirmando}>Cancelar</Button>
          <Button variant="primary" onClick={onConfirmar} loading={confirmando} disabled={!podeConfirmar}>
            Confirmar Importação
          </Button>
        </div>
      </div>
    </div>
  )
}
