import { useState, useEffect, useMemo } from 'react'
import KpiCard from '../../components/monitor/ui/KpiCard'
import Badge from '../../components/monitor/ui/Badge'
import Loader from '../../components/monitor/ui/Loader'
import EmptyState from '../../components/monitor/ui/EmptyState'
import { Select } from '../../components/monitor/ui/Input'
import { EspelhoVisita, formatarDataBR } from '../../components/monitor/ui/VisitaInLocoShared'
import {
  BLOCOS_PRATICA,
  PONTUACAO_MAXIMA_PRATICA,
  OPCOES_PONTUACAO,
  classificarLocal,
  classificarRedeISLA,
  buscarTodasVisitasPratica,
} from '../../services/inLocoPraticaService'

const SvgIcon = ({ path, size = 28 }) => (
  <svg width={size} height={size} viewBox="0 -960 960 960" fill="var(--brand-primary)">
    <path d={path} />
  </svg>
)

const ICONS = {
  local:  'M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 294q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Z',
  check:  'M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z',
  shield: 'M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Z',
}

// ============================================================
// PAINEL — VISITA IN LOCO – PRÁTICA
// ============================================================
// Mesma família visual/estrutural do Painel Teórico (VisitaInLocoDashboard.jsx),
// consumindo exclusivamente visitas_inloco_pratica — nunca mistura com a
// coleção da Teórica. Metodologia idêntica (ICL genérico = pontos ÷
// máximo × 100); nenhum peso, meta ou threshold novo foi criado.
export default function VisitaInLocoPraticaDashboard() {
  const [visitas, setVisitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [semestreSel, setSemestreSel] = useState('')
  const [municipioSel, setMunicipioSel] = useState('')
  const [visitaAberta, setVisitaAberta] = useState(null)

  useEffect(() => {
    buscarTodasVisitasPratica().then(todas => {
      setVisitas(todas)
      const semestres = [...new Set(todas.map(v => v.semestre_referencia))].sort().reverse()
      if (semestres.length) setSemestreSel(semestres[0])
      setLoading(false)
    })
  }, [])

  const semestresDisponiveis = useMemo(
    () => [...new Set(visitas.map(v => v.semestre_referencia))].sort().reverse(),
    [visitas]
  )

  const visitasDoSemestre = useMemo(
    () => visitas.filter(v => v.status === 'enviada' && v.semestre_referencia === semestreSel),
    [visitas, semestreSel]
  )

  const municipiosDisponiveis = useMemo(
    () => [...new Set(visitasDoSemestre.map(v => v.municipio))].sort(),
    [visitasDoSemestre]
  )

  const visitasFiltradas = useMemo(
    () => municipioSel ? visitasDoSemestre.filter(v => v.municipio === municipioSel) : visitasDoSemestre,
    [visitasDoSemestre, municipioSel]
  )

  if (loading) return <Loader message="Carregando visitas..." />

  if (visitaAberta) {
    return (
      <EspelhoVisita
        visita={visitaAberta}
        onVoltar={() => setVisitaAberta(null)}
        blocos={BLOCOS_PRATICA}
        pontuacaoMaxima={PONTUACAO_MAXIMA_PRATICA}
        opcoesPontuacao={OPCOES_PONTUACAO}
        titulo="Espelho da Visita In Loco – Prática"
        camposGerais={[
          ['Município', visitaAberta.municipio],
          ['Nome do estabelecimento', visitaAberta.nome_local],
          ['Data da visita', formatarDataBR(visitaAberta.data_visita)],
          ['Hora da visita', visitaAberta.hora_visita],
          ['Responsável pela visita', visitaAberta.responsavel_visita],
          ['Representante do local', visitaAberta.representante_local],
        ]}
      />
    )
  }

  if (!visitas.length) {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
            Painel Visita In Loco – Prática
          </h2>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-brand)', borderRadius: 'var(--radius-md)' }}>
          <EmptyState title="Ainda não há visitas práticas registradas" description="As visitas aparecem aqui assim que forem enviadas pelo Formulário de Visita In Loco – Prática." />
        </div>
      </div>
    )
  }

  const Ns = visitasFiltradas.length
  const somaPontos = visitasFiltradas.reduce((s, v) => s + (v.pontuacaoTotal || 0), 0)
  const isla = Ns > 0 ? (somaPontos / (PONTUACAO_MAXIMA_PRATICA * Ns)) * 100 : 0
  const nAptos = visitasFiltradas.filter(v => (v.icl || 0) >= 70).length
  const tla = Ns > 0 ? (nAptos / Ns) * 100 : 0
  const redeStatus = classificarRedeISLA(isla)

  const mediaPorBloco = BLOCOS_PRATICA.map(bloco => {
    const campo = `pontuacaoBloco${bloco.id.split('_').pop()}`
    const media = Ns > 0 ? visitasFiltradas.reduce((s, v) => s + (v[campo] || 0), 0) / Ns : 0
    return { bloco, media, pct: bloco.maxPontos > 0 ? (media / bloco.maxPontos) * 100 : 0 }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, lineHeight: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
            Painel Visita In Loco – Prática
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-family)' }}>
            Resultados, desempenho e indicadores semestrais dos estabelecimentos de prática
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Select value={semestreSel} onChange={e => { setSemestreSel(e.target.value); setMunicipioSel('') }} style={{ width: '160px' }}>
            {semestresDisponiveis.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={municipioSel} onChange={e => setMunicipioSel(e.target.value)} style={{ width: '220px' }}>
            <option value="">Todos os municípios</option>
            {municipiosDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
        </div>
      </div>

      {Ns === 0 ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-brand)', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
          <EmptyState title="Nenhuma visita enviada neste semestre" description="Só entram nos indicadores visitas com status 'Enviada' — rascunhos não contam." />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <KpiCard icon={<SvgIcon path={ICONS.local} />} label="Estabelecimentos Visitados" value={Ns} sub={`no semestre ${semestreSel}`} color="blue" />
            <KpiCard icon={<SvgIcon path={ICONS.shield} />} label="ISLA Semestral" value={`${isla.toFixed(1)}%`} sub={redeStatus.label} color={redeStatus.variant === 'danger' ? 'danger' : redeStatus.variant === 'warning' ? 'warn' : redeStatus.variant === 'info' ? 'teal' : 'green'} />
            <KpiCard icon={<SvgIcon path={ICONS.check} />} label="Taxa de Locais Aptos" value={`${tla.toFixed(1)}%`} sub={`${nAptos} de ${Ns} com ICL ≥ 70%`} color="teal" />
          </div>

          {/* Média por bloco temático */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '24px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-family)', marginBottom: '16px' }}>
              Média por Bloco Temático
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {mediaPorBloco.map(({ bloco, media, pct }) => (
                <div key={bloco.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', fontWeight: 500 }}>{bloco.titulo}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-primary)', fontFamily: 'var(--font-family)' }}>{media.toFixed(1)} / {bloco.maxPontos} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--border-default)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: 'var(--brand-primary)', borderRadius: 'var(--radius-full)', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela detalhada */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
                Desempenho por Estabelecimento
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'var(--font-family)' }}>
                <thead>
                  <tr>
                    {['Município', 'Nome do Estabelecimento', 'Data', 'Pontos', 'ICL', 'Classificação', 'Ações'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...visitasFiltradas].sort((a, b) => (b.icl || 0) - (a.icl || 0)).map(v => {
                    const classif = v.classificacao || classificarLocal(v.icl || 0)
                    return (
                      <tr key={v.id} style={{ borderBottom: '1px solid var(--border-default)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{v.municipio}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{v.nome_local}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{formatarDataBR(v.data_visita)}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{v.pontuacaoTotal} / {PONTUACAO_MAXIMA_PRATICA}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 700 }}>{v.icl?.toFixed(1)}%</td>
                        <td style={{ padding: '12px 16px' }}><Badge variant={classif.variant}>{classif.label}</Badge></td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => setVisitaAberta(v)}
                            style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            Visualizar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
