import { useState, useEffect } from 'react'
import { buscarPeriodos, buscarDadosPeriodo } from '../../services/firestoreService'
import { enriquecerDados, formatarPeriodo } from '../../services/csvService'
import { MUNICIPIOS_GOIAS, TOTAL_MUNICIPIOS_GOIAS, normalizeMunicipioName } from '../../data/municipiosGoias'
import KpiCard from '../../components/monitor/ui/KpiCard'
import ChartCard from '../../components/monitor/ui/ChartCard'
import Loader from '../../components/monitor/ui/Loader'
import EmptyState from '../../components/monitor/ui/EmptyState'
import MapaMunicipios from '../../components/monitor/ui/MapaMunicipios'
import { Select } from '../../components/monitor/ui/Input'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import IndicatorDrilldown, { DrilldownComposicao, DrilldownFormula, DrilldownLista } from '../../components/monitor/ui/IndicatorDrilldown'

const tooltipStyle = {
  contentStyle: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: '8px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-family)',
  }
}

const SvgIcon = ({ path, size = 28 }) => (
  <svg width={size} height={size} viewBox="0 -960 960 960" fill="var(--brand-primary)">
    <path d={path} />
  </svg>
)

const ICONS = {
  map:   'M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 294q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Z',
  check: 'M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z',
}

export default function Alcance() {
  const [periodos, setPeriodos] = useState([])
  const [periodoSel, setPeriodoSel] = useState('')
  const [dadosEnriquecidos, setDadosEnriquecidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [drillAberto, setDrillAberto] = useState(false)

  useEffect(() => {
    buscarPeriodos().then(ps => { setPeriodos(ps); if (ps.length) setPeriodoSel(ps[0].periodo) })
  }, [])

  useEffect(() => {
    if (!periodoSel) return
    setLoading(true)
    buscarDadosPeriodo(periodoSel).then(dados => {
      setDadosEnriquecidos(enriquecerDados(dados))
      setLoading(false)
    })
  }, [periodoSel])

  if (loading) return <Loader message="Carregando dados territoriais..." />
  if (!dadosEnriquecidos.length) return <EmptyState title="Nenhum dado encontrado" description="Faça upload de um CSV na aba Upload primeiro." />

  // Match tolerante a acento/caixa contra a base canônica (246 municípios)
  // — antes comparava string bruta em uppercase, então "GOIANIA" (sem
  // acento, comum em export de planilha) nunca batia com a grafia
  // oficial e podia contar como um "município" a mais, inexistente.
  const cidadesNormalizadasNoCSV = new Set(
    dadosEnriquecidos.map(r => normalizeMunicipioName(r.cidade)).filter(Boolean)
  )
  const municipiosAtendidos = MUNICIPIOS_GOIAS.filter(m => cidadesNormalizadasNoCSV.has(normalizeMunicipioName(m.nome)))
  const municipiosNaoAtendidos = MUNICIPIOS_GOIAS.filter(m => !cidadesNormalizadasNoCSV.has(normalizeMunicipioName(m.nome)))
  const num_municipios = municipiosAtendidos.length
  const ind_territorial = (num_municipios / TOTAL_MUNICIPIOS_GOIAS) * 100

  const cidadeMap = {}
  dadosEnriquecidos.forEach(r => {
    const c = (r.cidade || '').toUpperCase().trim()
    if (c) cidadeMap[c] = (cidadeMap[c] || 0) + 1
  })
  const top10 = Object.entries(cidadeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const munOrdenado = Object.entries(cidadeMap).sort((a, b) => b[1] - a[1])
  const top10Maior  = munOrdenado.slice(0, 10).map(([name, total]) => ({ name, total }))
  const top10Menor  = [...munOrdenado].sort((a, b) => a[1] - b[1]).slice(0, 10).map(([name, total]) => ({ name, total }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, lineHeight: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
            Eixo 2 — Alcance
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-family)' }}>
            Matriz de Indicadores · {formatarPeriodo(periodoSel)}
          </p>
        </div>
        <Select value={periodoSel} onChange={e => setPeriodoSel(e.target.value)} style={{ width: '220px' }}>
          {periodos.map(p => (
            <option key={p.periodo} value={p.periodo}>{formatarPeriodo(p.periodo)} ({p.total})</option>
          ))}
        </Select>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KpiCard icon={<SvgIcon path={ICONS.map} />} label="Municípios Atendidos" value={num_municipios} sub={`de ${TOTAL_MUNICIPIOS_GOIAS} municípios de Goiás`} color="blue" onDetails={() => setDrillAberto(true)} />
        <KpiCard icon={<SvgIcon path={ICONS.check} />} label="Cobertura Territorial" value={`${ind_territorial.toFixed(1)}%`} sub="meta: máxima cobertura dos 246 municípios" color={ind_territorial >= 50 ? 'green' : 'warn'} onDetails={() => setDrillAberto(true)} />
      </div>

      {/* Barra de cobertura */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>
            Dimensão Territorial do Programa
          </p>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-primary)', fontFamily: 'var(--font-family)' }}>
            {num_municipios} / {TOTAL_MUNICIPIOS_GOIAS} municípios
          </p>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'var(--border-default)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(ind_territorial, 100)}%`, background: 'var(--brand-primary)', borderRadius: 'var(--radius-full)', transition: 'width 0.6s ease' }} />
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'var(--font-family)' }}>
          Fórmula: (nº municípios com aprendiz ÷ 246) × 100 = {ind_territorial.toFixed(1)}%
        </p>
      </div>

      {/* Mapa */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
            Distribuição Territorial dos Aprendizes — Goiás
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)' }}>
            Círculo proporcional ao número de aprendizes · clique para detalhes
          </span>
        </div>
        <MapaMunicipios
          contagensPorCidade={cidadeMap}
          rotulo="aprendizes"
          totalBase={dadosEnriquecidos.length}
          key={periodoSel}
        />
      </div>

      {/* Gráficos Top 10 / Bottom 10 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <ChartCard title="10 Municípios com Mais Aprendizes" badge="Top 10" badgeColor="green">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10Maior} layout="vertical">
              <XAxis type="number" stroke="var(--chart-axis)" tick={{ fontSize: 11, fontFamily: 'var(--font-family)' }} />
              <YAxis type="category" dataKey="name" stroke="var(--chart-axis)" tick={{ fontSize: 10, fontFamily: 'var(--font-family)' }} width={120} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="total" name="Aprendizes" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="10 Municípios com Menos Aprendizes" badge="Bottom 10" badgeColor="warn">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10Menor} layout="vertical">
              <XAxis type="number" stroke="var(--chart-axis)" tick={{ fontSize: 11, fontFamily: 'var(--font-family)' }} />
              <YAxis type="category" dataKey="name" stroke="var(--chart-axis)" tick={{ fontSize: 10, fontFamily: 'var(--font-family)' }} width={120} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="total" name="Aprendizes" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top 10 lista */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
            Top 10 — Municípios com Mais Aprendizes
          </h3>
        </div>
        <div style={{ padding: '8px 0' }}>
          {top10.map(([cidade, count], i) => {
            const max = top10[0][1]
            const pct = (count / max) * 100
            return (
              <div key={cidade}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', transition: 'background var(--motion-normal)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', width: '20px', textAlign: 'right', fontFamily: 'var(--font-family)' }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>{cidade}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-primary)', fontFamily: 'var(--font-family)' }}>{count}</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--border-default)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brand-primary)', borderRadius: 'var(--radius-full)' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <IndicatorDrilldown
        aberto={drillAberto}
        onFechar={() => setDrillAberto(false)}
        titulo="Cobertura Territorial"
        contexto={formatarPeriodo(periodoSel)}
      >
        <DrilldownComposicao itens={[
          { label: 'Municípios atendidos', valor: num_municipios },
          { label: 'Total de referência (Goiás)', valor: TOTAL_MUNICIPIOS_GOIAS },
          { label: 'Resultado', valor: `${ind_territorial.toFixed(1)}%`, destaque: true },
        ]} />
        <DrilldownFormula texto={`${num_municipios} municípios com aprendiz ÷ ${TOTAL_MUNICIPIOS_GOIAS} × 100 = ${ind_territorial.toFixed(1)}%`} />
        <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-family)' }}>
          Municípios não atendidos ({municipiosNaoAtendidos.length})
        </p>
        <DrilldownLista colunas={['Município']} linhas={municipiosNaoAtendidos.map(m => [m.nome])} />
      </IndicatorDrilldown>
    </div>
  )
}
