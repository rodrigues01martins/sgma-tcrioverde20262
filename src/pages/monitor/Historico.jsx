import { useState, useEffect } from 'react'
import { buscarPeriodos, excluirPeriodo } from '../../services/firestoreService'
import { formatarPeriodo } from '../../services/csvService'
import Button from '../../components/monitor/ui/Button'
import Badge from '../../components/monitor/ui/Badge'
import Loader from '../../components/monitor/ui/Loader'
import EmptyState from '../../components/monitor/ui/EmptyState'

const IconHistory = () => (
  <svg width="48" height="48" viewBox="0 -960 960 960" fill="var(--border-strong)">
    <path d="M120-560v-240h80v94q51-64 124.5-99T480-840q150 0 255 105t105 255h-80q0-117-81.5-198.5T480-760q-69 0-129 32t-101 88h110v80H120Zm2 120h82q12 93 76.5 157.5T435-204l48 84q-138 0-242-91.5T122-440Zm412 70-94-94v-216h80v184l56 56-42 70Z"/>
  </svg>
)

export default function Historico({ showToast }) {
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [excluindo, setExcluindo] = useState(null)
  const [confirmando, setConfirmando] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    buscarPeriodos().then(ps => { setPeriodos(ps); setLoading(false) })
  }

  async function handleExcluir(periodo) {
    setExcluindo(periodo)
    try {
      await excluirPeriodo(periodo)
      setConfirmando(null)
      await carregar()
    } catch (e) {
      if (showToast) showToast('Erro ao excluir: ' + e.message)
      else alert('Erro ao excluir: ' + e.message)
    } finally {
      setExcluindo(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, lineHeight: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
            Histórico de Importações
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-family)' }}>
            Gerencie os períodos salvos no banco de dados
          </p>
        </div>
        <Button variant="secondary" onClick={carregar}>
          Atualizar
        </Button>
      </div>

      {loading ? (
        <Loader message="Carregando histórico..." />
      ) : !periodos.length ? (
        <EmptyState
          icon={<IconHistory />}
          title="Nenhuma importação encontrada"
          description="Faça o upload do primeiro CSV para começar."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {periodos.map((p, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              flexWrap: 'wrap',
              gap: '12px',
              transition: `border-color var(--motion-normal)`,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-brand)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            >
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
                  {formatarPeriodo(p.periodo)}
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-family)' }}>
                  {p.total} colaboradores · importado em {new Date(p.importadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Badge variant="brand">{p.total} registros</Badge>

                {confirmando === p.periodo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)' }}>
                      Confirmar exclusão?
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      loading={excluindo === p.periodo}
                      onClick={() => handleExcluir(p.periodo)}
                    >
                      Sim, excluir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmando(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmando(p.periodo)}
                  >
                    Excluir
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
